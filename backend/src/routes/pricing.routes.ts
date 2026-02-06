import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate, requireAdmin, requireDesignerOrAdmin } from '../middleware/auth.js';
import { ProjectType, UnitOfMeasure } from '@prisma/client';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  projectType: z.nativeEnum(ProjectType),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const itemSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  unitOfMeasure: z.nativeEnum(UnitOfMeasure).optional(),
  contractorCost: z.number().min(0, 'Cost must be positive'),
  sellingPrice: z.number().min(0, 'Price must be positive'),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// ==================== CATEGORIES ====================

// List categories
router.get('/categories', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectType, includeItems } = req.query;

  const where: any = { isActive: true }; // Only return active categories
  if (projectType) {
    where.projectType = projectType as ProjectType;
  }

  const categories = await prisma.pricingCategory.findMany({
    where,
    include: includeItems === 'true' ? {
      items: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
    } : undefined,
    orderBy: { sortOrder: 'asc' },
  });

  res.json(categories);
});

// Get single category
router.get('/categories/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const category = await prisma.pricingCategory.findUnique({
    where: { id: req.params.id },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!category) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  res.json(category);
});

// Create category (admin only)
router.post('/categories', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const data = categorySchema.parse(req.body);

  const maxOrder = await prisma.pricingCategory.aggregate({
    where: { projectType: data.projectType },
    _max: { sortOrder: true },
  });

  const category = await prisma.pricingCategory.create({
    data: {
      ...data,
      sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder || 0) + 1,
    },
  });

  res.status(201).json(category);
});

// Update category (admin only)
router.put('/categories/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const data = categorySchema.partial().parse(req.body);

  const category = await prisma.pricingCategory.update({
    where: { id: req.params.id },
    data,
  });

  res.json(category);
});

// Delete category (admin only)
router.delete('/categories/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  // Check if category has items
  const itemCount = await prisma.pricingItem.count({
    where: { categoryId: req.params.id },
  });

  if (itemCount > 0) {
    res.status(400).json({ error: 'Cannot delete category with items. Remove items first.' });
    return;
  }

  await prisma.pricingCategory.delete({ where: { id: req.params.id } });
  res.json({ message: 'Category deleted' });
});

// ==================== ITEMS ====================

// List items
router.get('/items', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { categoryId, projectType, search, page = '1', limit = '50' } = req.query;

  const where: any = { isActive: true };

  if (categoryId) {
    where.categoryId = categoryId as string;
  }

  if (projectType) {
    where.category = { projectType: projectType as ProjectType };
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const [items, total] = await Promise.all([
    prisma.pricingItem.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, projectType: true } },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      skip,
      take,
    }),
    prisma.pricingItem.count({ where }),
  ]);

  res.json({
    items,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
});

// Get single item
router.get('/items/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const item = await prisma.pricingItem.findUnique({
    where: { id: req.params.id },
    include: {
      category: { select: { id: true, name: true, projectType: true } },
    },
  });

  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  res.json(item);
});

// Create item (admin only)
router.post('/items', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const data = itemSchema.parse(req.body);

  const maxOrder = await prisma.pricingItem.aggregate({
    where: { categoryId: data.categoryId },
    _max: { sortOrder: true },
  });

  const item = await prisma.pricingItem.create({
    data: {
      ...data,
      sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder || 0) + 1,
    },
    include: {
      category: { select: { id: true, name: true, projectType: true } },
    },
  });

  res.status(201).json(item);
});

// Update item (admin only)
router.put('/items/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const data = itemSchema.partial().parse(req.body);

  const item = await prisma.pricingItem.update({
    where: { id: req.params.id },
    data,
    include: {
      category: { select: { id: true, name: true, projectType: true } },
    },
  });

  res.json(item);
});

// Delete item (admin only) - soft delete by setting isActive to false
router.delete('/items/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { hard } = req.query;

  if (hard === 'true') {
    // Check if item is used in any estimates
    const usageCount = await prisma.estimateLineItem.count({
      where: { pricingItemId: req.params.id },
    });

    if (usageCount > 0) {
      res.status(400).json({ error: 'Cannot delete item that is used in estimates. Use soft delete instead.' });
      return;
    }

    await prisma.pricingItem.delete({ where: { id: req.params.id } });
  } else {
    await prisma.pricingItem.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
  }

  res.json({ message: 'Item deleted' });
});

// ==================== BULK OPERATIONS ====================

// Import pricing data (admin only)
router.post('/import', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { categories } = req.body;

  if (!Array.isArray(categories)) {
    res.status(400).json({ error: 'Categories array is required' });
    return;
  }

  const results = {
    categoriesCreated: 0,
    itemsCreated: 0,
    errors: [] as string[],
  };

  for (const cat of categories) {
    try {
      // Create or find category
      let category = await prisma.pricingCategory.findFirst({
        where: {
          name: cat.name,
          projectType: cat.projectType,
        },
      });

      if (!category) {
        category = await prisma.pricingCategory.create({
          data: {
            name: cat.name,
            description: cat.description,
            projectType: cat.projectType,
            sortOrder: cat.sortOrder || 0,
          },
        });
        results.categoriesCreated++;
      }

      // Create items
      if (Array.isArray(cat.items)) {
        for (const item of cat.items) {
          try {
            await prisma.pricingItem.create({
              data: {
                categoryId: category.id,
                name: item.name,
                description: item.description,
                unitOfMeasure: item.unitOfMeasure || 'EA',
                contractorCost: item.contractorCost || 0,
                sellingPrice: item.sellingPrice || 0,
                sortOrder: item.sortOrder || 0,
              },
            });
            results.itemsCreated++;
          } catch (e: any) {
            results.errors.push(`Item "${item.name}": ${e.message}`);
          }
        }
      }
    } catch (e: any) {
      results.errors.push(`Category "${cat.name}": ${e.message}`);
    }
  }

  res.json(results);
});

// Reorder categories
router.put('/categories/reorder', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { order } = req.body;

  if (!Array.isArray(order)) {
    res.status(400).json({ error: 'Order array is required' });
    return;
  }

  await prisma.$transaction(
    order.map((id: string, index: number) =>
      prisma.pricingCategory.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  res.json({ message: 'Categories reordered' });
});

// Reorder items within a category
router.put('/items/reorder', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { order } = req.body;

  if (!Array.isArray(order)) {
    res.status(400).json({ error: 'Order array is required' });
    return;
  }

  await prisma.$transaction(
    order.map((id: string, index: number) =>
      prisma.pricingItem.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  res.json({ message: 'Items reordered' });
});

export default router;
