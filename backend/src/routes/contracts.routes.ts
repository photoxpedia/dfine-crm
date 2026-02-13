import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../config/database.js';
import { authenticate, requireAdmin, requireDesignerOrAdmin } from '../middleware/auth.js';

const router = Router();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'contracts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `contract-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const fieldMappingSchema = z.array(
  z.object({
    field: z.string(),
    x: z.number(),
    y: z.number(),
    page: z.number().default(1),
    fontSize: z.number().optional(),
    fontColor: z.string().optional(),
  })
);

// List all contract templates
router.get('/templates', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { activeOnly } = req.query;

  const where: any = {};

  // Organization scoping
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });
  if (userOrg) {
    where.organizationId = userOrg.organizationId;
  }

  if (activeOnly === 'true') {
    where.isActive = true;
  }

  const templates = await prisma.contractTemplate.findMany({
    where,
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  res.json({ templates });
});

// Get single contract template
router.get('/templates/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const template = await prisma.contractTemplate.findFirst({
    where: { id: req.params.id, organizationId: userOrg.organizationId },
  });

  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.json(template);
});

// Create contract template (admin only)
router.post('/templates', authenticate, requireAdmin, upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    const { name, description, fieldMappings, isDefault } = req.body;

    if (!req.file) {
      res.status(400).json({ error: 'PDF file is required' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'Template name is required' });
      return;
    }

    // Parse field mappings
    let parsedFieldMappings = [];
    if (fieldMappings) {
      try {
        parsedFieldMappings = JSON.parse(fieldMappings);
        fieldMappingSchema.parse(parsedFieldMappings);
      } catch (e) {
        res.status(400).json({ error: 'Invalid field mappings format' });
        return;
      }
    }

    // If setting this as default, unset other defaults
    if (isDefault === 'true') {
      await prisma.contractTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Get user's organization
    const userOrg = await prisma.organizationMember.findFirst({
      where: { userId: req.user!.id, isDefault: true },
      select: { organizationId: true },
    });

    if (!userOrg) {
      res.status(400).json({ error: 'User must belong to an organization' });
      return;
    }

    const template = await prisma.contractTemplate.create({
      data: {
        name,
        description: description || null,
        pdfUrl: `/uploads/contracts/${req.file.filename}`,
        fieldMappings: parsedFieldMappings,
        isDefault: isDefault === 'true',
        organizationId: userOrg.organizationId,
      },
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating contract template:', error);
    res.status(500).json({ error: 'Failed to create contract template' });
  }
});

// Update contract template (admin only)
router.put('/templates/:id', authenticate, requireAdmin, upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    const { name, description, fieldMappings, isActive, isDefault } = req.body;

    const userOrg = await prisma.organizationMember.findFirst({
      where: { userId: req.user!.id, isDefault: true },
      select: { organizationId: true },
    });
    if (!userOrg) {
      res.status(400).json({ error: 'User must belong to an organization' });
      return;
    }

    const existing = await prisma.contractTemplate.findFirst({
      where: { id: req.params.id, organizationId: userOrg.organizationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const updateData: any = {};

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (isActive !== undefined) updateData.isActive = isActive === 'true';

    if (req.file) {
      // Delete old file if exists
      if (existing.pdfUrl) {
        const oldPath = path.join(process.cwd(), existing.pdfUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      updateData.pdfUrl = `/uploads/contracts/${req.file.filename}`;
    }

    if (fieldMappings) {
      try {
        const parsedFieldMappings = JSON.parse(fieldMappings);
        fieldMappingSchema.parse(parsedFieldMappings);
        updateData.fieldMappings = parsedFieldMappings;
      } catch (e) {
        res.status(400).json({ error: 'Invalid field mappings format' });
        return;
      }
    }

    // Handle default flag
    if (isDefault === 'true' && !existing.isDefault) {
      await prisma.contractTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      updateData.isDefault = true;
    } else if (isDefault === 'false') {
      updateData.isDefault = false;
    }

    const template = await prisma.contractTemplate.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(template);
  } catch (error) {
    console.error('Error updating contract template:', error);
    res.status(500).json({ error: 'Failed to update contract template' });
  }
});

// Delete contract template (admin only)
router.delete('/templates/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const template = await prisma.contractTemplate.findFirst({
    where: { id: req.params.id, organizationId: userOrg.organizationId },
  });

  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  // Check if template is in use
  const documentsUsing = await prisma.document.count({
    where: { contractTemplateId: req.params.id },
  });

  if (documentsUsing > 0) {
    res.status(400).json({
      error: 'Cannot delete template that is in use',
      documentsUsing,
    });
    return;
  }

  // Delete the PDF file
  if (template.pdfUrl) {
    const filePath = path.join(process.cwd(), template.pdfUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.contractTemplate.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Template deleted' });
});

// Get default contract template
router.get('/templates/default', authenticate, async (req: Request, res: Response) => {
  const template = await prisma.contractTemplate.findFirst({
    where: { isDefault: true, isActive: true },
  });

  if (!template) {
    res.status(404).json({ error: 'No default template set' });
    return;
  }

  res.json(template);
});

export default router;
