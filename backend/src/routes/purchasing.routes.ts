import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate, requireDesignerOrAdmin, requireAdmin } from '../middleware/auth.js';
import { POStatus, PurchaseStatus } from '@prisma/client';

const router = Router();

const createPOSchema = z.object({
  projectId: z.string().uuid(),
  vendorId: z.string().uuid(),
  notes: z.string().optional(),
  items: z.array(z.object({
    materialItemId: z.string().uuid(),
    quantityOrdered: z.number().min(0),
    unitCost: z.number().min(0),
    expectedDeliveryDate: z.string().optional(),
  })).optional(),
});

const updatePOSchema = z.object({
  notes: z.string().optional(),
  status: z.nativeEnum(POStatus).optional(),
});

// Generate PO number
async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({
    where: {
      poNumber: { startsWith: `PO-${year}` },
    },
  });
  return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
}

// ==================== MATERIALS ENDPOINTS ====================

// List materials for a project
router.get('/materials/:projectId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { status } = req.query;

  const where: any = { projectId };
  if (status) where.purchaseStatus = status as PurchaseStatus;

  const materials = await prisma.materialItem.findMany({
    where,
    include: {
      vendor: { select: { id: true, name: true } },
      estimateLineItem: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ materials });
});

// Update material status
router.patch('/materials/:id/status', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { status, statusDate, holdReason } = req.body;

  const existing = await prisma.materialItem.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    res.status(404).json({ error: 'Material item not found' });
    return;
  }

  const updateData: any = {
    purchaseStatus: status,
  };

  // Set date fields based on status
  const date = statusDate ? new Date(statusDate) : new Date();
  switch (status) {
    case 'on_hold':
      updateData.holdReason = holdReason || null;
      break;
    case 'pending':
      updateData.holdReason = null;
      break;
    case 'ordered':
      updateData.purchasedAt = date;
      updateData.holdReason = null;
      break;
    case 'shipped':
      break;
    case 'delivered':
      updateData.deliveredAt = date;
      break;
    case 'installed':
      updateData.installedAt = date;
      break;
  }

  const material = await prisma.materialItem.update({
    where: { id: req.params.id },
    data: updateData,
  });

  res.json(material);
});

// Update material details (actual cost, vendor, notes)
router.patch('/materials/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { actualCost, vendorId, notes } = req.body;

  const existing = await prisma.materialItem.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    res.status(404).json({ error: 'Material item not found' });
    return;
  }

  const material = await prisma.materialItem.update({
    where: { id: req.params.id },
    data: {
      actualCost: actualCost !== undefined ? actualCost : undefined,
      vendorId: vendorId !== undefined ? vendorId : undefined,
      notes: notes !== undefined ? notes : undefined,
    },
  });

  res.json(material);
});

// ==================== PURCHASE ORDER ENDPOINTS ====================

// List purchase orders
router.get('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, vendorId, status, page = '1', limit = '20' } = req.query;

  const where: any = {};

  if (projectId) where.projectId = projectId as string;
  if (vendorId) where.vendorId = vendorId as string;
  if (status) where.status = status as POStatus;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [purchaseOrders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  res.json({
    purchaseOrders,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// Get single PO
router.get('/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: {
      project: { select: { id: true, name: true } },
      vendor: true,
      createdBy: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          materialItem: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!po) {
    res.status(404).json({ error: 'Purchase order not found' });
    return;
  }

  res.json(po);
});

// Create PO
router.post('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const data = createPOSchema.parse(req.body);

  // Verify project and vendor exist
  const [project, vendor] = await Promise.all([
    prisma.project.findUnique({ where: { id: data.projectId } }),
    prisma.vendor.findUnique({ where: { id: data.vendorId } }),
  ]);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  if (!vendor) {
    res.status(404).json({ error: 'Vendor not found' });
    return;
  }

  const poNumber = await generatePONumber();

  // Calculate totals
  let subtotal = 0;
  if (data.items) {
    for (const item of data.items) {
      subtotal += item.quantityOrdered * item.unitCost;
    }
  }

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      projectId: data.projectId,
      vendorId: data.vendorId,
      createdById: req.user!.id,
      notes: data.notes,
      subtotal,
      total: subtotal, // Can add tax/shipping later
      items: data.items ? {
        create: data.items.map(item => ({
          materialItemId: item.materialItemId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
          totalCost: item.quantityOrdered * item.unitCost,
          expectedDeliveryDate: item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate) : undefined,
        })),
      } : undefined,
    },
    include: {
      project: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true } },
      items: true,
    },
  });

  res.status(201).json(po);
});

// Update PO
router.put('/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const data = updatePOSchema.parse(req.body);

  const existing = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    res.status(404).json({ error: 'Purchase order not found' });
    return;
  }

  // Don't allow editing if already received
  if (existing.status === 'received' || existing.status === 'cancelled') {
    res.status(400).json({ error: 'Cannot edit completed or cancelled PO' });
    return;
  }

  const updateData: any = { ...data };

  // Set timestamps based on status change
  if (data.status === 'sent' && !existing.sentAt) {
    updateData.sentAt = new Date();
  }
  if (data.status === 'confirmed' && !existing.confirmedAt) {
    updateData.confirmedAt = new Date();
  }
  if (data.status === 'received' && !existing.receivedAt) {
    updateData.receivedAt = new Date();
  }

  const po = await prisma.purchaseOrder.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      project: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true } },
    },
  });

  res.json(po);
});

// Add item to PO
router.post('/:id/items', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { materialItemId, quantityOrdered, unitCost, expectedDeliveryDate } = req.body;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
  });

  if (!po) {
    res.status(404).json({ error: 'Purchase order not found' });
    return;
  }

  if (po.status !== 'draft') {
    res.status(400).json({ error: 'Can only add items to draft POs' });
    return;
  }

  const totalCost = quantityOrdered * unitCost;

  const item = await prisma.purchaseOrderItem.create({
    data: {
      purchaseOrderId: req.params.id,
      materialItemId,
      quantityOrdered,
      unitCost,
      totalCost,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
    },
  });

  // Update PO totals
  await prisma.purchaseOrder.update({
    where: { id: req.params.id },
    data: {
      subtotal: { increment: totalCost },
      total: { increment: totalCost },
    },
  });

  res.status(201).json(item);
});

// Update PO item (receive items)
router.put('/:id/items/:itemId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { quantityReceived, status, actualDeliveryDate } = req.body;

  const item = await prisma.purchaseOrderItem.findFirst({
    where: {
      id: req.params.itemId,
      purchaseOrderId: req.params.id,
    },
  });

  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  const updatedItem = await prisma.purchaseOrderItem.update({
    where: { id: req.params.itemId },
    data: {
      quantityReceived: quantityReceived ?? item.quantityReceived,
      status: status ?? item.status,
      actualDeliveryDate: actualDeliveryDate ? new Date(actualDeliveryDate) : item.actualDeliveryDate,
    },
  });

  // Check if all items received to update PO status
  const allItems = await prisma.purchaseOrderItem.findMany({
    where: { purchaseOrderId: req.params.id },
  });

  const allReceived = allItems.every(i =>
    Number(i.quantityReceived) >= Number(i.quantityOrdered)
  );
  const someReceived = allItems.some(i => Number(i.quantityReceived) > 0);

  if (allReceived) {
    await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'received', receivedAt: new Date() },
    });
  } else if (someReceived) {
    await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'partial' },
    });
  }

  res.json(updatedItem);
});

// Delete PO (only drafts)
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
  });

  if (!po) {
    res.status(404).json({ error: 'Purchase order not found' });
    return;
  }

  if (po.status !== 'draft') {
    res.status(400).json({ error: 'Can only delete draft POs' });
    return;
  }

  await prisma.purchaseOrder.delete({ where: { id: req.params.id } });
  res.json({ message: 'Purchase order deleted' });
});

export default router;
