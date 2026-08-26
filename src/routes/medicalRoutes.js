const authenticate = require("../middlewares/auth");
const medicalController = require("../controllers/medicalController");
const medicalRecordsController = require("../controllers/medicalRecordsController");

module.exports = async function (fastify, opts) {
  fastify.get(
    "/",
    {
      preValidation: [authenticate],
      schema: {
        description: "Mengambil profil medis pengguna yang sedang login.",
        tags: ["Medical"],
        security: [{ bearerAuth: [] }],
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
    async (request, reply) => {
      try {
        const profile = await request.server.prisma.medicalProfile.findUnique({
          where: { user_id: request.user.id },
        });
        return reply.send({
          message: "Profil medis berhasil diambil.",
          data: {
            allergies: profile?.allergies ?? null,
            medical_history: profile?.medical_history ?? null,
            updated_at: profile?.updated_at ?? null,
          },
        });
      } catch (err) {
        request.server.log.error(err);
        return reply.code(500).send({ error: "Terjadi kesalahan internal saat mengambil profil medis." });
      }
    }
  );

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

  // ===== Medical Health Records (Asisten Kesehatan) =====

  fastify.post(
    "/records/extract",
    {
      preValidation: [authenticate],
      schema: {
        description: "Ekstrak data rekam medis dari file lab (Image/PDF) via mock OCR. Mendukung field tambahan 'medication_text' untuk jadwal obat.",
        tags: ["Medical Records"],
        security: [{ bearerAuth: [] }],
        consumes: ["multipart/form-data"],
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "object",
                properties: {
                  clinic_name: { type: "string" },
                  date: { type: "string" },
                  metrics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        value: { type: "string" },
                        unit: { type: "string" },
                        status: { type: "string" },
                      },
                    },
                  },
                  medication_schedule: { type: "object", nullable: true, additionalProperties: true },
                },
              },
            },
          },
        },
      },
    },
    medicalRecordsController.extractMedicalRecord
  );

  fastify.post(
    "/records",
    {
      preValidation: [authenticate],
      schema: {
        description: "Simpan rekam medis yang sudah diverifikasi user ke database.",
        tags: ["Medical Records"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["metrics"],
          properties: {
            clinic_name: { type: "string" },
            date: { type: "string", description: "YYYY-MM-DD" },
            metrics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  value: { type: "string" },
                  unit: { type: "string" },
                  status: { type: "string" },
                },
                required: ["name", "value"],
              },
            },
            file_name: { type: "string" },
            file_url: { type: "string" },
            medication_schedule: { type: "object", nullable: true },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
    medicalRecordsController.saveMedicalRecord
  );

  fastify.get(
    "/records",
    {
      preValidation: [authenticate],
      schema: {
        description: "Ambil riwayat rekam medis lab pengguna, terbaru dulu.",
        tags: ["Medical Records"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, default: 20 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { type: "array" },
              pagination: { type: "object" },
            },
          },
        },
      },
    },
    medicalRecordsController.getMedicalRecords
  );

  fastify.get(
    "/records/:id",
    {
      preValidation: [authenticate],
      schema: {
        description: "Ambil detail satu rekam medis.",
        tags: ["Medical Records"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
      },
    },
    medicalRecordsController.getMedicalRecordById
  );

  fastify.delete(
    "/records/:id",
    {
      preValidation: [authenticate],
      schema: {
        description: "Hapus rekam medis.",
        tags: ["Medical Records"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
      },
    },
    medicalRecordsController.deleteMedicalRecord
  );
};
