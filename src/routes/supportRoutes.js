const supportController = require("../controllers/supportControllers");

module.exports = async function (fastify, opts) {
  fastify.get("/faqs", {
    schema: {
      description: "Get FAQ list",
      tags: ["Support"],
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  question: { type: "string" },
                  answer: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  }, supportController.getFaqs);

  fastify.get("/config", {
    schema: {
      description: "Get WhatsApp support number and message configuration",
      tags: ["Support"],
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            whatsapp_number: { type: "string" },
            default_message: { type: "string" },
          },
        },
      },
    },
  }, supportController.getSupportConfig);
};
