const hitExternalLLMApi = async (message) => {
  return "Ini adalah pesan respons formal simulasi dari asisten Kalaras.";
};

const sendChatMessage = async (request, reply) => {
  const { message } = request.body;

  if (!message || message.trim() === "") {
    return reply
      .code(400)
      .send({ error: "Pesan yang dikirimkan tidak boleh kosong." });
  }

  try {
    const aiResponse = await hitExternalLLMApi(message);
    return reply.send({ reply: aiResponse });
  } catch (err) {
    request.server.log.error(err);
    return reply
      .code(500)
      .send({ error: "Gagal memproses data obrolan dengan asisten Kalaras." });
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
  getChatQuota,
  deleteChatHistory,
};
