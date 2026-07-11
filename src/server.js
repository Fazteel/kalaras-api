require("dotenv").config();
const Fastify = require("fastify");
const jwt = require("@fastify/jwt");
const cookie = require("@fastify/cookie");
const multipart = require("@fastify/multipart");
const swagger = require("@fastify/swagger");
const swaggerUi = require("@fastify/swagger-ui");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("redis");
const authenticate = require("./middlewares/auth");
const requireRole = require("./middlewares/requireRole");
const { initializeMinIO } = require("./utils/minio");
const { seedChatbotCache } = require("./utils/cacheSeeder");
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { FastifyAdapter } = require("@bull-board/fastify");

const fastify = Fastify({ logger: true });
const prisma = new PrismaClient();
const redis = createClient({ url: "redis://127.0.0.1:6379" });

redis.on("error", (err) => console.log(err));
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
fastify.register(require("./routes/pocketRoutes"), { prefix: "/api/v1/pocket" });
fastify.register(require("./routes/emergencyRoutes"), { prefix: "/api/v1/emergency" });
fastify.register(require("./routes/kalarasRoutes"), { prefix: "/api/v1/kalaras" });
fastify.register(require("./routes/profileRoutes"), { prefix: "/api/v1/profile" });
fastify.register(require("./routes/homeRoutes"), { prefix: "/api/v1/home" });
fastify.register(require("./routes/medicalRoutes"), { prefix: "/api/v1/medical" });
fastify.register(require("./routes/chatbotAdminRoutes"), { prefix: "/api/v1/admin/chatbot" });
fastify.register(require("./routes/safetyRoutes"), { prefix: "/api/v1/safety" });

const { safetyQueue } = require("./workers/safetyWorker");

const serverAdapter = new FastifyAdapter();
serverAdapter.setBasePath("/admin/queues");
serverAdapter.setInstance(fastify);
serverAdapter.setErrorHandler(fastify.errorHandler);

createBullBoard({
  queues: [new BullMQAdapter(safetyQueue)],
  serverAdapter,
});

fastify.register(async function (adminQueues) {
  adminQueues.addHook("preValidation", authenticate);
  adminQueues.addHook("preValidation", requireRole("admin"));
  adminQueues.register(serverAdapter.registerPlugin(), {
    basePath: "/",
    prefix: "/admin/queues",
  });
});

const start = async () => {
  try {
    await initializeMinIO();
    await fastify.listen({ port: 3000 });

    await seedChatbotCache(fastify);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
