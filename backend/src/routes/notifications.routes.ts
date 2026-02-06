import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from '../services/notification.service.js';

const router = Router();

// Get user's notifications
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { unreadOnly = 'false', limit = '20' } = req.query;

  const notifications = await getUserNotifications(
    req.user!.id,
    unreadOnly === 'true',
    parseInt(limit as string)
  );

  res.json(notifications);
});

// Get unread count
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  const count = await getUnreadCount(req.user!.id);
  res.json({ count });
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
  const result = await markNotificationRead(req.params.id, req.user!.id);

  if (result.count === 0) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }

  res.json({ message: 'Notification marked as read' });
});

// Mark all notifications as read
router.patch('/read-all', authenticate, async (req: Request, res: Response) => {
  await markAllNotificationsRead(req.user!.id);
  res.json({ message: 'All notifications marked as read' });
});

// Delete a notification
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });

  if (!notification) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }

  await prisma.notification.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Notification deleted' });
});

export default router;
