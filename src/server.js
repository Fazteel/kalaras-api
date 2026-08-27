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

const fastify = Fastify({ 
  logger: true,
  routerOptions: {
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
  }
});
fastify.register(require("@fastify/cors"), {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
});
const prisma = new PrismaClient();
const net = require("net");

const parseRedisHostAndPort = () => {
  if (process.env.REDIS_URL) {
    try {
      const parsed = new URL(process.env.REDIS_URL);
      return {
        host: parsed.hostname || "127.0.0.1",
        port: parseInt(parsed.port, 10) || 6379,
      };
    } catch (_) {}
  }
  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  };
};

const checkPort = (port, host) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    socket.setTimeout(2000);
    socket.once('error', onError);
    socket.once('timeout', onError);
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
};

let activeRedisClient = null;
const redisStore = {};

const redis = {
  on: (event, handler) => {
    if (activeRedisClient && activeRedisClient.on) activeRedisClient.on(event, handler);
  },
  connect: async () => {
    const { host, port } = parseRedisHostAndPort();
    const isRedisUp = await checkPort(port, host);
    if (isRedisUp) {
      const clientConfig = process.env.REDIS_URL
        ? { url: process.env.REDIS_URL }
        : {
            socket: { host, port, connectTimeout: 3000 },
            password: process.env.REDIS_PASSWORD || undefined,
            username: process.env.REDIS_USERNAME || undefined,
          };
      const realClient = createClient(clientConfig);
      realClient.on("error", (err) => {
        if (err.code !== "ECONNREFUSED") {
          console.warn("[Redis Error]:", err.message);
        }
      });
      try {
        await realClient.connect();
        activeRedisClient = realClient;
        console.log(`[Redis] Connected to real Redis service at ${host}:${port}.`);
        return;
      } catch (err) {
        console.warn(`[Redis Connection Error]: ${err.message}`);
      }
    }
    console.warn("[Redis Connection Failed]: Falling back to in-memory store.");
    activeRedisClient = {
      get: async (key) => redisStore[key] || null,
      set: async (key, value, options) => {
        redisStore[key] = value.toString();
        return "OK";
      },
      del: async (key) => {
        delete redisStore[key];
        return 1;
      },
      expire: async (key, seconds) => 1,
      incr: async (key) => {
        const current = parseInt(redisStore[key] || "0", 10);
        const next = current + 1;
        redisStore[key] = next.toString();
        return next;
      },
      quit: async () => {},
      isOpen: true,
    };
  },
  get: async (key) => {
    if (!activeRedisClient) await redis.connect();
    return activeRedisClient.get(key);
  },
  set: async (key, value, options) => {
    if (!activeRedisClient) await redis.connect();
    return activeRedisClient.set(key, value, options);
  },
  del: async (key) => {
    if (!activeRedisClient) await redis.connect();
    return activeRedisClient.del(key);
  },
  expire: async (key, seconds) => {
    if (!activeRedisClient) await redis.connect();
    if (activeRedisClient.expire) {
      return activeRedisClient.expire(key, seconds);
    }
    return 1;
  },
  incr: async (key) => {
    if (!activeRedisClient) await redis.connect();
    if (activeRedisClient.incr) {
      return activeRedisClient.incr(key);
    }
    return 1;
  }
};

redis.connect().catch((err) => {});

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
fastify.register(require("./routes/checkInRoutes"), { prefix: "/api/v1/check-ins" });
fastify.register(require("./routes/privateNurseRoutes"), { prefix: "/api/v1/private-nurse" });
fastify.register(require("./routes/notificationRoutes"), { prefix: "/api/v1/notifications" });
fastify.register(require("./routes/userSettingsRoutes"), { prefix: "/api/v1/user/settings" });
fastify.register(require("./routes/supportRoutes"), { prefix: "/api/v1/support" });
fastify.register(require("./routes/appInfoRoutes"), { prefix: "/api/v1/app" });

const { safetyQueue } = require("./workers/safetyWorker");

const serverAdapter = new FastifyAdapter();
serverAdapter.setBasePath("/admin/queues");
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
    await fastify.listen({ port: 3000, host: '0.0.0.0' });

    await seedChatbotCache(fastify);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
