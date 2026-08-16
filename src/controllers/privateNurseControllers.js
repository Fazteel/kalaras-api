const getPrivateNurseSetup = async (request, reply) => {
  try {
    const { prisma } = request.server;
    const setup = await prisma.privateNurse.findUnique({
      where: { user_id: request.user.id },
    });

    if (!setup) {
      return reply.send({
        status: "success",
        data: {
          is_active: false,
          condition_target: null,
          medications: [],
          dietary_restrictions: null,
          doctor_instructions: null,
        },
      });
    }

    const medications = [];
    if (setup.medication_name || setup.medication_schedule) {
      medications.push({
        name: setup.medication_name || "",
        schedule: setup.medication_schedule || "",
      });
    }

    return reply.send({
      status: "success",
      data: {
        is_active: setup.is_active,
        condition_target: setup.condition_target,
        medications,
        dietary_restrictions: setup.dietary_restrictions,
        doctor_instructions: setup.doctor_instructions,
      },
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      status: "error",
      message: "Terjadi kesalahan internal saat mengambil pengaturan perawat pribadi.",
    });
  }
};

const upsertPrivateNurseSetup = async (request, reply) => {
  const {
    condition_target,
    medication_name,
    medication_schedule,
    dietary_restrictions,
    doctor_instructions,
  } = request.body;

  try {
    const { prisma } = request.server;

    await prisma.privateNurse.upsert({
      where: { user_id: request.user.id },
      update: {
        condition_target,
        medication_name,
        medication_schedule,
        dietary_restrictions,
        doctor_instructions,
        is_active: true,
      },
      create: {
        user_id: request.user.id,
        condition_target,
        medication_name,
        medication_schedule,
        dietary_restrictions,
        doctor_instructions,
        is_active: true,
      },
    });

    return reply.send({
      status: "success",
      message: "Pengaturan Perawat Pribadi berhasil disimpan.",
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      status: "error",
      message: "Terjadi kesalahan internal saat menyimpan pengaturan perawat pribadi.",
    });
  }
};

module.exports = {
  getPrivateNurseSetup,
  upsertPrivateNurseSetup,
};
