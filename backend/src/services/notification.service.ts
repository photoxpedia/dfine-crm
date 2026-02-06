import prisma from '../config/database.js';
import { NotificationType, Prisma } from '@prisma/client';
import { sendEmail } from '../config/email.js';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  data?: Record<string, any>;
  sendEmailNotification?: boolean;
  emailSubject?: string;
  emailBody?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      data: params.data ?? Prisma.JsonNull,
    },
  });

  // Send email if requested
  if (params.sendEmailNotification) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true, name: true },
    });

    if (user?.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: params.emailSubject || params.title,
          html: params.emailBody || `<p>${params.message}</p>`,
        });
      } catch (error) {
        console.error('Failed to send notification email:', error);
      }
    }
  }

  return notification;
}

export async function getUserNotifications(userId: string, unreadOnly = false, limit = 20) {
  const where: any = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function markNotificationRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
