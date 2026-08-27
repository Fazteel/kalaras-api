const { safetyQueue, withQueueTimeout } = require("../workers/safetyWorker");
const { sendWhatsAppMessage } = require("../utils/whatsapp");

// Pure JS Google Polyline decoder function
// Decodes polyline string to array of [longitude, latitude] coordinates (for Turf/GeoJSON compatibility)
function decodePolyline(str, precision = 5) {
  const factor = Math.pow(10, precision);
  let index = 0,
    lat = 0,
    lng = 0;
  const coordinates = [];

  while (index < str.length) {
    let byte,
      shift = 0,
      result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    coordinates.push([lng / factor, lat / factor]);
  }
  return coordinates;
}

const startSession = async (request, reply) => {
  let createdSessionId = null;
  try {
    const userId = request.user.id;
    const {
      duration_seconds,
      preset_label,
      transportMode,
      origin,
      destination,
      routePolyline,
      estimatedDurationSeconds,
      totalDistanceMeters,
      emergencyContacts
    } = request.body;

    if (
      !duration_seconds ||
      !Number.isInteger(duration_seconds) ||
      duration_seconds < 60 ||
      duration_seconds > 86400
    ) {
      return reply.code(400).send({
        error:
          "duration_seconds wajib integer antara 60 (1 menit) dan 86400 (24 jam).",
      });
    }

    const existingSession =
      await request.server.prisma.safetySession.findFirst({
        where: { user_id: userId, status: "active" },
      });

    if (existingSession) {
      return reply.code(409).send({
        error:
          "Anda sudah memiliki sesi Safety Mode yang sedang aktif. " +
          "Konfirmasi atau tunggu sesi sebelumnya selesai.",
        active_session_id: existingSession.id,
      });
    }

    const nowUtc = new Date();
    const expiresAtUtc = new Date(nowUtc.getTime() + duration_seconds * 1000);

    const session = await request.server.prisma.safetySession.create({
      data: {
        user_id: userId,
        duration_seconds,
        preset_label: preset_label || null,
        status: "active",
        started_at: nowUtc,
        expires_at: expiresAtUtc,
      },
    });
    createdSessionId = session.id;

    // 1. Simpan detailed session state ke Redis (dengan safe timeout)
    const sessionData = {
      sessionId: session.id,
      userId,
      status: "ACTIVE",
      transportMode: transportMode || null,
      origin: origin || null,
      destination: destination || null,
      routePolyline: routePolyline || null,
      totalDistanceMeters: totalDistanceMeters || null,
      estimatedDurationSeconds: estimatedDurationSeconds || null,
      emergencyContacts: emergencyContacts || null,
    };

    await withQueueTimeout(
      request.server.redis.set(`safety_session:${session.id}`, JSON.stringify(sessionData)),
      3000
    );
    await withQueueTimeout(
      request.server.redis.expire(`safety_session:${session.id}`, duration_seconds * 2),
      3000
    );

    // 2. Set heartbeat key di Redis dengan TTL 180 detik (3 menit)
    await withQueueTimeout(
      request.server.redis.set(`heartbeat:session:${session.id}`, "alive"),
      3000
    );
    await withQueueTimeout(
      request.server.redis.expire(`heartbeat:session:${session.id}`, 180),
      3000
    );

    // 3. Daftarkan delayed job ke BullMQ (Dead Man's Switch) dengan safe timeout 3 detik
    const job = await withQueueTimeout(
      safetyQueue.add(
        "deadman-check",
        {
          sessionId: session.id,
          userId,
        },
        {
          delay: duration_seconds * 1000,
          jobId: `safety-${session.id}`,
        }
      ),
      3000
    );

    request.server.log.info(
      `[Safety] Sesi ${session.id} dimulai. Timer: ${duration_seconds}s. Job: ${job.id}`
    );

    return reply.code(201).send({
      message: "Sesi Safety Mode berhasil dimulai. Timer deadman switch aktif.",
      data: {
        session_id: session.id,
        duration_seconds,
        started_at: session.started_at.toISOString(),
        expires_at: session.expires_at.toISOString(),
        bullmq_job_id: job.id,
        status: "active",
        heartbeatIntervalSeconds: 60,
        maxDisplacementMeters: 30
      },
    });
  } catch (err) {
    request.server.log.error(err);

    // Rollback session di DB jika inisialisasi antrean gagal agar user tidak stuck 409
    if (createdSessionId) {
      try {
        await request.server.prisma.safetySession.delete({
          where: { id: createdSessionId },
        });
        request.server.log.info(
          `[Safety] Rollback sesi ${createdSessionId} berhasil setelah kegagalan queue.`
        );
      } catch (rollbackErr) {
        request.server.log.warn(
          `[Safety] Gagal rollback sesi ${createdSessionId}: ${rollbackErr.message}`
        );
      }
    }

    if (
      err.code === "QUEUE_TIMEOUT" ||
      err.code === "ECONNREFUSED" ||
      err.message?.includes("ECONNREFUSED") ||
      err.message?.includes("timeout") ||
      err.message?.includes("QUEUE_TIMEOUT")
    ) {
      return reply.code(503).send({
        error:
          "Layanan antrean tidak merespons atau sedang offline. Silakan coba lagi nanti.",
      });
    }

    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat memulai sesi Safety Mode.",
    });
  }
};

const confirmSafe = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { session_id } = request.body;

    if (!session_id) {
      return reply.code(400).send({
        error: "session_id wajib diisi.",
      });
    }

    const session = await request.server.prisma.safetySession.findUnique({
      where: { id: session_id },
    });

    if (!session) {
      return reply.code(404).send({
        error: "Sesi tidak ditemukan.",
      });
    }

    if (session.user_id !== userId) {
      return reply.code(403).send({
        error: "Anda tidak memiliki akses ke sesi ini.",
      });
    }

    if (session.status !== "active" && session.status !== "critical") {
      return reply.code(409).send({
        error: `Sesi tidak dapat dikonfirmasi. Status saat ini: "${session.status}".`,
      });
    }

    const updatedSession = await request.server.prisma.safetySession.update({
      where: { id: session_id },
      data: {
        status: "confirmed",
        confirmed_at: new Date(),
      },
    });

    // 1. Hapus job dari antrean BullMQ (dengan timeout aman)
    const bullmqJobId = `safety-${session_id}`;
    try {
      const job = await withQueueTimeout(safetyQueue.getJob(bullmqJobId), 2000);
      if (job) {
        await withQueueTimeout(job.remove(), 2000);
        request.server.log.info(
          `[Safety] Job ${bullmqJobId} berhasil dihapus dari antrean Redis.`
        );
      }
    } catch (removeErr) {
      request.server.log.warn(
        `[Safety] Gagal menghapus job ${bullmqJobId}: ${removeErr.message}.`
      );
    }

    // 2. Hapus Redis State Keys (dengan timeout aman)
    try {
      await withQueueTimeout(request.server.redis.del(`safety_session:${session_id}`), 2000);
      await withQueueTimeout(request.server.redis.del(`heartbeat:session:${session_id}`), 2000);
      await withQueueTimeout(request.server.redis.del(`deviation_count:session:${session_id}`), 2000);
    } catch (redisDelErr) {
      request.server.log.warn(
        `[Safety] Gagal membersihkan Redis state keys: ${redisDelErr.message}`
      );
    }

    return reply.send({
      message:
        "Konfirmasi keselamatan berhasil. Timer deadman switch dibatalkan.",
      data: {
        session_id: updatedSession.id,
        status: updatedSession.status,
        confirmed_at: updatedSession.confirmed_at.toISOString(),
      },
    });
  } catch (err) {
    request.server.log.error(err);

    if (
      err.code === "QUEUE_TIMEOUT" ||
      err.code === "ECONNREFUSED" ||
      err.message?.includes("ECONNREFUSED") ||
      err.message?.includes("timeout") ||
      err.message?.includes("QUEUE_TIMEOUT")
    ) {
      return reply.code(503).send({
        error:
          "Layanan antrean tidak merespons atau sedang offline. Silakan coba lagi nanti.",
      });
    }

    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat mengkonfirmasi keselamatan.",
    });
  }
};

const updateLocation = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { latitude, longitude, is_out_of_route, session_id } = request.body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return reply.code(400).send({
        error:
          "latitude (-90 s/d 90) dan longitude (-180 s/d 180) wajib angka valid.",
      });
    }

    const locationLog = await request.server.prisma.locationLog.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        latitude,
        longitude,
        recorded_at: new Date(),
      },
      update: {
        latitude,
        longitude,
        recorded_at: new Date(),
      },
    });

    // Cari sesi aktif
    let activeSession = null;
    if (session_id) {
      activeSession = await request.server.prisma.safetySession.findFirst({
        where: {
          id: session_id,
          user_id: userId,
          status: "active",
        },
      });
    }

    if (!activeSession) {
      activeSession = await request.server.prisma.safetySession.findFirst({
        where: { user_id: userId, status: "active" },
        orderBy: { started_at: "desc" },
      });
    }

    // Refresh TTL Heartbeat Key jika ada sesi aktif
    if (activeSession) {
      try {
        await withQueueTimeout(
          request.server.redis.set(`heartbeat:session:${activeSession.id}`, "alive"),
          2000
        );
        await withQueueTimeout(
          request.server.redis.expire(`heartbeat:session:${activeSession.id}`, 180),
          2000
        );
      } catch (hbErr) {
        request.server.log.warn(`[Safety Heartbeat Refresh Error]: ${hbErr.message}`);
      }
    }

    // Kalkulasi Deviasi Jarak dengan Turf
    let deviationDistanceMeters = 0.0;
    let computedOutOfRoute = false;

    if (activeSession) {
      let sessionDataStr = null;
      try {
        sessionDataStr = await withQueueTimeout(
          request.server.redis.get(`safety_session:${activeSession.id}`),
          2000
        );
      } catch (redisErr) {
        request.server.log.warn(`[Safety Redis Get Error]: ${redisErr.message}`);
      }

      if (sessionDataStr) {
        try {
          const sessionData = JSON.parse(sessionDataStr);
          if (sessionData.routePolyline) {
            const turfHelpers = require("@turf/helpers");
            const pointToLineDistance = require("@turf/point-to-line-distance").default;

            const routeCoords = decodePolyline(sessionData.routePolyline);
            if (routeCoords.length >= 2) {
              const routeLine = turfHelpers.lineString(routeCoords);
              const userPoint = turfHelpers.point([longitude, latitude]);

              deviationDistanceMeters = pointToLineDistance(userPoint, routeLine, { units: 'meters' });

              // Evaluasi Threshold
              if (deviationDistanceMeters > 300) {
                // Deviasi kritis: Increment consecutive counter di Redis
                const countKey = `deviation_count:session:${activeSession.id}`;
                let countStr = "0";
                try {
                  countStr = (await withQueueTimeout(request.server.redis.get(countKey), 2000)) || "0";
                  const count = parseInt(countStr, 10) + 1;
                  await withQueueTimeout(request.server.redis.set(countKey, count.toString()), 2000);
                  await withQueueTimeout(request.server.redis.expire(countKey, 600), 2000); // Expiry 10 mnt
                  if (count >= 2) {
                    computedOutOfRoute = true;
                  }
                } catch (devCountErr) {
                  request.server.log.warn(`[Safety DevCount Error]: ${devCountErr.message}`);
                }
              } else {
                // Aman / Warning: Reset consecutive deviation counter
                try {
                  await withQueueTimeout(request.server.redis.del(`deviation_count:session:${activeSession.id}`), 2000);
                } catch (_) { }
              }
            }
          }
        } catch (turfErr) {
          request.server.log.error(`[Safety Turf Error]: ${turfErr.message}`);
        }
      }
    }

    const triggerEmergency = is_out_of_route || computedOutOfRoute;

    if (!triggerEmergency) {
      const isWarning = deviationDistanceMeters > 150 && deviationDistanceMeters <= 300;

      return reply.send({
        message: isWarning ? "Peringatan: Anda menjauh dari rute aman." : "Lokasi berhasil diperbarui.",
        data: {
          isSafe: true,
          deviationDistanceMeters: parseFloat(deviationDistanceMeters.toFixed(1)),
          isOutOfRoute: false,
          warning: isWarning ? "Anda menjauh dari rute aman" : null,
        },
      });
    }

    request.server.log.warn(
      `[Safety] 🚨 OUT_OF_ROUTE terdeteksi untuk user ${userId}! (Turf: ${computedOutOfRoute}, Client: ${is_out_of_route})`
    );

    if (activeSession) {
      await request.server.prisma.safetySession.update({
        where: { id: activeSession.id },
        data: { status: "critical" },
      });

      const bullmqJobId = `safety-${activeSession.id}`;
      try {
        const job = await withQueueTimeout(safetyQueue.getJob(bullmqJobId), 2000);
        if (job) await withQueueTimeout(job.remove(), 2000);
      } catch (removeErr) {
        request.server.log.warn(
          `[Safety] Gagal cleanup job ${bullmqJobId}: ${removeErr.message}`
        );
      }
    }

    const [pocketProfile, contacts] = await Promise.all([
      request.server.prisma.pocketProfile.findUnique({
        where: { user_id: userId },
        select: { full_name: true },
      }),
      request.server.prisma.emergencyContact.findMany({
        where: { user_id: userId },
        orderBy: { priority_order: "asc" },
      }),
    ]);

    const userName = pocketProfile?.full_name ?? "Pengguna Kala Esok";

    if (!contacts || contacts.length === 0) {
      return reply.code(400).send({
        error:
          "Deviasi rute terdeteksi, namun tidak ada kontak darurat terdaftar. " +
          "Sinyal darurat tidak dapat dikirim.",
      });
    }

    const now = new Date();
    const formattedTime = now.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " WIB";

    const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

    const emergencyMessage =
      `[🚨 PERINGATAN DEVIASI RUTE — Kala Esok]\n\n` +
      `${userName} terdeteksi menyimpang dari jalur yang direncanakan!\n\n` +
      `📍 Koordinat terakhir: ${latitude}, ${longitude}\n` +
      `🗺️ Buka di Google Maps: ${mapsUrl}\n` +
      `⏰ Waktu: ${formattedTime}\n\n` +
      `Segera hubungi yang bersangkutan untuk memastikan keselamatan mereka.`;

    const sendResults = await Promise.all(
      contacts.map((contact) =>
        sendWhatsAppMessage(contact.phone, emergencyMessage)
      )
    );

    const hasSuccess = sendResults.some((r) => r.success);
    const recipientsPayload = sendResults.map((result, idx) => ({
      name: contacts[idx].name,
      phone: contacts[idx].phone,
      chatId: result.chatId,
      delivered: result.success,
    }));

    await request.server.prisma.alertLog.create({
      data: {
        user_id: userId,
        alert_type: "ROUTE_DEVIATION_SOS",
        recipients: recipientsPayload,
        status: hasSuccess ? "sent" : "failed",
        triggered_at: new Date(),
        delivered_at: hasSuccess ? new Date() : null,
      },
    });

    return reply.send({
      message:
        "⚠️ Deviasi rute terdeteksi! Sinyal darurat telah dikirim ke semua kontak terdaftar.",
      data: {
        isSafe: false,
        deviationDistanceMeters: parseFloat(deviationDistanceMeters.toFixed(1)),
        isOutOfRoute: true,
        alert: {
          total_contacts: contacts.length,
          delivered: sendResults.filter((r) => r.success).length,
          failed: sendResults.filter((r) => !r.success).length,
          recipients: recipientsPayload,
        },
      },
    });
  } catch (err) {
    request.server.log.error(err);

    if (
      err.code === "QUEUE_TIMEOUT" ||
      err.code === "ECONNREFUSED" ||
      err.message?.includes("ECONNREFUSED") ||
      err.message?.includes("timeout") ||
      err.message?.includes("QUEUE_TIMEOUT")
    ) {
      return reply.code(503).send({
        error:
          "Layanan antrean tidak merespons atau sedang offline. Silakan coba lagi nanti.",
      });
    }

    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat memperbarui lokasi.",
    });
  }
};

const heartbeat = async (request, reply) => {
  try {
    const { session_id } = request.body;
    if (!session_id) {
      return reply.code(400).send({
        error: "session_id wajib diisi.",
      });
    }

    const session = await request.server.prisma.safetySession.findUnique({
      where: { id: session_id },
    });

    if (!session || (session.status !== "active" && session.status !== "critical")) {
      return reply.code(400).send({
        error: "Sesi tidak aktif atau tidak ditemukan.",
      });
    }

    // Reset TTL heartbeat key di Redis ke 180 detik (3 menit) dengan safe timeout
    try {
      await withQueueTimeout(
        request.server.redis.set(`heartbeat:session:${session_id}`, "alive"),
        2000
      );
      await withQueueTimeout(
        request.server.redis.expire(`heartbeat:session:${session_id}`, 180),
        2000
      );
    } catch (hbErr) {
      request.server.log.warn(`[Safety Heartbeat Error]: ${hbErr.message}`);
    }

    return reply.send({ acknowledged: true });
  } catch (err) {
    request.server.log.error(err);

    if (
      err.code === "QUEUE_TIMEOUT" ||
      err.code === "ECONNREFUSED" ||
      err.message?.includes("ECONNREFUSED") ||
      err.message?.includes("timeout") ||
      err.message?.includes("QUEUE_TIMEOUT")
    ) {
      return reply.code(503).send({
        error:
          "Layanan antrean tidak merespons atau sedang offline. Silakan coba lagi nanti.",
      });
    }

    return reply.code(500).send({
      error: "Terjadi kesalahan internal saat memproses heartbeat.",
    });
  }
};

module.exports = {
  startSession,
  confirmSafe,
  updateLocation,
  heartbeat,
};
