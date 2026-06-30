const { sendWhatsAppMessage } = require("../utils/whatsapp");

const triggerEmergency = async (request, reply) => {
  try {
    const userId = request.user.id;

    const pocketProfile = await request.server.prisma.pocketProfile.findUnique({
      where: { user_id: userId },
      select: { full_name: true },
    });

    const userName = pocketProfile?.full_name ?? "Pengguna Kala Esok";

    const contacts = await request.server.prisma.emergencyContact.findMany({
      where: { user_id: userId },
      orderBy: { priority_order: "asc" },
    });

    if (contacts.length === 0) {
      return reply.code(400).send({
        error:
          "Permintaan ditolak. Anda belum mendaftarkan satu pun kontak darurat dalam sistem.",
      });
    }

    const emergencyMessage =
      `[Sistem Sinyal Darurat Kala Esok]\n\n` +
      `Segera hubungi ${userName} sekarang! ` +
      `Pengguna telah menekan tombol darurat dan membutuhkan bantuan segera.`;

    const sendResults = await Promise.all(
      contacts.map((contact) =>
        sendWhatsAppMessage(contact.phone, emergencyMessage)
      )
    );

    const hasSuccess = sendResults.some((r) => r.success);
    const overallStatus = hasSuccess ? "success" : "failed";

    const recipientsPayload = sendResults.map((result, idx) => ({
      name: contacts[idx].name,
      phone: contacts[idx].phone,
      chatId: result.chatId,
      delivered: result.success,
    }));

    await request.server.prisma.alertLog.create({
      data: {
        user_id: userId,
        alert_type: "SOS_BUTTON",
        recipients: recipientsPayload,
        status: overallStatus,
        triggered_at: new Date(),
        delivered_at: hasSuccess ? new Date() : null,
      },
    });

    return reply.send({
      message:
        "Sinyal darurat berhasil diproses dan notifikasi telah dikirimkan kepada seluruh kontak terdaftar.",
      data: {
        total_contacts: contacts.length,
        delivered: sendResults.filter((r) => r.success).length,
        failed: sendResults.filter((r) => !r.success).length,
        recipients: recipientsPayload,
      },
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat memproses sinyal darurat.",
    });
  }
};

const getEmergencyLogs = async (request, reply) => {
  try {
    const logs = await request.server.prisma.alertLog.findMany({
      where: { user_id: request.user.id },
      orderBy: { triggered_at: "desc" },
    });

    return reply.send({
      message: "Daftar riwayat log darurat berhasil diambil.",
      data: logs,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply
      .code(500)
      .send({ error: "Terjadi kesalahan saat mengambil riwayat log darurat." });
  }
};

module.exports = {
  triggerEmergency,
  getEmergencyLogs,
};
