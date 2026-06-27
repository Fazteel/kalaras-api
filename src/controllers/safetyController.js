const { safetyQueue } = require("../workers/safetyWorker");
const { sendWhatsAppMessage } = require("../utils/whatsapp");

const startSession = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { duration_seconds, preset_label } = request.body;

    if (
      !duration_seconds ||
      !Number.isInteger(duration_seconds) ||
      duration_seconds < 60 ||
      duration_seconds > 86400
    ) {
      return reply.code(400).send({
        error:
          "duration_seconds wajib integer antara 60 (1 menit) dan 86400 (24 jam).",
      });
    }

    const existingSession =
      await request.server.prisma.safetySession.findFirst({
        where: { user_id: userId, status: "active" },
      });

    if (existingSession) {
      return reply.code(409).send({
        error:
          "Anda sudah memiliki sesi Safety Mode yang sedang aktif. " +
          "Konfirmasi atau tunggu sesi sebelumnya selesai.",
        active_session_id: existingSession.id,
      });
    }

    const nowUtc = new Date();
    const expiresAtUtc = new Date(nowUtc.getTime() + duration_seconds * 1000);

    const session = await request.server.prisma.safetySession.create({
      data: {
        user_id: userId,
        duration_seconds,
        preset_label: preset_label || null,
        status: "active",
        started_at: nowUtc,
        expires_at: expiresAtUtc,
      },
    });

    const job = await safetyQueue.add(
      "deadman-check",
      {
        sessionId: session.id,
        userId,
      },
      {
        delay: duration_seconds * 1000,
        jobId: `safety-${session.id}`,
      }
    );

    request.server.log.info(
      `[Safety] Sesi ${session.id} dimulai. Timer: ${duration_seconds}s. Job: ${job.id}`
    );

    return reply.code(201).send({
      message: "Sesi Safety Mode berhasil dimulai. Timer deadman switch aktif.",
      data: {
        session_id: session.id,
        duration_seconds,
        started_at: session.started_at.toISOString(),
        expires_at: session.expires_at.toISOString(),
        bullmq_job_id: job.id,
      },
    });
  } catch (err) {
    request.server.log.error(err);

    if (err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED")) {
      return reply.code(503).send({
        error:
          "Layanan antrean (Redis) tidak tersedia. Silakan coba lagi nanti.",
      });
    }

    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat memulai sesi Safety Mode.",
    });
  }
};

const confirmSafe = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { session_id } = request.body;

    if (!session_id) {
      return reply.code(400).send({
        error: "session_id wajib diisi.",
      });
    }

    const session = await request.server.prisma.safetySession.findUnique({
      where: { id: session_id },
    });

    if (!session) {
      return reply.code(404).send({
        error: "Sesi tidak ditemukan.",
      });
    }

    if (session.user_id !== userId) {
      return reply.code(403).send({
        error: "Anda tidak memiliki akses ke sesi ini.",
      });
    }

    if (session.status !== "active") {
      return reply.code(409).send({
        error: `Sesi tidak dapat dikonfirmasi. Status saat ini: "${session.status}".`,
      });
    }

    const updatedSession = await request.server.prisma.safetySession.update({
      where: { id: session_id },
      data: {
        status: "confirmed",
        confirmed_at: new Date(),
      },
    });

    const bullmqJobId = `safety-${session_id}`;
    try {
      const job = await safetyQueue.getJob(bullmqJobId);
      if (job) {
        await job.remove();
        request.server.log.info(
          `[Safety] Job ${bullmqJobId} berhasil dihapus dari antrean Redis.`
        );
      }
    } catch (removeErr) {
      request.server.log.warn(
        `[Safety] Gagal menghapus job ${bullmqJobId}: ${removeErr.message}.`
      );
    }

    return reply.send({
      message:
        "Konfirmasi keselamatan berhasil. Timer deadman switch dibatalkan.",
      data: {
        session_id: updatedSession.id,
        status: updatedSession.status,
        confirmed_at: updatedSession.confirmed_at.toISOString(),
      },
    });
  } catch (err) {
    request.server.log.error(err);

    if (err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED")) {
      return reply.code(503).send({
        error:
          "Layanan antrean (Redis) tidak tersedia. Silakan coba lagi nanti.",
      });
    }

    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat mengkonfirmasi keselamatan.",
    });
  }
};

const updateLocation = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { latitude, longitude, is_out_of_route, session_id } = request.body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return reply.code(400).send({
        error:
          "latitude (-90 s/d 90) dan longitude (-180 s/d 180) wajib angka valid.",
      });
    }

    const locationLog = await request.server.prisma.locationLog.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        latitude,
        longitude,
        recorded_at: new Date(),
      },
      update: {
        latitude,
        longitude,
        recorded_at: new Date(),
      },
    });

    if (!is_out_of_route) {
      return reply.send({
        message: "Lokasi berhasil diperbarui.",
        data: {
          latitude: locationLog.latitude,
          longitude: locationLog.longitude,
          recorded_at: locationLog.recorded_at.toISOString(),
        },
      });
    }

    request.server.log.warn(
      `[Safety] 🚨 OUT_OF_ROUTE terdeteksi untuk user ${userId}!`
    );

    let activeSession = null;
    if (session_id) {
      activeSession = await request.server.prisma.safetySession.findUnique({
        where: { id: session_id },
      });
    }

    if (!activeSession || activeSession.status !== "active") {
      activeSession = await request.server.prisma.safetySession.findFirst({
        where: { user_id: userId, status: "active" },
        orderBy: { started_at: "desc" },
      });
    }

    if (activeSession && activeSession.status === "active") {
      await request.server.prisma.safetySession.update({
        where: { id: activeSession.id },
        data: { status: "critical" },
      });

      const bullmqJobId = `safety-${activeSession.id}`;
      try {
        const job = await safetyQueue.getJob(bullmqJobId);
        if (job) await job.remove();
      } catch (removeErr) {
        request.server.log.warn(
          `[Safety] Gagal cleanup job ${bullmqJobId}: ${removeErr.message}`
        );
      }
    }

    const [pocketProfile, contacts] = await Promise.all([
      request.server.prisma.pocketProfile.findUnique({
        where: { user_id: userId },
        select: { full_name: true },
      }),
      request.server.prisma.emergencyContact.findMany({
        where: { user_id: userId },
        orderBy: { priority_order: "asc" },
      }),
    ]);

    const userName = pocketProfile?.full_name ?? "Pengguna Kala Esok";

    if (!contacts || contacts.length === 0) {
      return reply.code(400).send({
        error:
          "Deviasi rute terdeteksi, namun tidak ada kontak darurat terdaftar. " +
          "Sinyal darurat tidak dapat dikirim.",
      });
    }

    const now = new Date();
    const formattedTime = now.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " WIB";

    const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

    const emergencyMessage =
      `[🚨 PERINGATAN DEVIASI RUTE — Kala Esok]\n\n` +
      `${userName} terdeteksi menyimpang dari jalur yang direncanakan!\n\n` +
      `📍 Koordinat terakhir: ${latitude}, ${longitude}\n` +
      `🗺️ Buka di Google Maps: ${mapsUrl}\n` +
      `⏰ Waktu: ${formattedTime}\n\n` +
      `Segera hubungi yang bersangkutan untuk memastikan keselamatan mereka.`;

    const sendResults = await Promise.all(
      contacts.map((contact) =>
        sendWhatsAppMessage(contact.phone, emergencyMessage)
      )
    );

    const hasSuccess = sendResults.some((r) => r.success);
    const recipientsPayload = sendResults.map((result, idx) => ({
      name: contacts[idx].name,
      phone: contacts[idx].phone,
      chatId: result.chatId,
      delivered: result.success,
    }));

    await request.server.prisma.alertLog.create({
      data: {
        user_id: userId,
        alert_type: "ROUTE_DEVIATION_SOS",
        recipients: recipientsPayload,
        status: hasSuccess ? "sent" : "failed",
        triggered_at: new Date(),
        delivered_at: hasSuccess ? new Date() : null,
      },
    });

    return reply.send({
      message:
        "⚠️ Deviasi rute terdeteksi! Sinyal darurat telah dikirim ke semua kontak terdaftar.",
      data: {
        location: { latitude, longitude },
        session_status: "critical",
        alert: {
          total_contacts: contacts.length,
          delivered: sendResults.filter((r) => r.success).length,
          failed: sendResults.filter((r) => !r.success).length,
          recipients: recipientsPayload,
        },
      },
    });
  } catch (err) {
    request.server.log.error(err);

    if (err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED")) {
      return reply.code(503).send({
        error:
          "Layanan antrean (Redis) tidak tersedia. Silakan coba lagi nanti.",
      });
    }

    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat memperbarui lokasi.",
    });
  }
};

module.exports = {
  startSession,
  confirmSafe,
  updateLocation,
};
