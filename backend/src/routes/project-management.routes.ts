import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import prisma from '../config/database.js';
import { authenticate, requireDesignerOrAdmin } from '../middleware/auth.js';
import { TaskStatus, TaskPriority, ChangeOrderStatus, Prisma } from '@prisma/client';
import { uploadProjectPhotos, getRelativePath, getFullPath } from '../config/upload.js';
import * as invoiceService from '../services/invoice.service.js';
import { createNotification } from '../services/notification.service.js';

const router = Router();

// ==================== TASKS ====================

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().uuid().optional(),
  assigneeType: z.enum(['user', 'crew']).optional(),
  dueDate: z.string().datetime().optional(),
  parentId: z.string().uuid().optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  sortOrder: z.number().optional(),
  completedAt: z.string().datetime().optional().nullable(),
});

// List tasks for a project
router.get('/:projectId/tasks', authenticate, async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { status, priority, parentOnly } = req.query;

  // Check project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true, clientId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (
    req.user!.role === 'designer' && project.designerId !== req.user!.id ||
    req.user!.role === 'client' && project.clientId !== req.user!.id
  ) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const where: any = { projectId };
  if (status) where.status = status as TaskStatus;
  if (priority) where.priority = priority as TaskPriority;
  if (parentOnly === 'true') where.parentId = null;

  const tasks = await prisma.projectTask.findMany({
    where,
    include: {
      subtasks: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  // Calculate summary
  const allTasks = await prisma.projectTask.findMany({
    where: { projectId },
    select: { status: true },
  });

  const summary = {
    total: allTasks.length,
    pending: allTasks.filter((t) => t.status === 'pending').length,
    inProgress: allTasks.filter((t) => t.status === 'in_progress').length,
    completed: allTasks.filter((t) => t.status === 'completed').length,
    blocked: allTasks.filter((t) => t.status === 'blocked').length,
  };

  res.json({ tasks, summary });
});

// Create task
router.post('/:projectId/tasks', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId } = req.params;

  const result = createTaskSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  // Check project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (req.user!.role === 'designer' && project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Get max sort order
  const maxOrder = await prisma.projectTask.aggregate({
    where: { projectId, parentId: result.data.parentId || null },
    _max: { sortOrder: true },
  });

  const task = await prisma.projectTask.create({
    data: {
      projectId,
      ...result.data,
      dueDate: result.data.dueDate ? new Date(result.data.dueDate) : null,
      sortOrder: (maxOrder._max.sortOrder || 0) + 1,
    },
    include: {
      subtasks: true,
    },
  });

  res.status(201).json(task);
});

// Update task
router.put('/:projectId/tasks/:taskId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, taskId } = req.params;

  const result = updateTaskSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    include: { project: { select: { designerId: true } } },
  });

  if (!task || task.projectId !== projectId) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  if (req.user!.role === 'designer' && task.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const updateData: any = { ...result.data };

  // Handle status change to completed
  if (result.data.status === 'completed' && task.status !== 'completed') {
    updateData.completedAt = new Date();
  } else if (result.data.status && result.data.status !== 'completed' && task.status === 'completed') {
    updateData.completedAt = null;
  }

  if (result.data.dueDate) {
    updateData.dueDate = new Date(result.data.dueDate);
  }
  if (result.data.completedAt) {
    updateData.completedAt = new Date(result.data.completedAt);
  }

  const updated = await prisma.projectTask.update({
    where: { id: taskId },
    data: updateData,
    include: {
      subtasks: true,
    },
  });

  res.json(updated);
});

// Delete task
router.delete('/:projectId/tasks/:taskId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, taskId } = req.params;

  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    include: { project: { select: { designerId: true } } },
  });

  if (!task || task.projectId !== projectId) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  if (req.user!.role === 'designer' && task.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Delete subtasks first
  await prisma.projectTask.deleteMany({
    where: { parentId: taskId },
  });

  await prisma.projectTask.delete({
    where: { id: taskId },
  });

  res.json({ message: 'Task deleted' });
});

// Reorder tasks
router.post('/:projectId/tasks/reorder', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { tasks } = req.body;

  if (!Array.isArray(tasks)) {
    res.status(400).json({ error: 'Tasks array is required' });
    return;
  }

  // Check project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (req.user!.role === 'designer' && project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Update sort orders
  await Promise.all(
    tasks.map((task: { id: string; sortOrder: number }) =>
      prisma.projectTask.update({
        where: { id: task.id },
        data: { sortOrder: task.sortOrder },
      })
    )
  );

  res.json({ message: 'Tasks reordered' });
});

// ==================== DAILY LOGS ====================

const createDailyLogSchema = z.object({
  date: z.string().datetime(),
  crewId: z.string().uuid().optional(),
  summary: z.string().min(1, 'Summary is required'),
  workCompleted: z.string().optional(),
  issues: z.string().optional(),
  weather: z.string().optional(),
  photoUrls: z.array(z.string().url()).optional(),
  hoursWorked: z.number().min(0).optional(),
});

const updateDailyLogSchema = createDailyLogSchema.partial();

// List daily logs for a project
router.get('/:projectId/daily-logs', authenticate, async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { startDate, endDate, crewId, page = '1', limit = '20' } = req.query;

  // Check project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true, clientId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (
    req.user!.role === 'designer' && project.designerId !== req.user!.id ||
    req.user!.role === 'client' && project.clientId !== req.user!.id
  ) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const where: any = { projectId };
  if (startDate) where.date = { ...where.date, gte: new Date(startDate as string) };
  if (endDate) where.date = { ...where.date, lte: new Date(endDate as string) };
  if (crewId) where.crewId = crewId as string;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    prisma.dailyLog.findMany({
      where,
      include: {
        crew: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.dailyLog.count({ where }),
  ]);

  // Calculate total hours
  const totalHours = await prisma.dailyLog.aggregate({
    where: { projectId },
    _sum: { hoursWorked: true },
  });

  res.json({
    logs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
    totalHours: totalHours._sum.hoursWorked ? Number(totalHours._sum.hoursWorked) : 0,
  });
});

// Create daily log
router.post('/:projectId/daily-logs', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId } = req.params;

  const result = createDailyLogSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  // Check project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (req.user!.role === 'designer' && project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const log = await prisma.dailyLog.create({
    data: {
      projectId,
      date: new Date(result.data.date),
      crewId: result.data.crewId || null,
      summary: result.data.summary,
      workCompleted: result.data.workCompleted || null,
      issues: result.data.issues || null,
      weather: result.data.weather || null,
      photoUrls: result.data.photoUrls ? result.data.photoUrls : Prisma.JsonNull,
      hoursWorked: result.data.hoursWorked || null,
      createdById: req.user!.id,
    },
    include: {
      crew: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(log);
});

// Update daily log
router.put('/:projectId/daily-logs/:logId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, logId } = req.params;

  const result = updateDailyLogSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const log = await prisma.dailyLog.findUnique({
    where: { id: logId },
    include: { project: { select: { designerId: true } } },
  });

  if (!log || log.projectId !== projectId) {
    res.status(404).json({ error: 'Daily log not found' });
    return;
  }

  if (req.user!.role === 'designer' && log.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const updateData: any = { ...result.data };
  if (result.data.date) {
    updateData.date = new Date(result.data.date);
  }

  const updated = await prisma.dailyLog.update({
    where: { id: logId },
    data: updateData,
    include: {
      crew: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  res.json(updated);
});

// Delete daily log
router.delete('/:projectId/daily-logs/:logId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, logId } = req.params;

  const log = await prisma.dailyLog.findUnique({
    where: { id: logId },
    include: { project: { select: { designerId: true } } },
  });

  if (!log || log.projectId !== projectId) {
    res.status(404).json({ error: 'Daily log not found' });
    return;
  }

  if (req.user!.role === 'designer' && log.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  await prisma.dailyLog.delete({
    where: { id: logId },
  });

  res.json({ message: 'Daily log deleted' });
});

// ==================== CHANGE ORDERS ====================

const createChangeOrderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  reason: z.string().optional(),
  costImpact: z.number().optional(),
  scheduleImpact: z.string().optional(),
});

// List change orders for a project
router.get('/:projectId/change-orders', authenticate, async (req: Request, res: Response) => {
  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true, clientId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (
    req.user!.role === 'designer' && project.designerId !== req.user!.id ||
    req.user!.role === 'client' && project.clientId !== req.user!.id
  ) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const changeOrders = await prisma.changeOrder.findMany({
    where: { projectId },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalCostImpact = changeOrders
    .filter((co) => co.status === 'approved')
    .reduce((sum, co) => sum + Number(co.costImpact), 0);

  res.json({ changeOrders, totalCostImpact });
});

// Create change order
router.post('/:projectId/change-orders', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId } = req.params;

  const result = createChangeOrderSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (req.user!.role === 'designer' && project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const changeOrder = await prisma.changeOrder.create({
    data: {
      projectId,
      createdById: req.user!.id,
      title: result.data.title,
      description: result.data.description,
      reason: result.data.reason || null,
      costImpact: result.data.costImpact || 0,
      scheduleImpact: result.data.scheduleImpact || null,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(changeOrder);
});

// Update change order status
router.patch('/:projectId/change-orders/:coId/status', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, coId } = req.params;
  const { status, rejectionNote } = req.body;

  const changeOrder = await prisma.changeOrder.findFirst({
    where: { id: coId, projectId },
    include: { project: { select: { designerId: true } } },
  });

  if (!changeOrder) {
    res.status(404).json({ error: 'Change order not found' });
    return;
  }

  const updateData: any = { status };

  if (status === 'pending_approval') {
    updateData.submittedAt = new Date();
  } else if (status === 'approved') {
    updateData.approvedAt = new Date();
    updateData.approvedBy = req.user!.name || req.user!.email;
  } else if (status === 'rejected') {
    updateData.rejectedAt = new Date();
    updateData.rejectionNote = rejectionNote || null;
  }

  const updated = await prisma.changeOrder.update({
    where: { id: coId },
    data: updateData,
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  // When a change order is approved with a cost impact, create a payment schedule entry and invoice
  if (status === 'approved' && Number(updated.costImpact) > 0) {
    try {
      const newSchedule = await prisma.paymentSchedule.create({
        data: {
          projectId,
          milestone: 'change_order',
          percentage: 100,
          amountDue: Number(updated.costImpact),
          status: 'pending',
        },
      });

      // Auto-create an invoice for the new change order payment schedule
      await invoiceService.createInvoiceFromSchedule(newSchedule.id);
    } catch (error) {
      console.error('Error creating payment schedule for change order:', error);
    }
  }

  // Notify relevant users about change order status changes
  const notificationType = status === 'pending_approval'
    ? 'change_order_submitted'
    : status === 'approved'
    ? 'change_order_approved'
    : status === 'rejected'
    ? 'change_order_rejected'
    : null;

  if (notificationType) {
    const statusLabel = status === 'pending_approval' ? 'submitted for approval' : status;
    // Notify the designer if someone else changed the status
    if (changeOrder.project.designerId && changeOrder.project.designerId !== req.user!.id) {
      createNotification({
        userId: changeOrder.project.designerId,
        type: notificationType as any,
        title: `Change Order ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`,
        message: `Change order "${updated.title}" has been ${statusLabel}`,
        entityType: 'project',
        entityId: projectId,
      }).catch(err => console.error('Notification failed:', err));
    }
    // Notify the change order creator if someone else changed the status
    if (updated.createdBy.id !== req.user!.id && updated.createdBy.id !== changeOrder.project.designerId) {
      createNotification({
        userId: updated.createdBy.id,
        type: notificationType as any,
        title: `Change Order ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`,
        message: `Change order "${updated.title}" has been ${statusLabel}`,
        entityType: 'project',
        entityId: projectId,
      }).catch(err => console.error('Notification failed:', err));
    }
  }

  res.json(updated);
});

// Delete change order (drafts only)
router.delete('/:projectId/change-orders/:coId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, coId } = req.params;

  const changeOrder = await prisma.changeOrder.findFirst({
    where: { id: coId, projectId },
    include: { project: { select: { designerId: true } } },
  });

  if (!changeOrder) {
    res.status(404).json({ error: 'Change order not found' });
    return;
  }

  if (changeOrder.status !== 'draft') {
    res.status(400).json({ error: 'Can only delete draft change orders' });
    return;
  }

  await prisma.changeOrder.delete({ where: { id: coId } });
  res.json({ message: 'Change order deleted' });
});

// ==================== PROJECT PHOTOS ====================

// List photos for a project
router.get('/:projectId/photos', authenticate, async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { folder } = req.query;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true, clientId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (
    req.user!.role === 'designer' && project.designerId !== req.user!.id ||
    req.user!.role === 'client' && project.clientId !== req.user!.id
  ) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const where: any = { projectId };
  if (folder) where.folder = folder as string;

  const photos = await prisma.projectPhoto.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: [{ folder: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  // Group by folder for summary
  const folderCounts: Record<string, number> = {};
  for (const photo of photos) {
    folderCounts[photo.folder] = (folderCounts[photo.folder] || 0) + 1;
  }

  res.json({ photos, folderCounts });
});

// Upload photos to a project
router.post(
  '/:projectId/photos',
  authenticate,
  requireDesignerOrAdmin,
  uploadProjectPhotos.array('photos', 20),
  async (req: Request, res: Response) => {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { designerId: true },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (req.user!.role === 'designer' && project.designerId !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const folder = req.body.folder || 'general';
    const caption = req.body.caption || null;

    const photos = await Promise.all(
      files.map(async (file) => {
        return prisma.projectPhoto.create({
          data: {
            projectId,
            userId: req.user!.id,
            filePath: getRelativePath(file.path),
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            folder,
            caption,
          },
          include: {
            user: { select: { id: true, name: true } },
          },
        });
      })
    );

    res.status(201).json(photos);
  }
);

// Delete a project photo
router.delete('/:projectId/photos/:photoId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, photoId } = req.params;

  const photo = await prisma.projectPhoto.findFirst({
    where: { id: photoId, projectId },
    include: { project: { select: { designerId: true } } },
  });

  if (!photo) {
    res.status(404).json({ error: 'Photo not found' });
    return;
  }

  if (req.user!.role === 'designer' && photo.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Delete file from disk
  try {
    const fullPath = getFullPath(photo.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting photo file:', error);
  }

  await prisma.projectPhoto.delete({ where: { id: photoId } });

  res.json({ message: 'Photo deleted' });
});

export default router;
