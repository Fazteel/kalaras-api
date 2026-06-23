/**
 * PUT /api/v1/medical
 *
 * Membuat atau memperbarui profil medis milik user yang sedang login.
 * Menggunakan upsert agar aman dipanggil pertama kali (create)
 * maupun saat data sudah ada (update).
 *
 * @requires authenticate middleware
 */
const updateMedicalProfile = async (request, reply) => {
  const userId = request.user.id;
  const { allergies, medical_history } = request.body;

  try {
    const medicalProfile = await request.server.prisma.medicalProfile.upsert({
      where: { user_id: userId },
      update: {
        allergies: allergies ?? null,
        medical_history: medical_history ?? null,
      },
      create: {
        user_id: userId,
        allergies: allergies ?? null,
        medical_history: medical_history ?? null,
      },
    });

    return reply.send({
      message: "Profil medis Anda berhasil diperbarui.",
      data: {
        allergies: medicalProfile.allergies,
        medical_history: medicalProfile.medical_history,
        updated_at: medicalProfile.updated_at,
      },
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat memperbarui profil medis.",
    });
  }
};

/**
 * GET /api/v1/medical/tag/:userId
 *
 * Endpoint publik untuk membaca data identitas medis darurat
 * berdasarkan UUID pengguna. Tidak memerlukan autentikasi.
 *
 * Data yang dikembalikan sudah difilter ketat:
 *  - Identitas dasar   : full_name, birth_place_date
 *  - Kontak darurat    : seluruh daftar kontak
 *  - Profil medis      : allergies, medical_history
 *
 * TIDAK ADA: email, password_hash, tier, role, referral_code,
 *            referred_by, atau field sensitif lainnya.
 *
 * @public — tidak memerlukan login
 */
const getPublicMedicalTag = async (request, reply) => {
  const { userId } = request.params;

  try {
    const user = await request.server.prisma.user.findUnique({
      where: { id: userId },
      select: {
        pocket_profile: {
          select: {
            full_name: true,
            birth_place_date: true,
          },
        },
        emergency_contact: {
          select: {
            id: true,
            name: true,
            relation: true,
            phone: true,
            priority_order: true,
          },
          orderBy: { priority_order: "asc" },
        },
        medical_profile: {
          select: {
            allergies: true,
            medical_history: true,
          },
        },
      },
    });

    if (!user) {
      return reply.code(404).send({
        error: "Data tidak ditemukan. Pastikan ID pengguna yang diberikan valid.",
      });
    }

    return reply.send({
      message: "Data identitas medis darurat berhasil dimuat.",
      data: {
        identitas: {
          full_name: user.pocket_profile?.full_name ?? null,
          birth_place_date: user.pocket_profile?.birth_place_date ?? null,
        },
        kontak_darurat: user.emergency_contact,
        profil_medis: {
          allergies: user.medical_profile?.allergies ?? null,
          medical_history: user.medical_profile?.medical_history ?? null,
        },
      },
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat memuat data identitas medis darurat.",
    });
  }
};

module.exports = {
  updateMedicalProfile,
  getPublicMedicalTag,
};
