const authenticate = require("../middlewares/auth");
const userSettingsController = require("../controllers/userSettingsControllers");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.get("/privacy", {
    schema: {
      description: "Get user privacy & security settings",
      tags: ["User Settings"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            data: {
              type: "object",
              properties: {
                medical_encryption: { type: "boolean" },
                biometric_login: { type: "boolean" },
                location_tracking: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  }, userSettingsController.getPrivacySettings);

  fastify.put("/privacy", {
    schema: {
      description: "Update user privacy & security settings",
      tags: ["User Settings"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        properties: {
          medical_encryption: { type: "boolean" },
          biometric_login: { type: "boolean" },
          location_tracking: { type: "boolean" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            data: {
              type: "object",
              properties: {
                medical_encryption: { type: "boolean" },
                biometric_login: { type: "boolean" },
                location_tracking: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  }, userSettingsController.updatePrivacySettings);
};
