/**
 * GET /api/v1/home/summary
 *
 * Menghitung dan mengembalikan Readiness Score (Skor Kesiapan
 * Identitas) beserta rincian kelengkapan data pengguna.
 *
 * Kriteria penilaian (masing-masing bernilai 20 poin):
 *  1. Tempat & Tanggal Lahir (PocketProfile.birth_place_date)
 *  2. Alamat Lengkap         (PocketProfile.address)
 *  3. Minimal 1 Kontak Darurat (EmergencyContact)
 *  4. Catatan Alergi         (MedicalProfile.allergies)
 *  5. Riwayat Penyakit       (MedicalProfile.medical_history)
 */
const getReadinessSummary = async (request, reply) => {
  const userId = request.user.id;

  try {
    const [pocketProfile, medicalProfile, emergencyContactCount] =
      await Promise.all([
        request.server.prisma.pocketProfile.findUnique({
          where: { user_id: userId },
          select: {
            full_name: true,
            birth_place_date: true,
            address: true,
          },
        }),
        request.server.prisma.medicalProfile.findUnique({
          where: { user_id: userId },
          select: {
            allergies: true,
            medical_history: true,
          },
        }),
        request.server.prisma.emergencyContact.count({
          where: { user_id: userId },
        }),
      ]);

    let readiness_score = 0;
    const criteria = {
      tempat_tanggal_lahir: false,
      alamat_lengkap: false,
      kontak_darurat: false,
      catatan_alergi: false,
      riwayat_penyakit: false,
    };

    if (pocketProfile?.birth_place_date?.trim()) {
      readiness_score += 20;
      criteria.tempat_tanggal_lahir = true;
    }

    if (pocketProfile?.address?.trim()) {
      readiness_score += 20;
      criteria.alamat_lengkap = true;
    }

    if (emergencyContactCount > 0) {
      readiness_score += 20;
      criteria.kontak_darurat = true;
    }

    if (medicalProfile?.allergies?.trim()) {
      readiness_score += 20;
      criteria.catatan_alergi = true;
    }

    if (medicalProfile?.medical_history?.trim()) {
      readiness_score += 20;
      criteria.riwayat_penyakit = true;
    }

    return reply.send({
      message: "Ringkasan kesiapan identitas berhasil dihitung.",
      data: {
        readiness_score,
        criteria,
      },
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat menghitung skor kesiapan identitas.",
    });
  }
};

module.exports = {
  getReadinessSummary,
};
