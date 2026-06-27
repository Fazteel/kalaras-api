module.exports = async (request, reply) => {
  // const { prisma, redis } = request.server;
  // 
  // const user = await prisma.user.findUnique({ where: { id: request.user.id } });
  // 
  // if (user.tier === "premium") return;
  // 
  // const today = new Date().toISOString().split("T")[0];
  // const key = `chat_limit:${request.user.id}:${today}`;
  // 
  // const count = await redis.incr(key);
  // 
  // if (count === 1) {
  //   await redis.expire(key, 86400);
  // }
  // 
  // if (count > 10) {
  //   reply.code(429).send({ error: "Kuota anda habis! Silahkan Upgrade ke premium" });
  // }
};

