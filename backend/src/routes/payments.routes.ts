import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate, requireDesignerOrAdmin } from '../middleware/auth.js';
import { PaymentMilestone, PaymentStatus } from '@prisma/client';

const router = Router();

const PAYMENT_MILESTONES: { milestone: PaymentMilestone; percentage: number }[] = [
  { milestone: 'contract_signing', percentage: 30 },
  { milestone: 'project_start', percentage: 30 },
  { milestone: 'midpoint', percentage: 30 },
  { milestone: 'completion', percentage: 10 },
];

// Get payment schedule for a project
router.get('/schedule/:projectId', authenticate, async (req: Request, res: Response) => {
  const { projectId } = req.params;

  // Check access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true, clientId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (req.user!.role === 'client' && project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const schedules = await prisma.paymentSchedule.findMany({
    where: { projectId },
    orderBy: { milestone: 'asc' },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Calculate summary
  let totalDue = 0;
  let totalPaid = 0;

  for (const schedule of schedules) {
    totalDue += Number(schedule.amountDue);
    const paidAmount = schedule.payments
      .filter((p: { status: string }) => p.status === 'completed')
      .reduce((sum: number, p: { amount: any }) => sum + Number(p.amount), 0);
    totalPaid += paidAmount;
  }

  const summary = {
    totalDue,
    totalPaid,
    totalRemaining: totalDue - totalPaid,
  };

  res.json({ schedules, summary });
});

// Generate payment schedule for a project
router.post('/schedule/:projectId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      estimates: {
        where: { status: 'approved' },
        orderBy: { approvedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Check if schedule already exists
  const existingSchedule = await prisma.paymentSchedule.count({
    where: { projectId },
  });

  if (existingSchedule > 0) {
    res.status(400).json({ error: 'Payment schedule already exists for this project' });
    return;
  }

  // Get total from approved estimate
  const approvedEstimate = project.estimates[0];
  if (!approvedEstimate) {
    res.status(400).json({ error: 'No approved estimate found for this project' });
    return;
  }

  const total = Number(approvedEstimate.total);

  // Create payment schedule
  const scheduleItems = await Promise.all(
    PAYMENT_MILESTONES.map(({ milestone, percentage }) =>
      prisma.paymentSchedule.create({
        data: {
          projectId,
          milestone,
          percentage,
          amountDue: total * (percentage / 100),
          status: 'pending',
        },
      })
    )
  );

  res.status(201).json({ schedule: scheduleItems });
});

// Record a payment
router.post('/', authenticate, async (req: Request, res: Response) => {
  const { scheduleId, projectId, amount, paymentMethod, notes } = req.body;

  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientId: true, designerId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Only client or admin/designer can record payment
  if (req.user!.role === 'client' && project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const payment = await prisma.payment.create({
    data: {
      scheduleId,
      projectId,
      amount,
      paymentMethod,
      notes,
      status: 'pending',
    },
  });

  res.status(201).json(payment);
});

// Update payment status (mark as completed, etc.)
router.patch('/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { status, paidAt } = req.body;

  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
  });

  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  const updateData: any = { status };
  if (status === 'completed' && !payment.paidAt) {
    updateData.paidAt = paidAt ? new Date(paidAt) : new Date();
  }

  const updated = await prisma.payment.update({
    where: { id: req.params.id },
    data: updateData,
  });

  // Update schedule status if payment completed
  if (status === 'completed' && payment.scheduleId) {
    const schedule = await prisma.paymentSchedule.findUnique({
      where: { id: payment.scheduleId },
    });

    if (schedule) {
      // Sum all completed payments for this schedule
      const completedPayments = await prisma.payment.aggregate({
        where: {
          scheduleId: payment.scheduleId,
          status: 'completed',
        },
        _sum: { amount: true },
      });

      const totalPaid = Number(completedPayments._sum.amount || 0);
      const amountDue = Number(schedule.amountDue);

      if (totalPaid >= amountDue) {
        await prisma.paymentSchedule.update({
          where: { id: payment.scheduleId },
          data: { status: 'completed' },
        });
      }
    }
  }

  res.json(updated);
});

// Get all payments (admin view)
router.get('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, status, page = '1', limit = '20' } = req.query;

  const where: any = {};
  if (projectId) where.projectId = projectId as string;
  if (status) where.status = status as PaymentStatus;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        schedule: { select: { milestone: true, amountDue: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({
    payments,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// Get payment details
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: {
      project: {
        select: { id: true, name: true, clientId: true, designerId: true },
      },
      schedule: true,
    },
  });

  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  // Check access
  if (req.user!.role === 'client' && payment.project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(payment);
});

export default router;
