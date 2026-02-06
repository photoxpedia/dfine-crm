import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate, requireDesignerOrAdmin } from '../middleware/auth.js';
import { ProjectStatus, ProjectType } from '@prisma/client';

const router = Router();

const createProjectSchema = z.object({
  leadId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional().nullable(),
  projectType: z.nativeEnum(ProjectType).optional(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.nativeEnum(ProjectStatus).optional(),
  expectedLaborCost: z.number().optional().nullable(),
  actualLaborCost: z.number().optional().nullable(),
  projectManagerId: z.string().uuid().optional().nullable(),
});

// List projects
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { status, projectType, search, page = '1', limit = '20' } = req.query;

  const where: any = {};

  // Role-based filtering
  if (req.user!.role === 'designer') {
    where.designerId = req.user!.id;
  } else if (req.user!.role === 'client') {
    where.clientId = req.user!.id;
  }
  // Admin sees all

  if (status) {
    where.status = status as ProjectStatus;
  }

  if (projectType) {
    where.projectType = projectType as ProjectType;
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { lead: { firstName: { contains: search as string, mode: 'insensitive' } } },
      { lead: { lastName: { contains: search as string, mode: 'insensitive' } } },
    ];
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        designer: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        estimates: {
          where: { status: { in: ['approved', 'sent'] } },
          select: { id: true, total: true, status: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            documents: true,
            purchaseOrders: true,
            paymentSchedules: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
    prisma.project.count({ where }),
  ]);

  res.json({
    projects,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
});

// Get single project with full details
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      lead: true,
      designer: { select: { id: true, name: true, email: true, phone: true } },
      client: { select: { id: true, name: true, email: true } },
      projectManager: { select: { id: true, name: true, email: true } },
      estimates: {
        include: {
          sections: {
            include: { lineItems: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { version: 'desc' },
      },
      documents: {
        include: { signatures: true },
        orderBy: { createdAt: 'desc' },
      },
      materialItems: {
        include: { vendor: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      crewAssignments: {
        include: { crew: true },
      },
      paymentSchedules: {
        include: {
          payments: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { percentage: 'desc' },
      },
      laborLogs: {
        include: { crew: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        take: 10,
      },
    },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Check access
  if (req.user!.role === 'designer' && project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  if (req.user!.role === 'client' && project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(project);
});

// Create project
router.post('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const data = createProjectSchema.parse(req.body);

  const project = await prisma.project.create({
    data: {
      ...data,
      designerId: req.user!.id,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
    include: {
      designer: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json(project);
});

// Update project
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  const data = updateProjectSchema.parse(req.body);

  const existing = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { designerId: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Only admin and the assigned designer can update
  if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  if (req.user!.role === 'client') {
    res.status(403).json({ error: 'Clients cannot modify projects' });
    return;
  }

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
    include: {
      designer: { select: { id: true, name: true, email: true } },
      client: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(project);
});

// Update project status
router.patch('/:id/status', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.nativeEnum(ProjectStatus) }).parse(req.body);

  const existing = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { designerId: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { status },
  });

  res.json(project);
});

// Get project timeline/activity
router.get('/:id/timeline', authenticate, async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { id: true, designerId: true, clientId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Check access
  if (req.user!.role === 'designer' && project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  if (req.user!.role === 'client' && project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const activities = await prisma.activityLog.findMany({
    where: { projectId: project.id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json(activities);
});

// Delete project
router.delete('/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { designerId: true, status: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (req.user!.role !== 'admin' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Only allow deletion of draft projects
  if (existing.status !== 'draft') {
    res.status(400).json({ error: 'Only draft projects can be deleted' });
    return;
  }

  await prisma.project.delete({ where: { id: req.params.id } });

  res.json({ message: 'Project deleted successfully' });
});

export default router;
