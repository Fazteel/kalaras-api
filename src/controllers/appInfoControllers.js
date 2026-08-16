const getAppInfo = async (request, reply) => {
  try {
    const { prisma } = request.server;
    const info = await prisma.appInfo.findFirst();

    return reply.send({
      status: "success",
      data: {
        app_name: info ? info.app_name : "Kala Esok",
        latest_version: info ? info.latest_version : "1.0.0",
        release_date: info ? info.release_date : "2026-06-16",
        force_update: info ? info.force_update : false,
        copyright: info ? info.copyright : "© 2026 Kala Esok. All rights reserved.",
      },
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      status: "error",
      message: "Terjadi kesalahan internal saat mengambil informasi aplikasi.",
    });
  }
};

module.exports = {
  getAppInfo,
};
