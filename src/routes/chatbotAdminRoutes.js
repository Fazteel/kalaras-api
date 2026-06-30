const authenticate = require("../middlewares/auth");
const requireRole = require("../middlewares/requireRole");
const chatbotAdminController = require("../controllers/chatbotAdminController");

module.exports = async function (fastify, opts) {
  fastify.post(
    "/templates",
    {
      preValidation: [authenticate, requireRole("admin")],
      schema: {
        description: "Membuat template chatbot baru dan menyinkronkannya ke cache Redis.",
        tags: ["Chatbot Admin"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["intent", "keywords", "response_template"],
          properties: {
            intent: {
              type: "string",
              description: "Nama intent unik yang merepresentasikan tujuan percakapan.",
            },
            keywords: {
              type: "string",
              description: "Kata kunci yang memicu intent ini (dipisahkan koma).",
            },
            response_template: {
              type: "string",
              description: "Template respons yang akan dikirim chatbot.",
            },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  intent: { type: "string" },
                  keywords: { type: "string" },
                  response_template: { type: "string" },
                  created_at: { type: "string", format: "date-time" },
                  updated_at: { type: "string", format: "date-time" },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
          },
          500: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    chatbotAdminController.createTemplate
  );

  fastify.get(
    "/templates",
    {
      preValidation: [authenticate, requireRole("admin")],
      schema: {
        description: "Mengambil seluruh daftar template chatbot yang tersimpan di database.",
        tags: ["Chatbot Admin"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              total: { type: "number" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    intent: { type: "string" },
                    keywords: { type: "string" },
                    response_template: { type: "string" },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          500: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    chatbotAdminController.getAllTemplates
  );

  fastify.delete(
    "/templates/:id",
    {
      preValidation: [authenticate, requireRole("admin")],
      schema: {
        description: "Menghapus template chatbot dari database dan membersihkan cache Redis terkait.",
        tags: ["Chatbot Admin"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "UUID dari template chatbot yang akan dihapus.",
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: { message: { type: "string" } },
          },
          404: {
            type: "object",
            properties: { error: { type: "string" } },
          },
          500: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    chatbotAdminController.deleteTemplate
  );
};
