const authenticate = require("../middlewares/auth");
const checkInController = require("../controllers/checkInControllers");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.post("/mood", {
    schema: {
      description: "Submit daily check-in mood",
      tags: ["Check-In"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["mood", "check_in_date"],
        properties: {
          mood: { type: "string", enum: ["aman", "lelah", "dukungan"], description: "Mood selection" },
          check_in_date: { type: "string", description: "Date of check-in (YYYY-MM-DD)" },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            status: { type: "string" },
            message: { type: "string" },
            data: {
              type: "object",
              properties: {
                id: { type: "string" },
                mood: { type: "string" },
                color_code: { type: "string" },
                feedback_message: { type: "string" },
                created_at: { type: "string" },
              },
            },
          },
        },
      },
    },
  }, checkInController.submitMoodCheckIn);

  fastify.post("/", {
    schema: {
      description: "Full check-in submission",
      tags: ["Check-In"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["mood"],
        properties: {
          mood: { type: "string", enum: ["aman", "lelah", "dukungan"], description: "Mood selection" },
          notes: { type: "string", description: "Detailed check-in notes" },
          stress_level: { type: "integer", minimum: 1, maximum: 10, description: "Stress level (1-10)" },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            status: { type: "string" },
            message: { type: "string" },
            data: {
              type: "object",
              properties: {
                id: { type: "string" },
                mood: { type: "string" },
                notes: { type: "string", nullable: true },
                stress_level: { type: "integer", nullable: true },
                created_at: { type: "string" },
              },
            },
          },
        },
      },
    },
  }, checkInController.submitFullCheckIn);

  fastify.get("/history", {
    schema: {
      description: "Get check-in history & stability summary",
      tags: ["Check-In"],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, default: 10 },
          start_date: { type: "string", description: "Filter start date (YYYY-MM-DD)" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            summary: {
              type: "object",
              properties: {
                stability_score: { type: "integer" },
                stability_label: { type: "string" },
                dominant_mood: { type: "string" },
              },
            },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  date: { type: "string" },
                  mood: { type: "string" },
                  notes: { type: "string" },
                  created_at: { type: "string" },
                },
              },
            },
            pagination: {
              type: "object",
              properties: {
                total: { type: "integer" },
                current_page: { type: "integer" },
                total_pages: { type: "integer" },
              },
            },
          },
        },
      },
    },
  }, checkInController.getCheckInHistory);
};
