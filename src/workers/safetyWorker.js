const { Queue, Worker } = require("bullmq");
const { PrismaClient } = require("@prisma/client");
const { sendWhatsAppMessage } = require("../utils/whatsapp");

const prisma = new PrismaClient();

const formatWIB = (date) => {
  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }) + " WIB";
};

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  maxRetriesPerRequest: null,
};

const safetyQueue = new Queue("safety-timer", {
  connection: REDIS_CONNECTION,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 50,
    attempts: 1,
  },
});

const safetyWorker = new Worker(
  "safety-timer",
  async (job) => {
    const { sessionId, userId } = job.data;

    const session = await prisma.safetySession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return;
    if (session.status !== "active") return;

    await prisma.safetySession.update({
      where: { id: sessionId },
      data: { status: "expired" },
    });

    const [pocketProfile, contacts, lastLocation] = await Promise.all([
      prisma.pocketProfile.findUnique({
        where: { user_id: userId },
        select: { full_name: true },
      }),
      prisma.emergencyContact.findMany({
        where: { user_id: userId },
        orderBy: { priority_order: "asc" },
      }),
      prisma.locationLog.findUnique({
        where: { user_id: userId },
      }),
    ]);

    const userName = pocketProfile?.full_name ?? "Pengguna Kala Esok";

    if (!contacts || contacts.length === 0) {
      await prisma.alertLog.create({
        data: {
          user_id: userId,
          alert_type: "AUTO_SOS",
          recipients: [],
          status: "failed_no_contacts",
          triggered_at: new Date(),
          delivered_at: null,
        },
      });
      return;
    }

    const now = new Date();

    let locationBlock = "📍 Lokasi terakhir: Tidak tersedia";
    if (lastLocation) {
      const mapsUrl = `https://maps.google.com/?q=${lastLocation.latitude},${lastLocation.longitude}`;
      locationBlock =
        `📍 Lokasi terakhir: ${lastLocation.latitude}, ${lastLocation.longitude}\n` +
        `🗺️ Buka di Google Maps: ${mapsUrl}\n` +
        `🕐 Waktu lokasi tercatat: ${formatWIB(lastLocation.recorded_at)}`;
    }

    const emergencyMessage =
      `[⚠️ SINYAL DARURAT OTOMATIS — Kala Esok]\n\n` +
      `${userName} TIDAK mengkonfirmasi keselamatan dalam waktu yang ditentukan.\n\n` +
      `Sistem mendeteksi kemungkinan situasi darurat. ` +
      `Segera hubungi yang bersangkutan dan pastikan keadaan mereka.\n\n` +
      `${locationBlock}\n\n` +
      `⏰ Waktu pemicu: ${formatWIB(now)}`;

    const sendResults = await Promise.all(
      contacts.map((contact) =>
        sendWhatsAppMessage(contact.phone, emergencyMessage)
      )
    );

    const hasSuccess = sendResults.some((r) => r.success);
    const overallStatus = hasSuccess ? "sent" : "failed";

    const recipientsPayload = sendResults.map((result, idx) => ({
      name: contacts[idx].name,
      phone: contacts[idx].phone,
      chatId: result.chatId,
      delivered: result.success,
    }));

    await prisma.alertLog.create({
      data: {
        user_id: userId,
        alert_type: "AUTO_SOS",
        recipients: recipientsPayload,
        status: overallStatus,
        triggered_at: new Date(),
        delivered_at: hasSuccess ? new Date() : null,
      },
    });
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 5,
  }
);

safetyWorker.on("completed", (job) => {
  console.log(`[SafetyWorker] Job ${job.id} selesai diproses.`);
});

safetyWorker.on("failed", (job, err) => {
  console.error(`[SafetyWorker] Job ${job?.id} GAGAL: ${err.message}`);
});

safetyWorker.on("error", (err) => {
  console.error(`[SafetyWorker] Worker error: ${err.message}`);
});

module.exports = { safetyQueue, safetyWorker, prisma };
