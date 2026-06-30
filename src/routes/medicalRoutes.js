const authenticate = require("../middlewares/auth");
const medicalController = require("../controllers/medicalController");

module.exports = async function (fastify, opts) {
  fastify.put(
    "/",
    {
      preValidation: [authenticate],
      schema: {
        description: "Membuat atau memperbarui profil medis pengguna yang sedang login.",
        tags: ["Medical"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            allergies: {
              type: "string",
              nullable: true,
              description: "Catatan alergi pengguna (obat, makanan, dll.).",
            },
            medical_history: {
              type: "string",
              nullable: true,
              description: "Riwayat penyakit atau kondisi medis yang pernah diderita.",
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
                  allergies: { type: "string", nullable: true },
                  medical_history: { type: "string", nullable: true },
                  updated_at: { type: "string", format: "date-time" },
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
    medicalController.updateMedicalProfile
  );

  fastify.get(
    "/tag/:userId",
    {
      schema: {
        description:
          "Endpoint publik untuk membaca data identitas medis darurat berdasarkan UUID pengguna. Tidak memerlukan autentikasi.",
        tags: ["Medical Tag (Public)"],
        params: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: {
              type: "string",
              format: "uuid",
              description: "UUID pengguna yang ingin dimuat data medis daruratnya.",
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
                  identitas: {
                    type: "object",
                    properties: {
                      full_name: { type: "string", nullable: true },
                      birth_place_date: { type: "string", nullable: true },
                    },
                  },
                  kontak_darurat: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        relation: { type: "string" },
                        phone: { type: "string" },
                        priority_order: { type: "number" },
                      },
                    },
                  },
                  profil_medis: {
                    type: "object",
                    properties: {
                      allergies: { type: "string", nullable: true },
                      medical_history: { type: "string", nullable: true },
                    },
                  },
                },
              },
            },
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
    medicalController.getPublicMedicalTag
  );
};
