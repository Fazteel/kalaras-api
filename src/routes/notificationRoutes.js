const authenticate = require("../middlewares/auth");
const notificationController = require("../controllers/notificationControllers");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.get("/", {
    schema: {
      description: "Get authenticated user notifications",
      tags: ["Notifications"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            unread_count: { type: "integer" },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  body: { type: "string" },
                  is_read: { type: "boolean" },
                  created_at: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  }, notificationController.getNotifications);

  fastify.patch("/:id/read", {
    schema: {
      description: "Mark notification as read",
      tags: ["Notifications"],
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Notification ID" },
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
  }, notificationController.markAsRead);
};
