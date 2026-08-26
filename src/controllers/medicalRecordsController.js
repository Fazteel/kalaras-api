const crypto = require('crypto');

// Helper: parse medication text like "paracetamol, 3x sehari start jam 08.00 jeda per 4 jam sampe 3 kali"
function parseMedicationSchedule(text) {
  if (!text) return null;
  // Simple parser for demo: extract name, frequency, start time, interval
  const lower = text.toLowerCase();
  const medMatch = lower.match(/([a-z]+)/);
  const freqMatch = lower.match(/(\d+)x\s*sehari/);
  const startMatch = lower.match(/start\s*jam\s*(\d{1,2})[.:](\d{2})/);
  const intervalMatch = lower.match(/jeda\s*per\s*(\d+)\s*jam/);
  const countMatch = lower.match(/sampe\s*(\d+)\s*kali/);

  if (!medMatch) return null;

  const startHour = startMatch ? parseInt(startMatch[1]) : 8;
  const startMinute = startMatch ? parseInt(startMatch[2]) : 0;
  const intervalHours = intervalMatch ? parseInt(intervalMatch[1]) : (freqMatch ? Math.floor(24 / parseInt(freqMatch[1])) : 8);
  const count = countMatch ? parseInt(countMatch[1]) : (freqMatch ? parseInt(freqMatch[1]) : 3);

  const times = [];
  for (let i = 0; i < count; i++) {
    const totalMinutes = startHour * 60 + startMinute + i * intervalHours * 60;
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    times.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  }

  return {
    medication: medMatch[1],
    raw: text,
    frequency_per_day: freqMatch ? parseInt(freqMatch[1]) : count,
    start_time: `${String(startHour).padStart(2,'0')}:${String(startMinute).padStart(2,'0')}`,
    interval_hours: intervalHours,
    times,
    instruction: `Minum ${count}x sehari, jam ${times.join(', ')}`
  };
}

// Mock OCR/LLM extraction — in production replace with real vision model
async function mockExtractFromFile(fileBuffer, fileName, mimetype) {
  // Simulate processing delay
  await new Promise(r => setTimeout(r, 300));

  // If filename contains hint, customize response for demo
  const isProdia = fileName && fileName.toLowerCase().includes('prodia');
  
  // Default mock based on spec
  return {
    clinic_name: isProdia ? "Klinik Prodia" : "Klinik Prodia",
    date: new Date().toISOString().split('T')[0],
    metrics: [
      { name: "Kolesterol", value: "190", unit: "mg/dL", status: "Normal" },
      { name: "Gula Darah", value: "110", unit: "mg/dL", status: "Waspada" },
      { name: "Asam Urat", value: "5.2", unit: "mg/dL", status: "Normal" },
    ],
    // Bonus: also parse medication example if present in future
    _note: "Mock extraction — ganti dengan LLM Vision di production"
  };
}

const extractMedicalRecord = async (request, reply) => {
  try {
    let fileBuffer = null;
    let fileName = 'upload.pdf';
    let mimetype = 'application/octet-stream';
    let medicationText = null;

    // Support both single file and parts iteration (robust for FE sending file + text fields)
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer();
        fileName = part.filename || fileName;
        mimetype = part.mimetype || mimetype;
      } else if (part.type === 'field') {
        if (part.fieldname === 'medication_text' || part.fieldname === 'text') {
          medicationText = part.value;
        }
      }
    }

    // Fallback: try request.file() if parts didn't yield file (for simple clients)
    if (!fileBuffer) {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: "File wajib diunggah. Kirim field 'file' sebagai multipart/form-data." });
      }
      fileBuffer = await data.toBuffer();
      fileName = data.filename || fileName;
      mimetype = data.mimetype || mimetype;
      if (data.fields && data.fields.medication_text) {
        medicationText = data.fields.medication_text.value;
      }
    }

    if (!fileBuffer) {
      return reply.code(400).send({ error: "File wajib diunggah. Kirim field 'file' sebagai multipart/form-data." });
    }

    // Validate file type
    if (!['image/jpeg','image/png','image/jpg','application/pdf','image/webp'].includes(mimetype) && !fileName.match(/\.(jpg|jpeg|png|pdf|webp)$/i)) {
      request.server.log.warn(`[MedicalRecord] Unknown mimetype ${mimetype} for ${fileName}, tetap proses mock`);
    }

    let medicationSchedule = null;
    if (medicationText) {
      medicationSchedule = parseMedicationSchedule(medicationText);
    }

    const extracted = await mockExtractFromFile(fileBuffer, fileName, mimetype);

    if (medicationSchedule) {
      extracted.medication_schedule = medicationSchedule;
    }

    return reply.send({
      data: extracted
    });

  } catch (err) {
    request.server.log.error(err);
    // If encryption/minio error not relevant here, just return 500
    return reply.code(500).send({ error: "Gagal mengekstrak rekam medis. Coba lagi." });
  }
};

const saveMedicalRecord = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { clinic_name, date, metrics, file_name, file_url, medication_schedule } = request.body;

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return reply.code(400).send({ error: "Field 'metrics' wajib array tidak kosong. Contoh: [{name, value, unit, status}]" });
    }

    // Validate metrics shape
    for (const m of metrics) {
      if (!m.name || !m.value) {
        return reply.code(400).send({ error: "Setiap metric wajib memiliki 'name' dan 'value'" });
      }
    }

    let parsedDate = null;
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) parsedDate = d;
    }

    const record = await request.server.prisma.medicalRecord.create({
      data: {
        user_id: userId,
        clinic_name: clinic_name || null,
        date: parsedDate,
        metrics: metrics,
        raw_data: request.body, // store full verified payload
        file_name: file_name || null,
        file_url: file_url || null,
      }
    });

    // Also optionally create/update medication schedule if provided (for Asisten Kesehatan)
    // For demo, store in PrivateNurse or just return — here we just log
    if (medication_schedule) {
      request.server.log.info(`[MedicalRecord] Medication schedule saved for user ${userId}: ${JSON.stringify(medication_schedule)}`);
    }

    return reply.code(201).send({
      message: "Rekam medis berhasil disimpan.",
      data: record
    });

  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({ error: "Gagal menyimpan rekam medis." });
  }
};

const getMedicalRecords = async (request, reply) => {
  try {
    const userId = request.user.id;
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      request.server.prisma.medicalRecord.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      request.server.prisma.medicalRecord.count({
        where: { user_id: userId }
      })
    ]);

    return reply.send({
      message: "Riwayat rekam medis berhasil diambil.",
      data: records,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 1
      }
    });

  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({ error: "Gagal mengambil riwayat rekam medis." });
  }
};

const getMedicalRecordById = async (request, reply) => {
  try {
    const { id } = request.params;
    const record = await request.server.prisma.medicalRecord.findFirst({
      where: { id, user_id: request.user.id }
    });
    if (!record) {
      return reply.code(404).send({ error: "Rekam medis tidak ditemukan." });
    }
    return reply.send({ data: record });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({ error: "Gagal mengambil detail rekam medis." });
  }
};

const deleteMedicalRecord = async (request, reply) => {
  try {
    const { id } = request.params;
    const existing = await request.server.prisma.medicalRecord.findFirst({
      where: { id, user_id: request.user.id }
    });
    if (!existing) {
      return reply.code(404).send({ error: "Rekam medis tidak ditemukan." });
    }
    await request.server.prisma.medicalRecord.delete({ where: { id } });
    return reply.send({ message: "Rekam medis berhasil dihapus." });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({ error: "Gagal menghapus rekam medis." });
  }
};

module.exports = {
  extractMedicalRecord,
  saveMedicalRecord,
  getMedicalRecords,
  getMedicalRecordById,
  deleteMedicalRecord,
  parseMedicationSchedule // exported for testing
};
