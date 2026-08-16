const getFaqs = async (request, reply) => {
  try {
    const { prisma } = request.server;
    const faqs = await prisma.faq.findMany({
      select: {
        id: true,
        question: true,
        answer: true,
      },
    });

    return reply.send({
      status: "success",
      data: faqs,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      status: "error",
      message: "Terjadi kesalahan internal saat mengambil daftar FAQ.",
    });
  }
};

const getSupportConfig = async (request, reply) => {
  try {
    const { prisma } = request.server;
    const config = await prisma.supportConfig.findFirst();

    return reply.send({
      status: "success",
      whatsapp_number: config ? config.whatsapp_number : "6281234567890",
      default_message: config ? config.default_message : "Halo Admin Kala Esok, saya butuh bantuan terkait aplikasi.",
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      status: "error",
      message: "Terjadi kesalahan internal saat mengambil konfigurasi bantuan WhatsApp.",
    });
  }
};

module.exports = {
  getFaqs,
  getSupportConfig,
};
