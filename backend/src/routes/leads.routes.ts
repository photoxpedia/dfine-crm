import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import prisma from '../config/database.js';
import { authenticate, requireDesignerOrAdmin, requireAdmin } from '../middleware/auth.js';
import { LeadStatus, SubStatus, FollowUpReason, ProjectType, PhotoTag } from '@prisma/client';
import { createLeadHistory, getLeadHistory } from '../services/leadHistory.service.js';
import { createNotification } from '../services/notification.service.js';
import { uploadLeadPhotos, getFullPath, getRelativePath } from '../config/upload.js';

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
  subStatus: z.nativeEnum(SubStatus).optional().nullable(),
});

const statusChangeSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  subStatus: z.nativeEnum(SubStatus).optional().nullable(),
  note: z.string().min(1, 'Note is required for status change'),
  followUpDate: z.string().datetime().optional().nullable(),
  followUpReason: z.nativeEnum(FollowUpReason).optional().nullable(),
  followUpReasonOther: z.string().optional().nullable(),
});

const addNoteSchema = z.object({
  note: z.string().min(1, 'Note is required'),
});

const logContactSchema = z.object({
  contactType: z.enum(['call', 'email', 'meeting', 'site_visit']),
  note: z.string().min(1, 'Note is required'),
});

// List leads
router.get('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { status, projectType, search, designerId, page = '1', limit = '20' } = req.query;

  const where: any = {};

  // Organization scoping
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });
  if (userOrg) {
    where.organizationId = userOrg.organizationId;
  }

  // Designers only see their own leads, admin sees all within org
  if (req.user!.role === 'designer') {
    where.designerId = req.user!.id;
  } else if (designerId) {
    // Admin can filter by designer
    where.designerId = designerId as string;
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

// Get single lead with history
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
      photos: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      history: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: { select: { id: true, name: true, email: true } },
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

  // Get user's organization
  const userOrg = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, isDefault: true },
    select: { organizationId: true },
  });

  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const lead = await prisma.lead.create({
    data: {
      ...data,
      organizationId: userOrg.organizationId,
      designerId: req.user!.id,
    },
    include: {
      designer: { select: { id: true, name: true, email: true } },
    },
  });

  // Create history entry for lead creation
  await createLeadHistory({
    leadId: lead.id,
    userId: req.user!.id,
    eventType: 'created',
    newValue: JSON.stringify({ status: lead.status }),
    note: 'Lead created',
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

// Update lead status with history tracking
router.patch('/:id/status', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const data = statusChangeSchema.parse(req.body);

  const existing = await prisma.lead.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Determine sub-status based on new status
  let newSubStatus = data.subStatus;
  if (['pre_estimate', 'estimated', 'converted'].includes(data.status) && !newSubStatus) {
    newSubStatus = 'in_progress'; // Default to in_progress
  } else if (!['pre_estimate', 'estimated', 'converted'].includes(data.status)) {
    newSubStatus = null; // Clear sub-status for statuses that don't use it
  }

  // Prepare update data
  const updateData: any = {
    status: data.status,
    subStatus: newSubStatus,
  };

  // Handle follow-up for on_hold and future_client
  if (data.status === 'on_hold' || data.status === 'future_client') {
    if (data.followUpDate) {
      updateData.followUpDate = new Date(data.followUpDate);
    }
    updateData.followUpReason = data.followUpReason || null;
    updateData.followUpReasonOther = data.followUpReasonOther || null;
  } else {
    // Clear follow-up data for other statuses
    updateData.followUpDate = null;
    updateData.followUpReason = null;
    updateData.followUpReasonOther = null;
  }

  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      designer: { select: { id: true, name: true, email: true } },
    },
  });

  // Create history entry
  const eventType = existing.subStatus !== newSubStatus && existing.status === data.status
    ? 'substatus_change'
    : 'status_change';

  await createLeadHistory({
    leadId: lead.id,
    userId: req.user!.id,
    eventType,
    oldValue: JSON.stringify({
      status: existing.status,
      subStatus: existing.subStatus,
    }),
    newValue: JSON.stringify({
      status: lead.status,
      subStatus: lead.subStatus,
    }),
    note: data.note,
    metadata: data.followUpDate ? { followUpDate: data.followUpDate, followUpReason: data.followUpReason } : undefined,
  });

  // If follow-up was set, create additional history entry
  if (data.followUpDate) {
    await createLeadHistory({
      leadId: lead.id,
      userId: req.user!.id,
      eventType: 'followup_set',
      newValue: data.followUpDate,
      note: `Follow-up scheduled: ${data.followUpReason || 'General'}`,
    });
  }

  // Handle reactivation from dropped
  if (existing.status === 'dropped' && data.status !== 'dropped') {
    await createLeadHistory({
      leadId: lead.id,
      userId: req.user!.id,
      eventType: 'reactivated',
      oldValue: 'dropped',
      newValue: data.status,
      note: 'Lead reactivated from dropped status',
    });
  }

  res.json(lead);
});

// Assign lead to designer (admin only)
router.patch('/:id/assign', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { designerId } = z.object({ designerId: z.string().uuid() }).parse(req.body);

  const existing = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      designer: { select: { id: true, name: true } },
    },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  // Verify new designer exists and is a designer
  const newDesigner = await prisma.user.findUnique({
    where: { id: designerId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!newDesigner || newDesigner.role !== 'designer') {
    res.status(400).json({ error: 'Invalid designer' });
    return;
  }

  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: { designerId },
    include: {
      designer: { select: { id: true, name: true, email: true } },
    },
  });

  // Create history entry
  await createLeadHistory({
    leadId: lead.id,
    userId: req.user!.id,
    eventType: 'assigned',
    oldValue: existing.designer?.name || null,
    newValue: newDesigner.name,
    note: `Lead assigned to ${newDesigner.name}`,
  });

  // Send notification to the new designer
  await createNotification({
    userId: designerId,
    type: 'lead_new',
    title: 'New Lead Assigned',
    message: `You have been assigned a new lead: ${lead.firstName} ${lead.lastName}`,
    entityType: 'lead',
    entityId: lead.id,
    sendEmailNotification: true,
    emailSubject: `New Lead: ${lead.firstName} ${lead.lastName}`,
    emailBody: `
      <h2>New Lead Assigned</h2>
      <p>You have been assigned a new lead:</p>
      <p><strong>${lead.firstName} ${lead.lastName}</strong></p>
      <p>Project Type: ${lead.projectType || 'Not specified'}</p>
      <p>Source: ${lead.source || 'Not specified'}</p>
    `,
  });

  res.json(lead);
});

// Add note to lead
router.post('/:id/notes', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { note } = addNoteSchema.parse(req.body);

  const existing = await prisma.lead.findUnique({
    where: { id: req.params.id },
    select: { id: true, designerId: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const historyEntry = await createLeadHistory({
    leadId: existing.id,
    userId: req.user!.id,
    eventType: 'note_added',
    note,
  });

  res.status(201).json(historyEntry);
});

// Log contact activity (call, email, meeting, site visit)
router.post('/:id/contact', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { contactType, note } = logContactSchema.parse(req.body);

  const existing = await prisma.lead.findUnique({
    where: { id: req.params.id },
    select: { id: true, designerId: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const historyEntry = await createLeadHistory({
    leadId: existing.id,
    userId: req.user!.id,
    eventType: 'contact_logged',
    note,
    metadata: { contactType },
  });

  res.status(201).json(historyEntry);
});

// Get lead history (timeline)
router.get('/:id/history', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { limit = '50', offset = '0' } = req.query;

  const existing = await prisma.lead.findUnique({
    where: { id: req.params.id },
    select: { id: true, designerId: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const history = await getLeadHistory(
    existing.id,
    parseInt(limit as string),
    parseInt(offset as string)
  );

  res.json(history);
});

// Upload photos to lead
router.post(
  '/:id/photos',
  authenticate,
  requireDesignerOrAdmin,
  uploadLeadPhotos.array('photos', 20),
  async (req: Request, res: Response) => {
    const existing = await prisma.lead.findUnique({
      where: { id: req.params.id },
      select: { id: true, designerId: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const tag = (req.body.tag as PhotoTag) || 'before_photo';

    // Create photo records
    const photos = await Promise.all(
      files.map(async (file) => {
        const photo = await prisma.leadPhoto.create({
          data: {
            leadId: existing.id,
            userId: req.user!.id,
            filePath: getRelativePath(file.path),
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            tag,
          },
          include: {
            user: { select: { id: true, name: true } },
          },
        });
        return photo;
      })
    );

    // Create single history entry for the upload batch
    await createLeadHistory({
      leadId: existing.id,
      userId: req.user!.id,
      eventType: 'photo_uploaded',
      note: `${files.length} photo${files.length > 1 ? 's' : ''} uploaded`,
      metadata: {
        photoIds: photos.map((p) => p.id),
        tag,
      },
    });

    res.status(201).json(photos);
  }
);

// Get lead photos
router.get('/:id/photos', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.lead.findUnique({
    where: { id: req.params.id },
    select: { id: true, designerId: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const photos = await prisma.leadPhoto.findMany({
    where: { leadId: existing.id },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  res.json(photos);
});

// Delete photo
router.delete('/:id/photos/:photoId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.lead.findUnique({
    where: { id: req.params.id },
    select: { id: true, designerId: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const photo = await prisma.leadPhoto.findFirst({
    where: { id: req.params.photoId, leadId: existing.id },
  });

  if (!photo) {
    res.status(404).json({ error: 'Photo not found' });
    return;
  }

  // Delete file from disk
  try {
    const fullPath = getFullPath(photo.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting photo file:', error);
  }

  // Delete from database
  await prisma.leadPhoto.delete({
    where: { id: photo.id },
  });

  res.json({ message: 'Photo deleted successfully' });
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
        organizationId: lead.organizationId,
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

    // Update lead status to converted
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: 'converted', subStatus: 'complete' },
    });

    return project;
  });

  // Create history entry
  await createLeadHistory({
    leadId: lead.id,
    userId: req.user!.id,
    eventType: 'status_change',
    oldValue: JSON.stringify({ status: lead.status, subStatus: lead.subStatus }),
    newValue: JSON.stringify({ status: 'converted', subStatus: 'complete' }),
    note: `Lead converted to project: ${project.name}`,
    metadata: { projectId: project.id },
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
