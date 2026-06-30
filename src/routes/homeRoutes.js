const authenticate = require("../middlewares/auth");
const homeController = require("../controllers/homeController");

module.exports = async function (fastify, opts) {
  fastify.get(
    "/summary",
    {
      preValidation: [authenticate],
      schema: {
        description:
          "Menghitung Readiness Score (Skor Kesiapan Identitas) pengguna berdasarkan 5 kriteria kelengkapan data.",
        tags: ["Home"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  readiness_score: {
                    type: "number",
                    description: "Total skor kesiapan identitas (0–100).",
                  },
                  criteria: {
                    type: "object",
                    description: "Rincian status pemenuhan setiap kriteria.",
                    properties: {
                      tempat_tanggal_lahir: { type: "boolean" },
                      alamat_lengkap: { type: "boolean" },
                      kontak_darurat: { type: "boolean" },
                      catatan_alergi: { type: "boolean" },
                      riwayat_penyakit: { type: "boolean" },
                    },
                  },
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
    homeController.getReadinessSummary
  );
};
