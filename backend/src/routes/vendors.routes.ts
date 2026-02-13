import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

const vendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// List vendors
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { search, isActive } = req.query;

  const where: any = {};

  // Organization scoping
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });
  if (userOrg) {
    where.organizationId = userOrg.organizationId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { contactName: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  const vendors = await prisma.vendor.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  res.json({ vendors });
});

// Get single vendor
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id: req.params.id },
    include: {
      purchaseOrders: {
        include: { project: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: { select: { purchaseOrders: true } },
    },
  });

  if (!vendor) {
    res.status(404).json({ error: 'Vendor not found' });
    return;
  }

  res.json(vendor);
});

// Create vendor
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const data = vendorSchema.parse(req.body);

  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });

  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const vendor = await prisma.vendor.create({
    data: {
      ...data,
      email: data.email || null,
      website: data.website || null,
      organizationId: userOrg.organizationId,
    },
  });

  res.status(201).json(vendor);
});

// Update vendor
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const data = vendorSchema.partial().parse(req.body);

  const existing = await prisma.vendor.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    res.status(404).json({ error: 'Vendor not found' });
    return;
  }

  const vendor = await prisma.vendor.update({
    where: { id: req.params.id },
    data: {
      ...data,
      email: data.email || null,
      website: data.website || null,
    },
  });

  res.json(vendor);
});

// Delete vendor
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.vendor.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { purchaseOrders: true } } },
  });

  if (!existing) {
    res.status(404).json({ error: 'Vendor not found' });
    return;
  }

  // Soft delete if has purchase orders
  if (existing._count.purchaseOrders > 0) {
    await prisma.vendor.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Vendor deactivated (has purchase orders)' });
  } else {
    await prisma.vendor.delete({ where: { id: req.params.id } });
    res.json({ message: 'Vendor deleted' });
  }
});

export default router;
