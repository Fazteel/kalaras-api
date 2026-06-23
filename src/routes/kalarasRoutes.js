const authenticate = require("../middlewares/auth");
const kalarasQuotaCheck = require("../middlewares/quotaCheck");
const kalarasController = require("../controllers/kalarasControllers");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.post("/chat", {
    schema: {
      description: "Send a chat message to Kalaras AI assistant",
      tags: ["Kalaras"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string", description: "User message" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            reply: { type: "string" },
          },
        },
      },
    },
    preValidation: [kalarasQuotaCheck],
  }, kalarasController.sendChatMessage);

  fastify.get("/quota", {
    schema: {
      description: "Get daily chat quota usage",
      tags: ["Kalaras"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            user_tier: { type: "string" },
            kuota_maksimal: { type: "integer" },
            kuota_terpakai: { type: "integer" },
            sisa_kuota: { type: "string" },
          },
        },
      },
    },
  }, kalarasController.getChatQuota);

  fastify.get("/history", {
    schema: {
      description: "Get Kalaras AI chat history logs with pagination",
      tags: ["Kalaras"],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", default: 1 },
          limit: { type: "integer", default: 10 },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
            meta: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total_data: { type: "integer" },
              },
            },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  user_id: { type: "string" },
                  user_message: { type: "string" },
                  ai_reply: { type: "string" },
                  created_at: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
  }, kalarasController.getKalarasHistory);

  fastify.delete("/history", {
    schema: {
      description: "Delete all chat history",
      tags: ["Kalaras"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  }, kalarasController.deleteChatHistory);
};
