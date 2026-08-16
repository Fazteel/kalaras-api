const getPrivacySettings = async (request, reply) => {
  try {
    const { prisma } = request.server;
    const settings = await prisma.privacySettings.findUnique({
      where: { user_id: request.user.id },
    });

    if (!settings) {
      return reply.send({
        status: "success",
        data: {
          medical_encryption: true,
          biometric_login: false,
          location_tracking: true,
        },
      });
    }

    return reply.send({
      status: "success",
      data: {
        medical_encryption: settings.medical_encryption,
        biometric_login: settings.biometric_login,
        location_tracking: settings.location_tracking,
      },
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      status: "error",
      message: "Terjadi kesalahan internal saat mengambil pengaturan privasi.",
    });
  }
};

const updatePrivacySettings = async (request, reply) => {
  const { medical_encryption, biometric_login, location_tracking } = request.body;

  try {
    const { prisma } = request.server;

    const settings = await prisma.privacySettings.upsert({
      where: { user_id: request.user.id },
      update: {
        medical_encryption: medical_encryption !== undefined ? medical_encryption : undefined,
        biometric_login: biometric_login !== undefined ? biometric_login : undefined,
        location_tracking: location_tracking !== undefined ? location_tracking : undefined,
      },
      create: {
        user_id: request.user.id,
        medical_encryption: medical_encryption !== undefined ? medical_encryption : true,
        biometric_login: biometric_login !== undefined ? biometric_login : false,
        location_tracking: location_tracking !== undefined ? location_tracking : true,
      },
    });

    return reply.send({
      status: "success",
      data: {
        medical_encryption: settings.medical_encryption,
        biometric_login: settings.biometric_login,
        location_tracking: settings.location_tracking,
      },
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      status: "error",
      message: "Terjadi kesalahan internal saat menyimpan pengaturan privasi.",
    });
  }
};

module.exports = {
  getPrivacySettings,
  updatePrivacySettings,
};
