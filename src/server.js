require("dotenv").config();
const Fastify = require("fastify");
const jwt = require("@fastify/jwt");
const cookie = require("@fastify/cookie");
const multipart = require("@fastify/multipart");
const swagger = require("@fastify/swagger");
const swaggerUi = require("@fastify/swagger-ui");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("redis");
const { initializeMinIO } = require("./utils/minio");

const fastify = Fastify({ logger: true });
const prisma = new PrismaClient();
const redis = createClient({ url: "redis://127.0.0.1:6379" });

redis.on("error", (err) => console.log("Redis error woi:", err));
redis.connect();

fastify.decorate("prisma", prisma);
fastify.decorate("redis", redis);

fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

fastify.register(jwt, { secret: "rahasia-negara-jangan-bocor" });
fastify.register(cookie, { secret: "cookie-rahasia", parseOptions: {} });

fastify.register(swagger, {
  openapi: {
    info: {
      title: "Kalaras API",
      description: "Mental Health Support API Documentation",
      version: "1.0.0",
    },
    servers: [{ url: "http://localhost:3000", description: "Development" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
});

fastify.register(swaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: true,
  },
});

fastify.register(require("./routes/authRoutes"), { prefix: "/api/v1/auth" });
fastify.register(require("./routes/pocketRoutes"), { prefix: "/api/v1/pocket", });
fastify.register(require("./routes/emergencyRoutes"), { prefix: "/api/v1/emergency", });
fastify.register(require("./routes/kalarasRoutes"), { prefix: "/api/v1/kalaras", });
fastify.register(require("./routes/profileRoutes"), { prefix: "/api/v1/profile", });

const start = async () => {
  try {
    await initializeMinIO();
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
