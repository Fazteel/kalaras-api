/**
 * POST /api/v1/admin/chatbot/templates
 * Membuat template chatbot baru dan menyinkronkannya ke Redis.
 */
const createTemplate = async (request, reply) => {
  const { intent, keywords, response_template } = request.body;

  if (!intent || intent.trim() === "") {
    return reply.code(400).send({
      error: "Field 'intent' wajib diisi dan tidak boleh kosong.",
    });
  }
  if (!keywords || keywords.trim() === "") {
    return reply.code(400).send({
      error: "Field 'keywords' wajib diisi dan tidak boleh kosong.",
    });
  }
  if (!response_template || response_template.trim() === "") {
    return reply.code(400).send({
      error: "Field 'response_template' wajib diisi dan tidak boleh kosong.",
    });
  }

  try {
    const existing = await request.server.prisma.chatbotTemplate.findUnique({
      where: { intent: intent.trim() },
    });

    if (existing) {
      return reply.code(400).send({
        error: `Intent '${intent.trim()}' sudah terdaftar dalam sistem. Gunakan intent yang berbeda.`,
      });
    }

    const template = await request.server.prisma.chatbotTemplate.create({
      data: {
        intent: intent.trim(),
        keywords: keywords.trim(),
        response_template: response_template.trim(),
      },
    });

    // Invalidate the overall template cache
    await request.server.redis.del("chatbot_all_templates");

    return reply.code(201).send({
      message: "Template chatbot baru berhasil dibuat dan disinkronkan.",
      data: template,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat menyimpan template chatbot.",
    });
  }
};

/**
 * GET /api/v1/admin/chatbot/templates
 * Mengambil seluruh template chatbot dari database (terbaru lebih dahulu).
 */
const getAllTemplates = async (request, reply) => {
  try {
    const templates = await request.server.prisma.chatbotTemplate.findMany({
      orderBy: { created_at: "desc" },
    });

    return reply.send({
      message: "Daftar template chatbot berhasil diambil.",
      total: templates.length,
      data: templates,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat mengambil data template chatbot.",
    });
  }
};

/**
 * DELETE /api/v1/admin/chatbot/templates/:id
 * Menghapus template chatbot berdasarkan ID dari PostgreSQL
 * dan membersihkan cache terkait dari Redis.
 */
const deleteTemplate = async (request, reply) => {
  const { id } = request.params;

  try {
    const template = await request.server.prisma.chatbotTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return reply.code(404).send({
        error: "Template chatbot tidak ditemukan. Pastikan ID yang diberikan valid.",
      });
    }

    await request.server.prisma.chatbotTemplate.delete({ where: { id } });

    // Invalidate the overall template cache
    await request.server.redis.del("chatbot_all_templates");

    return reply.send({
      message: `Template chatbot dengan intent '${template.intent}' berhasil dihapus dari sistem dan cache.`,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat menghapus template chatbot.",
    });
  }
};

module.exports = {
  createTemplate,
  getAllTemplates,
  deleteTemplate,
};
