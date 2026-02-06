import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate, requireDesignerOrAdmin } from '../middleware/auth.js';
import { DocumentType, DocumentStatus } from '@prisma/client';

const router = Router();

const createDocumentSchema = z.object({
  projectId: z.string().uuid(),
  estimateId: z.string().uuid().optional(),
  type: z.nativeEnum(DocumentType),
  name: z.string().min(1),
  content: z.any().optional(),
});

// List documents for a project
router.get('/project/:projectId', authenticate, async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { type } = req.query;

  // Check access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true, clientId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Clients can only see their own projects
  if (req.user!.role === 'client' && project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const where: any = { projectId };
  if (type) where.type = type as DocumentType;

  // Clients only see signed or pending signature docs
  if (req.user!.role === 'client') {
    where.status = { in: ['pending_signature', 'signed'] };
  }

  const documents = await prisma.document.findMany({
    where,
    orderBy: [{ type: 'asc' }, { version: 'desc' }],
    include: {
      estimate: { select: { id: true, name: true, version: true } },
      signatures: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  res.json({ documents });
});

// Get single document
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id },
    include: {
      project: { select: { id: true, name: true, clientId: true, designerId: true } },
      estimate: { select: { id: true, name: true, version: true, total: true } },
      createdBy: { select: { id: true, name: true } },
      signatures: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!document) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  // Check access
  if (req.user!.role === 'client' && document.project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(document);
});

// Create document
router.post('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const data = createDocumentSchema.parse(req.body);

  // Get next version for this type
  const latestDoc = await prisma.document.findFirst({
    where: {
      projectId: data.projectId,
      type: data.type,
    },
    orderBy: { version: 'desc' },
  });

  const version = (latestDoc?.version || 0) + 1;

  const document = await prisma.document.create({
    data: {
      projectId: data.projectId,
      estimateId: data.estimateId,
      createdById: req.user!.id,
      type: data.type,
      name: data.name,
      version,
      content: data.content,
      status: 'draft',
    },
    include: {
      project: { select: { id: true, name: true } },
      estimate: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(document);
});

// Update document status (send for signature)
router.patch('/:id/status', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { status } = req.body;

  const document = await prisma.document.findUnique({
    where: { id: req.params.id },
  });

  if (!document) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  const updateData: any = { status };

  if (status === 'pending_signature') {
    updateData.sentAt = new Date();
    // Set expiry to 30 days
    updateData.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  const updated = await prisma.document.update({
    where: { id: req.params.id },
    data: updateData,
  });

  res.json(updated);
});

// Sign document
router.post('/:id/sign', authenticate, async (req: Request, res: Response) => {
  const { signatureData } = req.body;

  if (!signatureData) {
    res.status(400).json({ error: 'Signature data is required' });
    return;
  }

  const document = await prisma.document.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { clientId: true } } },
  });

  if (!document) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  if (document.status !== 'pending_signature') {
    res.status(400).json({ error: 'Document is not pending signature' });
    return;
  }

  // Clients can only sign their own documents
  if (req.user!.role === 'client' && document.project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Check if already signed by this user
  const existingSignature = await prisma.signature.findFirst({
    where: {
      documentId: req.params.id,
      userId: req.user!.id,
    },
  });

  if (existingSignature) {
    res.status(400).json({ error: 'You have already signed this document' });
    return;
  }

  // Create signature
  const signature = await prisma.signature.create({
    data: {
      documentId: req.params.id,
      userId: req.user!.id,
      signatureData,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Update document status to signed
  await prisma.document.update({
    where: { id: req.params.id },
    data: { status: 'signed' },
  });

  res.status(201).json(signature);
});

// Delete document (draft only)
router.delete('/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id },
  });

  if (!document) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  if (document.status !== 'draft') {
    res.status(400).json({ error: 'Can only delete draft documents' });
    return;
  }

  await prisma.document.delete({ where: { id: req.params.id } });
  res.json({ message: 'Document deleted' });
});

export default router;
