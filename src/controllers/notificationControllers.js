const getNotifications = async (request, reply) => {
  try {
    const { prisma } = request.server;
    const notifications = await prisma.notification.findMany({
      where: { user_id: request.user.id },
      orderBy: { created_at: "desc" },
    });

    const unreadCount = await prisma.notification.count({
      where: { user_id: request.user.id, is_read: false },
    });

    const mappedData = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      is_read: n.is_read,
      created_at: n.created_at.toISOString(),
    }));

    return reply.send({
      status: "success",
      unread_count: unreadCount,
      data: mappedData,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      status: "error",
      message: "Terjadi kesalahan internal saat mengambil notifikasi.",
    });
  }
};

const markAsRead = async (request, reply) => {
  const { id } = request.params;

  try {
    const { prisma } = request.server;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        user_id: request.user.id,
      },
    });

    if (!notification) {
      return reply.code(404).send({
        status: "error",
        message: "Notifikasi tidak ditemukan atau bukan milik Anda.",
      });
    }

    await prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });

    return reply.send({
      status: "success",
      message: "Notification marked as read",
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(500).send({
      status: "error",
      message: "Terjadi kesalahan internal saat memperbarui status notifikasi.",
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
};
