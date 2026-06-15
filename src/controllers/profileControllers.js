const uploadToMinIO = async (fileName, fileBuffer, mimeType) => {
  return `http://kalaesok.my.id/storage/files/${fileName}`;
};

const getProfile = async (request, reply) => {
  try {
    const profile = await request.server.prisma.pocketProfile.findUnique({
      where: { user_id: request.user.id },
      include: {
        user: {
          select: { email: true, phone: true, role: true, tier: true },
        },
      },
    });

    if (!profile) {
      return reply
        .code(404)
        .send({ error: "Profil pengguna tidak ditemukan." });
    }

    return reply.send(profile);
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat mengambil data profil.",
    });
  }
};

const updateProfile = async (request, reply) => {
  const { full_name, religion, marital_status, phone } = request.body;

  try {
    const updatedProfile = await request.server.prisma.pocketProfile.update({
      where: { user_id: request.user.id },
      data: {
        full_name,
        religion,
        marital_status,
      },
    });

    if (phone) {
      await request.server.prisma.user.update({
        where: { id: request.user.id },
        data: { phone },
      });
    }

    return reply.send({
      message: "Profil dan identitas Anda berhasil diperbarui.",
      data: updatedProfile,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply
      .code(500)
      .send({ error: "Terjadi kesalahan internal saat memperbarui profil." });
  }
};

const updateAvatar = async (request, reply) => {
  try {
    const data = await request.file();
    if (!data) {
      return reply
        .code(400)
        .send({ error: "File foto profil tidak ditemukan dalam permintaan." });
    }

    const fileName = `avatar-${request.user.id}-${Date.now()}-${data.filename}`;
    const fileBuffer = await data.toBuffer();

    const avatarUrl = await uploadToMinIO(fileName, fileBuffer, data.mimetype);

    return reply.send({
      message: "Foto profil berhasil diperbarui.",
      avatar_url: avatarUrl,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan saat memproses unggahan foto profil.",
    });
  }
};

const getFormalDocuments = async (request, reply) => {
  try {
    const documents = await request.server.prisma.formalDocument.findMany({
      where: { user_id: request.user.id },
      orderBy: { created_at: "desc" },
    });
    return reply.send(documents);
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan saat mengambil daftar dokumen formal.",
    });
  }
};

const uploadFormalDocument = async (request, reply) => {
  try {
    const data = await request.file();
    if (!data) {
      return reply
        .code(400)
        .send({ error: "Berkas dokumen formal wajib disertakan." });
    }

    const docType = data.fields.document_type
      ? data.fields.document_type.value
      : "LAINNYA";

    const fileName = `doc-${docType}-${request.user.id}-${Date.now()}-${data.filename}`;
    const fileBuffer = await data.toBuffer();

    const fileUrl = await uploadToMinIO(fileName, fileBuffer, data.mimetype);

    const newDoc = await request.server.prisma.formalDocument.create({
      data: {
        user_id: request.user.id,
        document_type: docType,
        file_url: fileUrl,
        file_name: data.filename,
      },
    });

    return reply.code(201).send({
      message: "Dokumen formal berhasil diunggah dan disimpan secara aman.",
      data: newDoc,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat mengunggah dokumen formal.",
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  getFormalDocuments,
  uploadFormalDocument,
};
