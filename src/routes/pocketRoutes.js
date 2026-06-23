const authenticate = require("../middlewares/auth");
const pocketController = require("../controllers/pocketControllers");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.get("/emergency-contacts", {
    schema: {
      description: "Get all emergency contacts for the authenticated user",
      tags: ["Pocket"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              user_id: { type: "string" },
              name: { type: "string" },
              relation: { type: "string" },
              phone: { type: "string" },
              priority_order: { type: "integer" },
              created_at: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  }, pocketController.getEmergencyContacts);

  fastify.post("/emergency-contacts", {
    schema: {
      description: "Create a new emergency contact (max 5)",
      tags: ["Pocket"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["name", "relation", "phone"],
        properties: {
          name: { type: "string", description: "Contact name" },
          relation: { type: "string", description: "Relationship" },
          phone: { type: "string", description: "Phone number" },
          priority_order: { type: "integer", description: "Priority order", default: 1 },
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
                user_id: { type: "string" },
                name: { type: "string" },
                relation: { type: "string" },
                phone: { type: "string" },
                priority_order: { type: "integer" },
                created_at: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
  }, pocketController.createEmergencyContact);

  fastify.put("/emergency-contacts/:id", {
    schema: {
      description: "Update an emergency contact",
      tags: ["Pocket"],
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Emergency contact ID" },
        },
      },
      body: {
        type: "object",
        properties: {
          name: { type: "string" },
          relation: { type: "string" },
          phone: { type: "string" },
          priority_order: { type: "integer" },
        },
      },
    },
  }, pocketController.updateEmergencyContact);

  fastify.delete("/emergency-contacts/:id", {
    schema: {
      description: "Delete an emergency contact",
      tags: ["Pocket"],
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Emergency contact ID" },
        },
      },
    },
  }, pocketController.deleteEmergencyContact);

  fastify.get("/journal", {
    schema: {
      description: "Get journal entries with pagination",
      tags: ["Pocket"],
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
            meta: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total_data: { type: "integer" },
                total_page: { type: "integer" },
              },
            },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  user_id: { type: "string" },
                  content: { type: "string" },
                  created_at: { type: "string", format: "date-time" },
                  updated_at: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
  }, pocketController.getJournalEntries);

  fastify.post("/journal", {
    schema: {
      description: "Create a new journal entry",
      tags: ["Pocket"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string", description: "Journal content" },
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
                user_id: { type: "string" },
                content: { type: "string" },
                created_at: { type: "string", format: "date-time" },
                updated_at: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
  }, pocketController.createJournalEntry);

  fastify.put("/journal/:id", {
    schema: {
      description: "Update a journal entry",
      tags: ["Pocket"],
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Journal entry ID" },
        },
      },
      body: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string" },
        },
      },
    },
  }, pocketController.updateJournalEntry);

  fastify.delete("/journal/:id", {
    schema: {
      description: "Delete a journal entry",
      tags: ["Pocket"],
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Journal entry ID" },
        },
      },
    },
  }, pocketController.deleteJournalEntry);
};
