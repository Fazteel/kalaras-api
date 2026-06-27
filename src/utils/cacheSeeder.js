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

    const redisKey = "chatbot_all_templates";
    const redisPayload = JSON.stringify(templates);
    await fastify.redis.set(redisKey, redisPayload, { EX: 3600 });

    fastify.log.info(
      `[Cache Seeder] Seeding berhasil. Sebanyak ${templates.length} template chatbot telah dimuat ke cache Redis.`
    );
  } catch (err) {
    fastify.log.error(err, "[Cache Seeder] Terjadi kesalahan saat melakukan seeding cache chatbot.");
  }
};

module.exports = { seedChatbotCache };
