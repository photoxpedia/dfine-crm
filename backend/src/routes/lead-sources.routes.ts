import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate, requireAdmin, requireDesignerOrAdmin } from '../middleware/auth.js';

const router = Router();

const createSourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sortOrder: z.number().int().optional(),
});

const updateSourceSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const reorderSchema = z.object({
  sourceIds: z.array(z.string().uuid()),
});

// Helper to get user's organization
async function getUserOrganizationId(userId: string): Promise<string | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, isDefault: true },
    select: { organizationId: true },
  });
  return membership?.organizationId || null;
}

// List lead sources (active only for designers, all for admins)
router.get('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const organizationId = await getUserOrganizationId(req.user!.id);
  if (!organizationId) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const includeInactive = req.user!.role === 'admin' && req.query.includeInactive === 'true';

  const where: any = { organizationId };
  if (!includeInactive) {
    where.isActive = true;
  }

  const sources = await prisma.leadSource.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  });

  res.json(sources);
});

// Create lead source (admin only)
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const data = createSourceSchema.parse(req.body);

  const organizationId = await getUserOrganizationId(req.user!.id);
  if (!organizationId) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  // Get max sort order
  const maxSort = await prisma.leadSource.aggregate({
    where: { organizationId },
    _max: { sortOrder: true },
  });

  const source = await prisma.leadSource.create({
    data: {
      organizationId,
      name: data.name,
      sortOrder: data.sortOrder ?? (maxSort._max.sortOrder || 0) + 1,
    },
  });

  res.status(201).json(source);
});

// Update lead source (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const data = updateSourceSchema.parse(req.body);

  const organizationId = await getUserOrganizationId(req.user!.id);
  if (!organizationId) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const existing = await prisma.leadSource.findFirst({
    where: { id: req.params.id, organizationId },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead source not found' });
    return;
  }

  const source = await prisma.leadSource.update({
    where: { id: req.params.id },
    data,
  });

  res.json(source);
});

// Reorder lead sources (admin only)
router.patch('/reorder', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { sourceIds } = reorderSchema.parse(req.body);

  const organizationId = await getUserOrganizationId(req.user!.id);
  if (!organizationId) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  // Update sort order for each source
  await prisma.$transaction(
    sourceIds.map((id, index) =>
      prisma.leadSource.updateMany({
        where: { id, organizationId },
        data: { sortOrder: index },
      })
    )
  );

  // Return updated list
  const sources = await prisma.leadSource.findMany({
    where: { organizationId },
    orderBy: { sortOrder: 'asc' },
  });

  res.json(sources);
});

// Delete (soft delete by deactivating) lead source (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const organizationId = await getUserOrganizationId(req.user!.id);
  if (!organizationId) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const existing = await prisma.leadSource.findFirst({
    where: { id: req.params.id, organizationId },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead source not found' });
    return;
  }

  // Soft delete by deactivating
  await prisma.leadSource.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.json({ message: 'Lead source deactivated successfully' });
});

export default router;
