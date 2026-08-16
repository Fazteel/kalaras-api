const authenticate = require("../middlewares/auth");
const profileController = require("../controllers/profileControllers");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.get("/", {
    schema: {
      description: "Get authenticated user profile",
      tags: ["Profile"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            id: { type: "string" },
            user_id: { type: "string" },
            full_name: { type: "string" },
            religion: { type: "string" },
            marital_status: { type: "string" },
            avatar_url: { type: "string" },
            updated_at: { type: "string", format: "date-time" },
            user: {
              type: "object",
              properties: {
                email: { type: "string" },
                phone: { type: "string" },
                role: { type: "string" },
                tier: { type: "string" },
              },
            },
          },
        },
      },
    },
  }, profileController.getProfile);

  fastify.put("/", {
    schema: {
      description: "Update user profile",
      tags: ["Profile"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        properties: {
          full_name: { type: "string" },
          religion: { type: "string" },
          marital_status: { type: "string" },
          phone: { type: "string" },
        },
      },
    },
  }, profileController.updateProfile);

  fastify.post("/avatar", {
    validatorCompiler: () => (data) => ({ value: data }),
    schema: {
      description: "Upload profile avatar image",
      tags: ["Profile"],
      security: [{ bearerAuth: [] }],
      consumes: ["multipart/form-data"],
      body: {
        type: "object",
        required: ["file"],
        properties: {
          file: {
            type: "string",
            format: "binary",
            description: "Berkas foto profil (PNG, JPG, JPEG)"
          }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
            avatar_url: { type: "string" },
            data: {
              type: "object",
              properties: {
                id: { type: "string" },
                user_id: { type: "string" },
                full_name: { type: "string" },
                religion: { type: "string" },
                marital_status: { type: "string" },
                avatar_url: { type: "string", nullable: true },
                birth_place_date: { type: "string", nullable: true },
                address: { type: "string", nullable: true },
                updated_at: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
  }, profileController.updateAvatar);

  fastify.get("/documents", {
    schema: {
      description: "Get all formal documents",
      tags: ["Profile"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              user_id: { type: "string" },
              document_type: { type: "string" },
              file_url: { type: "string" },
              file_name: { type: "string" },
              created_at: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  }, profileController.getFormalDocuments);

  fastify.post("/documents", {
    validatorCompiler: () => (data) => ({ value: data }),
    schema: {
      description: "Upload a formal document (KTP, BPJS, KK, etc.)",
      tags: ["Profile"],
      security: [{ bearerAuth: [] }],
      consumes: ["multipart/form-data"],
      body: {
        type: "object",
        required: ["file"],
        properties: {
          file: {
            type: "string",
            format: "binary",
            description: "Berkas dokumen formal (PDF, PNG, JPG, JPEG)"
          },
          document_type: {
            type: "string",
            description: "Tipe dokumen formal (e.g., KTP, BPJS, KK, LAINNYA)",
            default: "LAINNYA"
          }
        }
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
                document_type: { type: "string" },
                file_url: { type: "string" },
                file_name: { type: "string" },
                created_at: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
  }, profileController.uploadFormalDocument);

  fastify.get("/documents/:id", {
    schema: {
      description: "Download and decrypt a formal document file by ID",
      tags: ["Profile"],
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" }
        },
        required: ["id"]
      }
    }
  }, profileController.getFormalDocumentFile);
};
