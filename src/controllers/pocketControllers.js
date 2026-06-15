const getEmergencyContacts = async (request, reply) => {
  try {
    const contacts = await request.server.prisma.emergencyContact.findMany({
      where: { user_id: request.user.id },
      orderBy: { priority_order: "asc" },
    });
    return reply.send(contacts);
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat mengambil data kontak darurat.",
    });
  }
};

const createEmergencyContact = async (request, reply) => {
  const { name, relation, phone, priority_order } = request.body;

  try {
    const count = await request.server.prisma.emergencyContact.count({
      where: { user_id: request.user.id },
    });

    if (count >= 5) {
      return reply.code(400).send({
        error:
          "Batas maksimal pengisian kontak darurat telah tercapai (maksimal 5 kontak).",
      });
    }

    const contact = await request.server.prisma.emergencyContact.create({
      data: {
        user_id: request.user.id,
        name,
        relation,
        phone,
        priority_order: priority_order || 1,
      },
    });

    return reply.code(201).send({
      message: "Kontak darurat berhasil ditambahkan.",
      data: contact,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat menyimpan kontak darurat.",
    });
  }
};

const updateEmergencyContact = async (request, reply) => {
  const { id } = request.params;
  const { name, relation, phone, priority_order } = request.body;

  try {
    const contact = await request.server.prisma.emergencyContact.findFirst({
      where: { id, user_id: request.user.id },
    });

    if (!contact) {
      return reply.code(404).send({
        error:
          "Data kontak darurat tidak ditemukan atau Anda tidak memiliki akses.",
      });
    }

    const updatedContact = await request.server.prisma.emergencyContact.update({
      where: { id },
      data: { name, relation, phone, priority_order },
    });

    return reply.send({
      message: "Data kontak darurat berhasil diperbarui.",
      data: updatedContact,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat memperbarui kontak darurat.",
    });
  }
};

const deleteEmergencyContact = async (request, reply) => {
  const { id } = request.params;

  try {
    const contact = await request.server.prisma.emergencyContact.findFirst({
      where: { id, user_id: request.user.id },
    });

    if (!contact) {
      return reply.code(404).send({
        error:
          "Data kontak darurat tidak ditemukan atau Anda tidak memiliki akses.",
      });
    }

    await request.server.prisma.emergencyContact.delete({ where: { id } });
    return reply.send({
      message: "Kontak darurat berhasil dihapus dari sistem.",
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat menghapus kontak darurat.",
    });
  }
};

const getJournalEntries = async (request, reply) => {
  const page = parseInt(request.query.page) || 1;
  const limit = parseInt(request.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const entries = await request.server.prisma.journalEntry.findMany({
      where: { user_id: request.user.id },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });

    const total = await request.server.prisma.journalEntry.count({
      where: { user_id: request.user.id },
    });

    return reply.send({
      meta: {
        page,
        limit,
        total_data: total,
        total_page: Math.ceil(total / limit),
      },
      data: entries,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat mengambil data jurnal harian.",
    });
  }
};

const createJournalEntry = async (request, reply) => {
  const { content } = request.body;

  if (!content || content.trim() === "") {
    return reply.code(400).send({ error: "Konten jurnal tidak boleh kosong." });
  }

  try {
    const entry = await request.server.prisma.journalEntry.create({
      data: {
        user_id: request.user.id,
        content,
      },
    });

    return reply.code(201).send({
      message: "Catatan jurnal harian berhasil disimpan.",
      data: entry,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat menyimpan catatan jurnal.",
    });
  }
};

const updateJournalEntry = async (request, reply) => {
  const { id } = request.params;
  const { content } = request.body;

  try {
    const entry = await request.server.prisma.journalEntry.findFirst({
      where: { id, user_id: request.user.id },
    });

    if (!entry) {
      return reply.code(404).send({
        error: "Catatan jurnal tidak ditemukan atau Anda tidak memiliki akses.",
      });
    }

    const updatedEntry = await request.server.prisma.journalEntry.update({
      where: { id },
      data: { content },
    });

    return reply.send({
      message: "Catatan jurnal harian berhasil diperbarui.",
      data: updatedEntry,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat memperbarui catatan jurnal.",
    });
  }
};

const deleteJournalEntry = async (request, reply) => {
  const { id } = request.params;

  try {
    const entry = await request.server.prisma.journalEntry.findFirst({
      where: { id, user_id: request.user.id },
    });

    if (!entry) {
      return reply.code(404).send({
        error: "Catatan jurnal tidak ditemukan atau Anda tidak memiliki akses.",
      });
    }

    await request.server.prisma.journalEntry.delete({ where: { id } });
    return reply.send({ message: "Catatan jurnal harian berhasil dihapus." });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat menghapus catatan jurnal.",
    });
  }
};

module.exports = {
  getEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  getJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
};
