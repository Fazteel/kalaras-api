const Fastify = require("fastify");
const jwt = require("@fastify/jwt");
const cookie = require("@fastify/cookie");
const multipart = require("@fastify/multipart");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("redis");

const fastify = Fastify({ logger: true });
const prisma = new PrismaClient();
const redis = createClient({ url: "redis://127.0.0.1:6379" });

redis.on("error", (err) => console.log("Redis error woi:", err));
redis.connect();

fastify.decorate("prisma", prisma);
fastify.decorate("redis", redis);

// Register multipart
fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

fastify.register(jwt, { secret: "rahasia-negara-jangan-bocor" });
fastify.register(cookie, { secret: "cookie-rahasia", parseOptions: {} });

fastify.register(require("./routes/authRoutes"), { prefix: "/api/v1/auth" });
fastify.register(require("./routes/pocketRoutes"), {
  prefix: "/api/v1/pocket",
});
fastify.register(require("./routes/emergencyRoutes"), {
  prefix: "/api/v1/emergency",
});
fastify.register(require("./routes/kalarasRoutes"), {
  prefix: "/api/v1/kalaras",
});
fastify.register(require("./routes/profileRoutes"), {
  prefix: "/api/v1/profile",
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err;
  console.log("Server nyala di port 3000 woi!");
});
