const { uploadToMinIO, encryptBuffer, decryptBuffer, downloadFromMinIO, deleteFromMinIO } = require('../utils/minio');

const getProfile = async (request, reply) => {
  try {
    let profile = await request.server.prisma.pocketProfile.findUnique({
      where: { user_id: request.user.id },
      include: {
        user: {
          select: { email: true, phone: true, role: true, tier: true }
        }
      }
    });

    if (!profile) {
      // Auto-create pocket profile for legacy users missing profile
      const user = await request.server.prisma.user.findUnique({
        where: { id: request.user.id },
        select: { email: true, phone: true, role: true, tier: true }
      });
      if (!user) {
        return reply.code(404).send({ error: "Pengguna tidak ditemukan." });
      }
      try {
        profile = await request.server.prisma.pocketProfile.create({
          data: {
            user_id: request.user.id,
            full_name: user.email.split("@")[0] || "User",
            religion: "Islam",
            marital_status: "Belum Kawin",
          },
          include: {
            user: {
              select: { email: true, phone: true, role: true, tier: true }
            }
          }
        });
      } catch (createErr) {
        // Race condition: profile created by another request
        profile = await request.server.prisma.pocketProfile.findUnique({
          where: { user_id: request.user.id },
          include: { user: { select: { email: true, phone: true, role: true, tier: true } } }
        });
        if (!profile) throw createErr;
      }
    }

    return reply.send(profile);
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({ error: "Terjadi kesalahan internal saat mengambil data profil." });
  }
};

const updateProfile = async (request, reply) => {
  const { full_name, religion, marital_status, phone } = request.body;

  try {
    const updatedProfile = await request.server.prisma.pocketProfile.upsert({
      where: { user_id: request.user.id },
      update: { full_name, religion, marital_status },
      create: {
        user_id: request.user.id,
        full_name: full_name || request.user.email?.split("@")[0] || "User",
        religion: religion || "Islam",
        marital_status: marital_status || "Belum Kawin",
      }
    });

    if (phone) {
      await request.server.prisma.user.update({
        where: { id: request.user.id },
        data: { phone }
      });
    }

    return reply.send({
      message: "Profil dan identitas Anda berhasil diperbarui.",
      data: updatedProfile
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({ error: "Terjadi kesalahan internal saat memperbarui profil." });
  }
};

const updateAvatar = async (request, reply) => {
  try {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: "Berkas foto profil tidak ditemukan dalam permintaan." });
    }

    const fileName = `avatar-${request.user.id}-${Date.now()}-${data.filename}`;
    const fileBuffer = await data.toBuffer();

    const avatarUrl = await uploadToMinIO(fileName, fileBuffer, data.mimetype);

    const updatedProfile = await request.server.prisma.pocketProfile.update({
      where: { user_id: request.user.id },
      data: { avatar_url: avatarUrl }
    });

    return reply.send({
      message: "Foto profil berhasil diperbarui.",
      avatar_url: avatarUrl,
      data: updatedProfile
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({ error: "Terjadi kesalahan saat memproses unggahan foto profil." });
  }
};

const getFormalDocuments = async (request, reply) => {
  try {
    const documents = await request.server.prisma.formalDocument.findMany({
      where: { user_id: request.user.id },
      orderBy: { created_at: 'desc' }
    });
    return reply.send(documents);
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({ error: "Terjadi kesalahan saat mengambil daftar dokumen formal." });
  }
};

const uploadFormalDocument = async (request, reply) => {
  try {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: "Berkas dokumen formal wajib disertakan." });
    }

    const docType = data.fields.document_type ? data.fields.document_type.value : "LAINNYA";
    const fileName = `doc-${docType}-${request.user.id}-${Date.now()}-${data.filename}`;
    const fileBuffer = await data.toBuffer();

    const encryptedBuffer = encryptBuffer(fileBuffer);

    await uploadToMinIO(fileName, encryptedBuffer, data.mimetype);

    const newDoc = await request.server.prisma.formalDocument.create({
      data: {
        user_id: request.user.id,
        document_type: docType,
        file_url: fileName,
        file_name: data.filename
      }
    });

    return reply.code(201).send({
      message: "Dokumen formal berhasil diunggah dan disimpan secara aman.",
      data: newDoc
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({ error: "Terjadi kesalahan internal saat mengunggah dokumen formal." });
  }
};

const getMimeType = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    default: return 'application/octet-stream';
  }
};

const getFormalDocumentFile = async (request, reply) => {
  const { id } = request.params;
  const userId = request.user.id;
  const userRole = request.user.role;

  try {
    if (userRole === 'admin') {
      return reply.code(403).send({ error: "Akses ditolak. Administrator tidak diperbolehkan mengakses dokumen formal." });
    }
    const document = await request.server.prisma.formalDocument.findUnique({
      where: { id }
    });

    if (!document) {
      return reply.code(404).send({ error: "Dokumen tidak ditemukan." });
    }

    if (document.user_id !== userId) {
      return reply.code(403).send({ error: "Akses ditolak. Anda bukan pemilik dokumen ini." });
    }
    const objectName = document.file_url.includes('/')
      ? document.file_url.split('/').pop()
      : document.file_url;

    const encryptedBuffer = await downloadFromMinIO(objectName);

    const decryptedBuffer = decryptBuffer(encryptedBuffer);

    const mimeType = getMimeType(document.file_name);

    return reply
      .header('Content-Type', mimeType)
      .header('Content-Disposition', `inline; filename="${document.file_name}"`)
      .send(decryptedBuffer);

  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({ error: "Terjadi kesalahan internal saat memproses atau mendekripsi berkas dokumen formal." });
  }
};

const deleteFormalDocument = async (request, reply) => {
  const { id } = request.params;
  const userId = request.user.id;
  const userRole = request.user.role;

  try {
    if (userRole === 'admin') {
      return reply.code(403).send({ error: "Akses ditolak. Administrator tidak diperbolehkan menghapus dokumen formal." });
    }

    const document = await request.server.prisma.formalDocument.findUnique({
      where: { id }
    });

    if (!document) {
      return reply.code(404).send({ error: "Dokumen tidak ditemukan." });
    }

    if (document.user_id !== userId) {
      return reply.code(403).send({ error: "Akses ditolak. Anda bukan pemilik dokumen ini." });
    }

    const objectName = document.file_url.includes('/')
      ? document.file_url.split('/').pop()
      : document.file_url;

    await deleteFromMinIO(objectName);

    await request.server.prisma.formalDocument.delete({
      where: { id }
    });

    return reply.send({ message: "Dokumen formal berhasil dihapus." });

  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({ error: "Terjadi kesalahan internal saat menghapus dokumen formal." });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  getFormalDocuments,
  uploadFormalDocument,
  getFormalDocumentFile,
  deleteFormalDocument
};