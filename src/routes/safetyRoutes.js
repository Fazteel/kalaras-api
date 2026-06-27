const authenticate = require("../middlewares/auth");
const safetyController = require("../controllers/safetyController");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.post(
    "/start-session",
    {
      schema: {
        description:
          "Memulai sesi Safety Mode. Timer deadman switch akan aktif selama duration_seconds. " +
          "Jika user tidak mengkonfirmasi keselamatan sebelum timer habis, " +
          "sinyal darurat otomatis dikirim ke semua kontak darurat.",
        tags: ["Safety Mode"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["duration_seconds"],
          properties: {
            duration_seconds: {
              type: "integer",
              minimum: 60,
              maximum: 86400,
              description:
                "Durasi timer dalam detik (min: 60 = 1 menit, max: 86400 = 24 jam)",
            },
            preset_label: {
              type: "string",
              description:
                'Label preset opsional (misal: "Ojol Malam", "Jalan Kaki Sendirian")',
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
                  session_id: { type: "string" },
                  duration_seconds: { type: "integer" },
                  started_at: { type: "string" },
                  expires_at: { type: "string" },
                  bullmq_job_id: { type: "string" },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
          },
          409: {
            type: "object",
            properties: {
              error: { type: "string" },
              active_session_id: { type: "string" },
            },
          },
          503: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    safetyController.startSession
  );

  fastify.post(
    "/confirm-safe",
    {
      schema: {
        description:
          'User mengkonfirmasi "Saya Aman". Membatalkan timer deadman switch ' +
          "dan menghapus job dari antrean Redis.",
        tags: ["Safety Mode"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["session_id"],
          properties: {
            session_id: {
              type: "string",
              description: "ID sesi Safety Mode yang sedang aktif",
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  session_id: { type: "string" },
                  status: { type: "string" },
                  confirmed_at: { type: "string" },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
          },
          403: {
            type: "object",
            properties: { error: { type: "string" } },
          },
          404: {
            type: "object",
            properties: { error: { type: "string" } },
          },
          409: {
            type: "object",
            properties: { error: { type: "string" } },
          },
          503: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    safetyController.confirmSafe
  );

  fastify.post(
    "/update-location",
    {
      schema: {
        description:
          "Update lokasi terakhir user (rolling upsert 1 baris per user). " +
          "Jika is_out_of_route = true, sinyal darurat langsung dikirim " +
          "tanpa menunggu timer deadman switch habis.",
        tags: ["Safety Mode"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["latitude", "longitude", "is_out_of_route"],
          properties: {
            latitude: {
              type: "number",
              minimum: -90,
              maximum: 90,
              description: "Koordinat latitude (dari client Flutter)",
            },
            longitude: {
              type: "number",
              minimum: -180,
              maximum: 180,
              description: "Koordinat longitude (dari client Flutter)",
            },
            is_out_of_route: {
              type: "boolean",
              description:
                "Flag dari client Flutter — true jika user keluar dari radius/jalur yang direncanakan. " +
                "Backend TIDAK menghitung geofencing, hanya menerima status ini.",
            },
            session_id: {
              type: "string",
              description:
                "ID sesi aktif (opsional, jika tidak dikirim maka dicari otomatis dari DB)",
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { type: "object" },
            },
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
          },
          503: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    safetyController.updateLocation
  );
};
