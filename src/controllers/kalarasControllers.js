const hitExternalLLMApi = async (message) => {
  return "Ini adalah pesan respons formal simulasi dari asisten Kalaras.";
};

const getCachedResponse = async (redis, message) => {
  const keys = await redis.keys("chatbot_intent:*");
  if (!keys || keys.length === 0) return null;

  const lowerMessage = message.toLowerCase().trim();

  for (const key of keys) {
    const dataStr = await redis.get(key);
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        if (data.keywords && data.response) {
          const keywords = data.keywords.split(",").map(k => k.trim().toLowerCase());
          for (const kw of keywords) {
            if (kw && lowerMessage.includes(kw)) {
              return data.response;
            }
          }
        }
      } catch (err) {
        // Ignore JSON parse errors for invalid cache keys
      }
    }
  }
  return null;
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

    // 1. Cek cache Redis untuk pencarian intent kata kunci
    let aiResponse = await getCachedResponse(redis, message);

    // 2. Jika tidak ada di cache, gunakan simulated external LLM API
    if (!aiResponse) {
      aiResponse = await hitExternalLLMApi(message);
    }

    // 3. Simpan percakapan ke KalarasHistory
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
