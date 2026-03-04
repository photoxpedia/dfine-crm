import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate, requireAdmin, requireDesignerOrAdmin } from '../middleware/auth.js';

const router = Router();

const createCrewSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  leadMemberName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().nullable(),
  specialty: z.string().optional(),
  hourlyRate: z.number().min(0).optional(),
  dailyRate: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const updateCrewSchema = createCrewSchema.partial();

// List crews
router.get('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { search, specialty, isActive } = req.query;

  const where: any = {};

  // Organization scoping
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });
  if (userOrg) {
    where.organizationId = userOrg.organizationId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  if (specialty) {
    where.specialty = { contains: specialty as string, mode: 'insensitive' };
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { leadMemberName: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const crews = await prisma.crew.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { assignments: true },
      },
    },
  });

  res.json({ crews });
});

// Get single crew
router.get('/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  // Get user's org
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const crew = await prisma.crew.findFirst({
    where: { id: req.params.id, organizationId: userOrg.organizationId },
    include: {
      assignments: {
        include: {
          project: {
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { startDate: 'desc' },
        take: 10,
      },
      laborLogs: {
        orderBy: { date: 'desc' },
        take: 20,
      },
    },
  });

  if (!crew) {
    res.status(404).json({ error: 'Crew not found' });
    return;
  }

  res.json(crew);
});

// Create crew
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const data = createCrewSchema.parse(req.body);

  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });

  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const crew = await prisma.crew.create({
    data: {
      name: data.name,
      leadMemberName: data.leadMemberName,
      phone: data.phone,
      email: data.email,
      specialty: data.specialty,
      hourlyRate: data.hourlyRate,
      dailyRate: data.dailyRate,
      notes: data.notes,
      organizationId: userOrg.organizationId,
    },
  });

  res.status(201).json(crew);
});

// Update crew
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const data = updateCrewSchema.parse(req.body);

  // Get user's org
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const existing = await prisma.crew.findFirst({
    where: { id: req.params.id, organizationId: userOrg.organizationId },
  });

  if (!existing) {
    res.status(404).json({ error: 'Crew not found' });
    return;
  }

  const crew = await prisma.crew.update({
    where: { id: req.params.id },
    data,
  });

  res.json(crew);
});

// Toggle crew active status
router.patch('/:id/toggle-active', authenticate, requireAdmin, async (req: Request, res: Response) => {
  // Get user's org
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const existing = await prisma.crew.findFirst({
    where: { id: req.params.id, organizationId: userOrg.organizationId },
  });

  if (!existing) {
    res.status(404).json({ error: 'Crew not found' });
    return;
  }

  const crew = await prisma.crew.update({
    where: { id: req.params.id },
    data: { isActive: !existing.isActive },
  });

  res.json(crew);
});

// Delete crew
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  // Get user's org
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const existing = await prisma.crew.findFirst({
    where: { id: req.params.id, organizationId: userOrg.organizationId },
    include: { _count: { select: { assignments: true, laborLogs: true } } },
  });

  if (!existing) {
    res.status(404).json({ error: 'Crew not found' });
    return;
  }

  if (existing._count.assignments > 0 || existing._count.laborLogs > 0) {
    // Soft delete by deactivating
    await prisma.crew.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Crew deactivated (has assignments/logs)' });
    return;
  }

  await prisma.crew.delete({ where: { id: req.params.id } });
  res.json({ message: 'Crew deleted' });
});

// Assign crew to project
router.post('/:id/assign', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, role, startDate, endDate, notes } = req.body;

  // Get user's org
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const crew = await prisma.crew.findFirst({ where: { id: req.params.id, organizationId: userOrg.organizationId } });
  if (!crew) {
    res.status(404).json({ error: 'Crew not found' });
    return;
  }

  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: userOrg.organizationId } });
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Check for overlapping assignments (double-book prevention)
  if (startDate && endDate) {
    const overlapping = await prisma.crewAssignment.findFirst({
      where: {
        crewId: req.params.id,
        AND: [
          { startDate: { lte: new Date(endDate) } },
          { endDate: { gte: new Date(startDate) } },
        ],
      },
      include: { project: { select: { name: true } } },
    });
    if (overlapping) {
      const overlapStart = overlapping.startDate
        ? overlapping.startDate.toLocaleDateString()
        : 'N/A';
      const overlapEnd = overlapping.endDate
        ? overlapping.endDate.toLocaleDateString()
        : 'N/A';
      res.status(409).json({
        error: `Crew is already assigned to "${overlapping.project.name}" from ${overlapStart} to ${overlapEnd}`,
      });
      return;
    }
  }

  const assignment = await prisma.crewAssignment.create({
    data: {
      crewId: req.params.id,
      projectId,
      role,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      notes,
    },
    include: {
      crew: true,
      project: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(assignment);
});

// Log labor for crew
router.post('/:id/labor', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, date, hoursWorked, description } = req.body;

  // Get user's org
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const crew = await prisma.crew.findFirst({ where: { id: req.params.id, organizationId: userOrg.organizationId } });
  if (!crew) {
    res.status(404).json({ error: 'Crew not found' });
    return;
  }

  const hourlyRate = crew.hourlyRate ? Number(crew.hourlyRate) : 0;
  const cost = hoursWorked * hourlyRate;

  const laborLog = await prisma.laborLog.create({
    data: {
      crewId: req.params.id,
      projectId,
      date: new Date(date),
      hoursWorked,
      description,
      cost,
    },
  });

  res.status(201).json(laborLog);
});

export default router;
