const { getCachedResponse } = require("./chatbotController");

const hitExternalLLMApi = async (message) => {
  return "Sorry, Kalaras AI can't respond to questions outside of the greeting context at this time.";
};

const sendChatMessage = async (request, reply) => {
  const { message } = request.body;

  if (!message || message.trim() === "") {
    return reply
      .code(400)
      .send({ error: "Pesan yang dikirimkan tidak boleh kosong." });
  }

  try {
    const { prisma, redis } = request.server;

    const matchedTemplate = await getCachedResponse(prisma, redis, message);
    let aiResponse;

    if (matchedTemplate) {
      aiResponse = matchedTemplate.response_template;
      let fullName = request.user.full_name;
      if (!fullName) {
        const profile = await prisma.pocketProfile.findUnique({
          where: { user_id: request.user.id },
        });
        fullName = profile ? profile.full_name : "User";
      }

      const latestCheckIn = await prisma.checkInLog.findFirst({
        where: { user_id: request.user.id },
        orderBy: { sent_at: "desc" },
      });
      const moodUser = (latestCheckIn && latestCheckIn.mood) ? latestCheckIn.mood : "good";

      aiResponse = aiResponse
        .replace(/{full_name}/g, fullName)
        .replace(/{mood}/g, moodUser);
    } else {
      aiResponse = await hitExternalLLMApi(message);
    }

    await prisma.kalarasHistory.create({
      data: {
        user_id: request.user.id,
        user_message: message,
        ai_reply: aiResponse,
      },
    });

    return reply.send({ reply: aiResponse });
  } catch (err) {
    request.server.log.error(err);
    return reply
      .code(500)
      .send({ error: "Gagal memproses data obrolan dengan asisten Kalaras." });
  }
};

const getKalarasHistory = async (request, reply) => {
  const page = parseInt(request.query.page) || 1;
  const limit = parseInt(request.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const { prisma } = request.server;

    const history = await prisma.kalarasHistory.findMany({
      where: { user_id: request.user.id },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.kalarasHistory.count({
      where: { user_id: request.user.id },
    });

    return reply.send({
      message: "Riwayat percakapan berhasil diambil.",
      meta: {
        page,
        limit,
        total_data: total,
      },
      data: history,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat mengambil riwayat percakapan.",
    });
  }
};

const getChatQuota = async (request, reply) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const redisKey = `chat_limit:${request.user.id}:${today}`;

    const currentUsage = (await request.server.redis.get(redisKey)) || 0;
    const maxQuota = 10;
    const remainingQuota = Math.max(0, maxQuota - parseInt(currentUsage));

    return reply.send({
      user_tier: request.user.tier,
      kuota_maksimal: maxQuota,
      kuota_terpakai: parseInt(currentUsage),
      sisa_kuota:
        request.user.tier === "premium" ? "Tanpa Batas" : remainingQuota,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply
      .code(500)
      .send({ error: "Gagal mengambil data informasi kuota harian." });
  }
};

const deleteChatHistory = async (request, reply) => {
  try {
    const { prisma } = request.server;
    await prisma.kalarasHistory.deleteMany({
      where: { user_id: request.user.id },
    });

    return reply.send({
      message:
        "Seluruh riwayat percakapan Anda telah berhasil dihapus secara permanen.",
    });
  } catch (err) {
    request.server.log.error(err);
    return reply
      .code(500)
      .send({ error: "Gagal menghapus riwayat percakapan." });
  }
};

module.exports = {
  sendChatMessage,
  getKalarasHistory,
  getChatQuota,
  deleteChatHistory,
};
