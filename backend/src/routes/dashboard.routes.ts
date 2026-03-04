import { Router, Request, Response } from 'express';
import prisma from '../config/database.js';
import { authenticate, requireDesignerOrAdmin, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Get dashboard stats (admin only)
router.get('/stats', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: req.user!.id, isDefault: true },
    });

    if (!membership) {
      res.status(400).json({ error: 'User must belong to an organization' });
      return;
    }

    const organizationId = membership.organizationId;

    // Run all queries in parallel for performance
    const [activeProjects, totalRevenueResult, pendingPaymentsResult, activeDesigners] = await Promise.all([
      // Count active projects (approved or in_progress)
      prisma.project.count({
        where: {
          organizationId,
          status: { in: ['approved', 'in_progress'] },
        },
      }),

      // Sum of completed payments for projects in this org
      prisma.payment.aggregate({
        where: {
          status: 'completed',
          project: { organizationId },
        },
        _sum: { amount: true },
      }),

      // Sum of pending/invoiced payment schedules for projects in this org
      prisma.paymentSchedule.aggregate({
        where: {
          status: { in: ['pending', 'invoiced'] },
          project: { organizationId },
        },
        _sum: { amountDue: true },
      }),

      // Count active designers in the org
      prisma.organizationMember.count({
        where: {
          organizationId,
          user: {
            role: 'designer',
            isActive: true,
          },
        },
      }),
    ]);

    res.json({
      activeProjects,
      totalRevenue: Number(totalRevenueResult._sum.amount || 0),
      pendingPayments: Number(pendingPaymentsResult._sum.amountDue || 0),
      activeDesigners,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get upcoming follow-ups (next 7 days)
router.get('/followups', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const where: any = {
    followUpDate: {
      gte: now,
      lte: sevenDaysFromNow,
    },
    status: { in: ['on_hold', 'future_client'] },
  };

  // Designers only see their own leads
  if (req.user!.role === 'designer') {
    where.designerId = req.user!.id;
  }

  const followups = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      projectType: true,
      status: true,
      followUpDate: true,
      followUpReason: true,
      followUpReasonOther: true,
      designer: { select: { id: true, name: true } },
    },
    orderBy: { followUpDate: 'asc' },
  });

  // Group by date for the widget
  const grouped: Record<string, typeof followups> = {};
  for (const followup of followups) {
    if (followup.followUpDate) {
      const dateKey = followup.followUpDate.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(followup);
    }
  }

  res.json({
    followups,
    grouped,
    total: followups.length,
  });
});

// Get today's follow-ups (for highlighting in list)
router.get('/followups/today', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const where: any = {
    followUpDate: {
      gte: today,
      lt: tomorrow,
    },
  };

  if (req.user!.role === 'designer') {
    where.designerId = req.user!.id;
  }

  const todayFollowups = await prisma.lead.findMany({
    where,
    select: { id: true },
  });

  res.json({
    leadIds: todayFollowups.map(f => f.id),
    count: todayFollowups.length,
  });
});

// Get lead stats by status
router.get('/lead-stats', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const where: any = {};

  // Designers only see their own leads
  if (req.user!.role === 'designer') {
    where.designerId = req.user!.id;
  }

  // Get counts by status
  const statusCounts = await prisma.lead.groupBy({
    by: ['status'],
    where,
    _count: true,
  });

  // Get counts by project type
  const projectTypeCounts = await prisma.lead.groupBy({
    by: ['projectType'],
    where,
    _count: true,
  });

  // Calculate totals
  const total = statusCounts.reduce((sum, s) => sum + s._count, 0);
  const activeStatuses = ['new', 'contacted', 'pre_estimate', 'estimated'];
  const active = statusCounts
    .filter(s => activeStatuses.includes(s.status))
    .reduce((sum, s) => sum + s._count, 0);

  res.json({
    byStatus: statusCounts.map(s => ({
      status: s.status,
      count: s._count,
    })),
    byProjectType: projectTypeCounts.map(p => ({
      projectType: p.projectType,
      count: p._count,
    })),
    summary: {
      total,
      active,
      onHold: statusCounts.find(s => s.status === 'on_hold')?._count || 0,
      futureClient: statusCounts.find(s => s.status === 'future_client')?._count || 0,
      converted: statusCounts.find(s => s.status === 'converted')?._count || 0,
      dropped: statusCounts.find(s => s.status === 'dropped')?._count || 0,
    },
  });
});

// Get recent activity (for dashboard)
router.get('/recent-activity', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { limit = '10' } = req.query;

  // Get recent lead history
  const where: any = {};

  if (req.user!.role === 'designer') {
    where.lead = { designerId: req.user!.id };
  }

  const recentActivity = await prisma.leadHistory.findMany({
    where,
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true },
      },
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit as string),
  });

  res.json(recentActivity);
});

export default router;
