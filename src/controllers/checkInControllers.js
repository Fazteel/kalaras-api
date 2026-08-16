const generateShortId = () => {
  return "chk_" + Math.floor(10000 + Math.random() * 90000).toString();
};

const getMoodConfig = (mood) => {
  switch (mood) {
    case "aman":
      return {
        color_code: "green",
        feedback_message: "Kondisi Anda aman hari ini.",
        score: 100,
      };
    case "lelah":
      return {
        color_code: "yellow",
        feedback_message: "Anda merasa lelah. Istirahatlah sejenak.",
        score: 50,
      };
    case "dukungan":
      return {
        color_code: "red",
        feedback_message: "Butuh dukungan tambahan? Kami di sini untuk membantu.",
        score: 20,
      };
    default:
      return {
        color_code: "green",
        feedback_message: "Kondisi Anda aman hari ini.",
        score: 100,
      };
  }
};

const submitMoodCheckIn = async (request, reply) => {
  const { mood, check_in_date } = request.body;

  if (!["aman", "lelah", "dukungan"].includes(mood)) {
    return reply.code(400).send({
      status: "error",
      message: "Mood harus salah satu dari: aman, lelah, dukungan",
    });
  }

  try {
    const { prisma } = request.server;
    const moodConfig = getMoodConfig(mood);
    const shortId = generateShortId();

    let sentAt = new Date();
    if (check_in_date) {
      const parsedDate = new Date(check_in_date);
      if (!isNaN(parsedDate.getTime())) {
        sentAt = parsedDate;
      }
    }

    const log = await prisma.checkInLog.create({
      data: {
        id: shortId,
        user_id: request.user.id,
        mood,
        status: "completed",
        sent_at: sentAt,
        responded_at: new Date(),
      },
    });

    return reply.code(201).send({
      status: "success",
      message: "Mood check-in recorded successfully",
      data: {
        id: log.id,
        mood: log.mood,
        color_code: moodConfig.color_code,
        feedback_message: moodConfig.feedback_message,
        created_at: log.sent_at.toISOString(),
      },
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      status: "error",
      message: "Terjadi kesalahan internal saat menyimpan mood check-in.",
    });
  }
};

const submitFullCheckIn = async (request, reply) => {
  const { mood, notes, stress_level } = request.body;

  if (mood && !["aman", "lelah", "dukungan"].includes(mood)) {
    return reply.code(400).send({
      status: "error",
      message: "Mood harus salah satu dari: aman, lelah, dukungan",
    });
  }

  try {
    const { prisma } = request.server;
    const shortId = generateShortId();

    const log = await prisma.checkInLog.create({
      data: {
        id: shortId,
        user_id: request.user.id,
        mood: mood || null,
        notes: notes || null,
        stress_level: stress_level !== undefined ? parseInt(stress_level) : null,
        status: "completed",
        sent_at: new Date(),
        responded_at: new Date(),
      },
    });

    return reply.code(201).send({
      status: "success",
      message: "Full check-in recorded successfully",
      data: {
        id: log.id,
        mood: log.mood,
        notes: log.notes,
        stress_level: log.stress_level,
        created_at: log.sent_at.toISOString(),
      },
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      status: "error",
      message: "Terjadi kesalahan internal saat menyimpan check-in.",
    });
  }
};

const getCheckInHistory = async (request, reply) => {
  const page = parseInt(request.query.page) || 1;
  const limit = parseInt(request.query.limit) || 10;
  const { start_date } = request.query;
  const skip = (page - 1) * limit;

  try {
    const { prisma } = request.server;

    const whereClause = {
      user_id: request.user.id,
    };

    if (start_date) {
      const parsedStartDate = new Date(start_date);
      if (!isNaN(parsedStartDate.getTime())) {
        whereClause.sent_at = {
          gte: parsedStartDate,
        };
      }
    }

    const logs = await prisma.checkInLog.findMany({
      where: whereClause,
      orderBy: { sent_at: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.checkInLog.count({
      where: whereClause,
    });

    const allUserLogs = await prisma.checkInLog.findMany({
      where: { user_id: request.user.id },
      select: { mood: true, stress_level: true },
    });

    let stabilityScore = 85;
    let dominantMood = "aman";
    let stabilityLabel = "Sangat Stabil";

    if (allUserLogs.length > 0) {
      let totalMoodScore = 0;
      let moodCount = 0;
      const moodCounts = {};

      for (const log of allUserLogs) {
        if (log.mood) {
          const config = getMoodConfig(log.mood);
          totalMoodScore += config.score;
          moodCount++;
          moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
        }
      }

      const avgMoodScore = moodCount > 0 ? totalMoodScore / moodCount : 85;

      let totalStressScore = 0;
      let stressCount = 0;
      for (const log of allUserLogs) {
        if (log.stress_level !== null && log.stress_level !== undefined) {
          const stressScore = Math.max(0, 100 - (log.stress_level - 1) * 20);
          totalStressScore += stressScore;
          stressCount++;
        }
      }

      const avgStressScore = stressCount > 0 ? totalStressScore / stressCount : avgMoodScore;

      stabilityScore = Math.round((avgMoodScore + avgStressScore) / 2);

      if (stabilityScore >= 80) {
        stabilityLabel = "Sangat Stabil";
      } else if (stabilityScore >= 50) {
        stabilityLabel = "Cukup Stabil";
      } else {
        stabilityLabel = "Perlu Dukungan";
      }

      let maxCount = 0;
      for (const [m, count] of Object.entries(moodCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantMood = m;
        }
      }
    }

    const mappedData = logs.map((log) => {
      const dateStr = log.sent_at.toISOString().split("T")[0];
      return {
        id: log.id,
        date: dateStr,
        mood: log.mood || "",
        notes: log.notes || "",
        created_at: log.sent_at.toISOString(),
      };
    });

    return reply.send({
      status: "success",
      summary: {
        stability_score: stabilityScore,
        stability_label: stabilityLabel,
        dominant_mood: dominantMood,
      },
      data: mappedData,
      pagination: {
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      status: "error",
      message: "Terjadi kesalahan internal saat mengambil riwayat check-in.",
    });
  }
};

module.exports = {
  submitMoodCheckIn,
  submitFullCheckIn,
  getCheckInHistory,
};
