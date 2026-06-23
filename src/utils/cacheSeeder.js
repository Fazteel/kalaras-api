/**
 * seedChatbotCache — Melakukan seeding seluruh template chatbot
 * dari database ke Redis pada saat server startup.
 *
 * @param {import('fastify').FastifyInstance} fastify - Instance Fastify yang
 *   telah didekorasi dengan `prisma` dan `redis`.
 */
const seedChatbotCache = async (fastify) => {
  try {
    fastify.log.info("[Cache Seeder] Memulai proses seeding cache template chatbot...");

    const templates = await fastify.prisma.chatbotTemplate.findMany();

    if (templates.length === 0) {
      fastify.log.info("[Cache Seeder] Tidak ada template chatbot ditemukan. Proses seeding dilewati.");
      return;
    }

    const pipeline = fastify.redis.multi();

    for (const template of templates) {
      const redisKey = `chatbot_intent:${template.intent}`;
      const redisPayload = JSON.stringify({
        keywords: template.keywords,
        response: template.response_template,
      });
      pipeline.set(redisKey, redisPayload);
    }

    await pipeline.exec();

    fastify.log.info(
      `[Cache Seeder] Seeding berhasil. Sebanyak ${templates.length} template chatbot telah dimuat ke cache Redis.`
    );
  } catch (err) {
    fastify.log.error(err, "[Cache Seeder] Terjadi kesalahan saat melakukan seeding cache chatbot.");
  }
};

module.exports = { seedChatbotCache };
