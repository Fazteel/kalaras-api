const authenticate = require("../middlewares/auth");
const emergencyController = require("../controllers/emergencyControllers");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.post("/trigger", {
    schema: {
      description: "Trigger emergency alert to all registered contacts",
      tags: ["Emergency"],
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
  }, emergencyController.triggerEmergency);

  fastify.get("/logs", {
    schema: {
      description: "Get emergency alert history logs",
      tags: ["Emergency"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
            data: {
              type: "array",
              items: { type: "object" },
            },
          },
        },
      },
    },
  }, emergencyController.getEmergencyLogs);
};
