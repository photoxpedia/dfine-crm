import { Router, Request, Response } from 'express';
import prisma from '../config/database.js';
import { authenticate, requireSuperAdmin, generateToken, AuthUser } from '../middleware/auth.js';

const router = Router();

// All routes require super admin
router.use(authenticate, requireSuperAdmin);

// ==================== PLATFORM STATS ====================

router.get('/stats', async (req: Request, res: Response) => {
  const [
    totalOrgs,
    totalUsers,
    totalProjects,
    totalLeads,
    activeSubscriptions,
    revenueResult,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.project.count(),
    prisma.lead.count(),
    prisma.organization.count({
      where: { subscriptionStatus: { in: ['active', 'trialing'] } },
    }),
    prisma.payment.aggregate({
      where: { status: 'completed' },
      _sum: { amount: true },
    }),
  ]);

  const totalRevenue = Number(revenueResult._sum.amount || 0);

  // Recent signups (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [newOrgsThisMonth, newUsersThisMonth] = await Promise.all([
    prisma.organization.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  res.json({
    totalOrgs,
    totalUsers,
    totalProjects,
    totalLeads,
    totalRevenue,
    activeSubscriptions,
    newOrgsThisMonth,
    newUsersThisMonth,
  });
});

// ==================== ORGANIZATION MANAGEMENT ====================

router.get('/organizations', async (req: Request, res: Response) => {
  const { search, plan, status, page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { slug: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (plan) {
    where.subscriptionPlan = plan as string;
  }

  if (status) {
    where.subscriptionStatus = status as string;
  }

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
            leads: true,
          },
        },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  res.json({
    organizations,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

router.get('/organizations/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
          },
        },
      },
      _count: {
        select: {
          projects: true,
          leads: true,
          subscriptions: true,
        },
      },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!organization) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  // Get project/lead stats
  const [projectStats, paymentStats] = await Promise.all([
    prisma.project.groupBy({
      by: ['status'],
      where: { organizationId: id },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { project: { organizationId: id }, status: 'completed' },
      _sum: { amount: true },
    }),
  ]);

  res.json({
    organization,
    projectStats,
    totalRevenue: Number(paymentStats._sum.amount || 0),
  });
});

router.put('/organizations/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, subscriptionPlan, subscriptionStatus } = req.body;

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (subscriptionPlan !== undefined) updateData.subscriptionPlan = subscriptionPlan;
  if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;

  const updated = await prisma.organization.update({
    where: { id },
    data: updateData,
  });

  res.json(updated);
});

// ==================== USER MANAGEMENT ====================

router.get('/users', async (req: Request, res: Response) => {
  const { search, role, isActive, page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role as string;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
        organizationMemberships: {
          include: {
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    users,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

router.put('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isActive, role } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Prevent deactivating yourself
  if (id === req.user!.id && isActive === false) {
    res.status(400).json({ error: 'Cannot deactivate your own account' });
    return;
  }

  const updateData: any = {};
  if (isActive !== undefined) updateData.isActive = isActive;
  if (role !== undefined) updateData.role = role;

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      isSuperAdmin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json(updated);
});

// Impersonate a user (generate JWT for support/debugging)
router.post('/users/:id/impersonate', async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true, isSuperAdmin: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (!user.isActive) {
    res.status(400).json({ error: 'Cannot impersonate inactive user' });
    return;
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  };

  const token = generateToken(authUser);

  res.json({ token, user: authUser });
});

export default router;
