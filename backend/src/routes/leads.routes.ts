import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate, requireDesignerOrAdmin } from '../middleware/auth.js';
import { LeadStatus, ProjectType } from '@prisma/client';

const router = Router();

const createLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  projectType: z.nativeEnum(ProjectType).optional(),
  notes: z.string().optional().nullable(),
});

const updateLeadSchema = createLeadSchema.partial().extend({
  status: z.nativeEnum(LeadStatus).optional(),
});

// List leads
router.get('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { status, projectType, search, page = '1', limit = '20' } = req.query;

  const where: any = {};

  // Designers only see their own leads, admin sees all
  if (req.user!.role === 'designer') {
    where.designerId = req.user!.id;
  }

  if (status) {
    where.status = status as LeadStatus;
  }

  if (projectType) {
    where.projectType = projectType as ProjectType;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
      { phone: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        designer: { select: { id: true, name: true, email: true } },
        projects: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({
    leads,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
});

// Get single lead
router.get('/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      designer: { select: { id: true, name: true, email: true } },
      projects: {
        include: {
          estimates: { select: { id: true, version: true, status: true, total: true } },
        },
      },
    },
  });

  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  // Check access
  if (req.user!.role === 'designer' && lead.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(lead);
});

// Create lead
router.post('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const data = createLeadSchema.parse(req.body);

  const lead = await prisma.lead.create({
    data: {
      ...data,
      designerId: req.user!.id,
    },
    include: {
      designer: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json(lead);
});

// Update lead
router.put('/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const data = updateLeadSchema.parse(req.body);

  // Check access
  const existing = await prisma.lead.findUnique({
    where: { id: req.params.id },
    select: { designerId: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data,
    include: {
      designer: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(lead);
});

// Update lead status
router.patch('/:id/status', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.nativeEnum(LeadStatus) }).parse(req.body);

  const existing = await prisma.lead.findUnique({
    where: { id: req.params.id },
    select: { designerId: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: { status },
  });

  res.json(lead);
});

// Convert lead to project
router.post('/:id/convert', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
  });

  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  if (req.user!.role === 'designer' && lead.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Create project from lead
  const project = await prisma.$transaction(async (tx) => {
    let clientId: string | null = null;

    // If lead has email, create or find a client user
    if (lead.email) {
      // Check if user with this email already exists
      let clientUser = await tx.user.findUnique({
        where: { email: lead.email },
      });

      if (!clientUser) {
        // Create new client user from lead info
        clientUser = await tx.user.create({
          data: {
            email: lead.email,
            name: `${lead.firstName} ${lead.lastName}`,
            phone: lead.phone,
            role: 'client',
          },
        });
      }

      clientId = clientUser.id;
    }

    const project = await tx.project.create({
      data: {
        leadId: lead.id,
        designerId: lead.designerId,
        clientId,
        name: `${lead.firstName} ${lead.lastName} - ${lead.projectType}`,
        projectType: lead.projectType,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zip: lead.zip,
        notes: lead.notes,
      },
    });

    // Update lead status to won
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: 'won' },
    });

    return project;
  });

  res.status(201).json(project);
});

// Delete lead
router.delete('/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.lead.findUnique({
    where: { id: req.params.id },
    select: { designerId: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  await prisma.lead.delete({ where: { id: req.params.id } });

  res.json({ message: 'Lead deleted successfully' });
});

export default router;
