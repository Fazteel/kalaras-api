const pushNotificationAPI = async (phone, message) => {
  return new Promise((resolve) => setTimeout(resolve, 500));
};

const triggerEmergency = async (request, reply) => {
  try {
    const contacts = await request.server.prisma.emergencyContact.findMany({
      where: { user_id: request.user.id },
    });

    if (contacts.length === 0) {
      return reply.code(400).send({
        error:
          "Permintaan ditolak. Anda belum mendaftarkan satu pun kontak darurat dalam sistem.",
      });
    }

    const notifyPromises = contacts.map((contact) => {
      return pushNotificationAPI(
        contact.phone,
        "PEMBERITAHUAN DARURAT: Segera periksa lokasi pengguna!",
      );
    });
    await Promise.all(notifyPromises);

    return reply.send({
      message:
        "Sinyal darurat berhasil diproses dan notifikasi telah dikirimkan kepada seluruh kontak terdaftar.",
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
    return reply.send({
      message: "Daftar riwayat log darurat berhasil diambil.",
      data: [],
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
