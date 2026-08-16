const authenticate = require("../middlewares/auth");
const privateNurseController = require("../controllers/privateNurseControllers");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.get("/", {
    schema: {
      description: "Get Private Nurse setup configuration",
      tags: ["Private Nurse"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            data: {
              type: "object",
              properties: {
                is_active: { type: "boolean" },
                condition_target: { type: "string", nullable: true },
                medications: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      schedule: { type: "string" },
                    },
                  },
                },
                dietary_restrictions: { type: "string", nullable: true },
                doctor_instructions: { type: "string", nullable: true },
              },
            },
          },
        },
      },
    },
  }, privateNurseController.getPrivateNurseSetup);

  fastify.put("/", {
    schema: {
      description: "Upsert Private Nurse configuration",
      tags: ["Private Nurse"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        properties: {
          condition_target: { type: "string" },
          medication_name: { type: "string" },
          medication_schedule: { type: "string" },
          dietary_restrictions: { type: "string" },
          doctor_instructions: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
  }, privateNurseController.upsertPrivateNurseSetup);
};
