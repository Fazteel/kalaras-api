const { sendWhatsAppMessage } = require("../utils/whatsapp");

/**
 * Memicu sinyal darurat SOS.
 * Alur:
 *  1. Ambil profil pengguna (full_name) dari PocketProfile.
 *  2. Ambil daftar kontak darurat.
 *  3. Kirim notifikasi WhatsApp secara paralel ke semua kontak.
 *  4. Catat aktivitas ke AlertLog.
 *  5. Kembalikan respons formal.
 */
const triggerEmergency = async (request, reply) => {
  try {
    const userId = request.user.id;

    // --- 1. Ambil nama asli pengguna dari PocketProfile ---
    const pocketProfile = await request.server.prisma.pocketProfile.findUnique({
      where: { user_id: userId },
      select: { full_name: true },
    });

    const userName = pocketProfile?.full_name ?? "Pengguna Kala Esok";

    // --- 2. Ambil semua kontak darurat pengguna ---
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

    // --- 3. Susun template pesan darurat ---
    const emergencyMessage =
      `[Sistem Sinyal Darurat Kala Esok]\n\n` +
      `Segera hubungi ${userName} sekarang! ` +
      `Pengguna telah menekan tombol darurat dan membutuhkan bantuan segera.`;

    // --- 4. Kirim pesan ke semua kontak secara paralel ---
    const sendResults = await Promise.all(
      contacts.map((contact) =>
        sendWhatsAppMessage(contact.phone, emergencyMessage)
      )
    );

    // --- 5. Tentukan status pengiriman keseluruhan ---
    const hasSuccess = sendResults.some((r) => r.success);
    const overallStatus = hasSuccess ? "success" : "failed";

    // Susun payload recipients untuk log
    const recipientsPayload = sendResults.map((result, idx) => ({
      name: contacts[idx].name,
      phone: contacts[idx].phone,
      chatId: result.chatId,
      delivered: result.success,
    }));

    // --- 6. Catat aktivitas ke AlertLog ---
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

    // --- 7. Kembalikan respons formal ---
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

/**
 * Mengambil riwayat log darurat milik pengguna yang sedang login.
 */
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
