import { prisma } from "@/lib/prisma";

export async function listNotifications(
  userId: string,
  query: { page: number; pageSize: number; unreadOnly: boolean }
) {
  const where = { userId, ...(query.unreadOnly ? { isRead: false } : {}) };
  const [total, rows, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return {
    items: rows.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    unreadCount,
  };
}

export async function markNotificationRead(userId: string, id: string) {
  const result = await prisma.notification.updateMany({
    where: { id, userId, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
}
