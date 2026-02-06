# Lead Status Workflow Enhancement - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement comprehensive lead status workflow with history tracking, photo uploads, designer assignment, and follow-up reminders.

**Architecture:** Backend-first approach - update Prisma schema, create migrations, build new API endpoints, then update frontend. Each task is self-contained with tests where applicable.

**Tech Stack:** Prisma (PostgreSQL), Express.js, TypeScript, React, TanStack Query, Multer (file uploads), Zod (validation)

---

## Task 1: Update Prisma Schema with New Enums and Lead Fields

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Add new enums and update LeadStatus enum**

Replace the existing `LeadStatus` enum and add new enums in `backend/prisma/schema.prisma`:

```prisma
enum LeadStatus {
  new
  contacted
  pre_estimate
  estimated
  converted
  on_hold
  future_client
  dropped
}

enum SubStatus {
  in_progress
  complete
}

enum FollowUpReason {
  budget
  timing
  permits
  comparing
  personal
  other
}

enum LeadEventType {
  created
  status_change
  substatus_change
  note_added
  photo_uploaded
  assigned
  followup_set
  reactivated
}

enum PhotoTag {
  before_photo
  measurement
  other
}
```

**Step 2: Update Lead model with new fields**

Add these fields to the Lead model:

```prisma
model Lead {
  // ... existing fields ...
  subStatus           SubStatus?
  followUpDate        DateTime?        @map("follow_up_date")
  followUpReason      FollowUpReason?  @map("follow_up_reason")
  followUpReasonOther String?          @map("follow_up_reason_other")

  // Relations
  history    LeadHistory[]
  photos     LeadPhoto[]
}
```

**Step 3: Verify schema syntax**

Run: `cd backend && npx prisma format`
Expected: Schema formatted successfully, no errors

**Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(schema): add new LeadStatus enum values and Lead fields"
```

---

## Task 2: Add LeadHistory Model to Schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Add LeadHistory model**

```prisma
model LeadHistory {
  id        String        @id @default(uuid())
  leadId    String        @map("lead_id")
  userId    String        @map("user_id")
  eventType LeadEventType @map("event_type")
  oldValue  String?       @map("old_value")
  newValue  String?       @map("new_value")
  note      String?
  metadata  Json?
  createdAt DateTime      @default(now()) @map("created_at")

  lead Lead @relation(fields: [leadId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])

  @@index([leadId])
  @@index([createdAt])
  @@map("lead_history")
}
```

**Step 2: Add relation to User model**

Add to User model relations:

```prisma
leadHistory LeadHistory[]
```

**Step 3: Format and verify**

Run: `cd backend && npx prisma format`
Expected: No errors

**Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(schema): add LeadHistory model for timeline tracking"
```

---

## Task 3: Add LeadPhoto Model to Schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Add LeadPhoto model**

```prisma
model LeadPhoto {
  id        String   @id @default(uuid())
  leadId    String   @map("lead_id")
  userId    String   @map("user_id")
  filePath  String   @map("file_path")
  fileName  String   @map("file_name")
  fileSize  Int      @map("file_size")
  mimeType  String   @map("mime_type")
  tag       PhotoTag @default(before_photo)
  historyId String?  @map("history_id")
  createdAt DateTime @default(now()) @map("created_at")

  lead Lead @relation(fields: [leadId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])

  @@index([leadId])
  @@map("lead_photos")
}
```

**Step 2: Add relation to User model**

Add to User model relations:

```prisma
leadPhotos LeadPhoto[]
```

**Step 3: Format and verify**

Run: `cd backend && npx prisma format`
Expected: No errors

**Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(schema): add LeadPhoto model for before photos"
```

---

## Task 4: Add LeadSource Model to Schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Add LeadSource model**

```prisma
model LeadSource {
  id             String       @id @default(uuid())
  organizationId String       @map("organization_id")
  name           String
  sortOrder      Int          @default(0) @map("sort_order")
  isActive       Boolean      @default(true) @map("is_active")
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, name])
  @@index([organizationId])
  @@map("lead_sources")
}
```

**Step 2: Add relation to Organization model**

Add to Organization model relations:

```prisma
leadSources LeadSource[]
```

**Step 3: Format and verify**

Run: `cd backend && npx prisma format`
Expected: No errors

**Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(schema): add LeadSource model for configurable sources"
```

---

## Task 5: Update Notification Model and Add NotificationType Values

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Add new NotificationType values**

Update the NotificationType enum to include:

```prisma
enum NotificationType {
  // existing values...
  lead_new
  lead_status_change
  lead_assigned
  followup_reminder
  // ... rest of existing values
}
```

**Step 2: Update Notification model to add entityType and entityId**

The existing Notification model already has `data` as Json. We'll use that for entity references, but let's add explicit fields:

```prisma
model Notification {
  id         String           @id @default(uuid())
  userId     String           @map("user_id")
  type       NotificationType
  title      String
  message    String
  entityType String?          @map("entity_type")
  entityId   String?          @map("entity_id")
  isRead     Boolean          @default(false) @map("is_read")
  data       Json?
  readAt     DateTime?        @map("read_at")
  createdAt  DateTime         @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([createdAt])
  @@map("notifications")
}
```

**Step 3: Format and verify**

Run: `cd backend && npx prisma format`
Expected: No errors

**Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(schema): update Notification model with entity tracking"
```

---

## Task 6: Run Database Migration

**Files:**
- Creates: `backend/prisma/migrations/[timestamp]_lead_workflow_enhancement/migration.sql`

**Step 1: Generate and run migration**

Run: `cd backend && npx prisma migrate dev --name lead_workflow_enhancement`

Expected: Migration created and applied successfully. May prompt about data changes - accept.

**Step 2: Generate Prisma client**

Run: `cd backend && npx prisma generate`
Expected: Prisma Client generated successfully

**Step 3: Verify migration**

Run: `cd backend && npx prisma db push --force-reset` (ONLY if migration fails, otherwise skip)

**Step 4: Commit migration**

```bash
git add backend/prisma/migrations backend/prisma/schema.prisma
git commit -m "feat(db): apply lead workflow enhancement migration"
```

---

## Task 7: Create Lead History Service

**Files:**
- Create: `backend/src/services/leadHistory.service.ts`

**Step 1: Create the service file**

```typescript
import prisma from '../config/database.js';
import { LeadEventType } from '@prisma/client';

interface CreateHistoryParams {
  leadId: string;
  userId: string;
  eventType: LeadEventType;
  oldValue?: string | null;
  newValue?: string | null;
  note?: string | null;
  metadata?: Record<string, any>;
}

export async function createLeadHistory(params: CreateHistoryParams) {
  return prisma.leadHistory.create({
    data: {
      leadId: params.leadId,
      userId: params.userId,
      eventType: params.eventType,
      oldValue: params.oldValue || null,
      newValue: params.newValue || null,
      note: params.note || null,
      metadata: params.metadata || null,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function getLeadHistory(leadId: string, limit = 50, offset = 0) {
  return prisma.leadHistory.findMany({
    where: { leadId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
```

**Step 2: Commit**

```bash
git add backend/src/services/leadHistory.service.ts
git commit -m "feat(backend): add lead history service"
```

---

## Task 8: Create Notification Service

**Files:**
- Create: `backend/src/services/notification.service.ts`

**Step 1: Create the service file**

```typescript
import prisma from '../config/database.js';
import { NotificationType } from '@prisma/client';
import { sendEmail } from '../config/email.js';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  data?: Record<string, any>;
  sendEmail?: boolean;
  emailSubject?: string;
  emailBody?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      data: params.data || null,
    },
  });

  // Send email if requested
  if (params.sendEmail) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true, name: true },
    });

    if (user?.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: params.emailSubject || params.title,
          html: params.emailBody || `<p>${params.message}</p>`,
        });
      } catch (error) {
        console.error('Failed to send notification email:', error);
      }
    }
  }

  return notification;
}

export async function getUserNotifications(userId: string, unreadOnly = false, limit = 20) {
  const where: any = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function markNotificationRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
```

**Step 2: Commit**

```bash
git add backend/src/services/notification.service.ts
git commit -m "feat(backend): add notification service"
```

---

## Task 9: Update Leads Routes - Status Change with History

**Files:**
- Modify: `backend/src/routes/leads.routes.ts`

**Step 1: Add imports at top of file**

```typescript
import { createLeadHistory, getLeadHistory } from '../services/leadHistory.service.js';
import { createNotification } from '../services/notification.service.js';
import { LeadStatus, SubStatus, FollowUpReason, LeadEventType } from '@prisma/client';
```

**Step 2: Update the status change endpoint**

Replace the existing PATCH `/:id/status` route with:

```typescript
// Update lead status with history tracking
const statusChangeSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  subStatus: z.nativeEnum(SubStatus).optional().nullable(),
  note: z.string().min(1, 'Note is required when changing status'),
  followUpDate: z.string().datetime().optional().nullable(),
  followUpReason: z.nativeEnum(FollowUpReason).optional().nullable(),
  followUpReasonOther: z.string().optional().nullable(),
});

router.patch('/:id/status', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const data = statusChangeSchema.parse(req.body);

  const existing = await prisma.lead.findUnique({
    where: { id: req.params.id },
    select: { designerId: true, status: true, subStatus: true, firstName: true, lastName: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  if (req.user!.role === 'designer' && existing.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Build update data
  const updateData: any = { status: data.status };

  // Handle sub-status
  if (data.subStatus !== undefined) {
    updateData.subStatus = data.subStatus;
  } else if (['pre_estimate', 'estimated', 'converted'].includes(data.status)) {
    // Auto-set to in_progress when entering these statuses
    if (existing.status !== data.status) {
      updateData.subStatus = 'in_progress';
    }
  } else {
    updateData.subStatus = null;
  }

  // Handle follow-up fields for on_hold and future_client
  if (['on_hold', 'future_client'].includes(data.status)) {
    updateData.followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;
    updateData.followUpReason = data.followUpReason || null;
    updateData.followUpReasonOther = data.followUpReasonOther || null;
  } else {
    updateData.followUpDate = null;
    updateData.followUpReason = null;
    updateData.followUpReasonOther = null;
  }

  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: updateData,
  });

  // Create history entry
  const oldValue = JSON.stringify({ status: existing.status, subStatus: existing.subStatus });
  const newValue = JSON.stringify({ status: lead.status, subStatus: lead.subStatus });

  await createLeadHistory({
    leadId: lead.id,
    userId: req.user!.id,
    eventType: existing.status !== data.status ? 'status_change' : 'substatus_change',
    oldValue,
    newValue,
    note: data.note,
    metadata: data.followUpDate ? { followUpDate: data.followUpDate, followUpReason: data.followUpReason } : undefined,
  });

  res.json(lead);
});
```

**Step 3: Add endpoint to get lead history**

```typescript
// Get lead history/timeline
router.get('/:id/history', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { limit = '50', offset = '0' } = req.query;

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

  const history = await getLeadHistory(
    req.params.id,
    parseInt(limit as string),
    parseInt(offset as string)
  );

  res.json({ history });
});
```

**Step 4: Commit**

```bash
git add backend/src/routes/leads.routes.ts
git commit -m "feat(backend): add status change with history tracking"
```

---

## Task 10: Add Lead Assignment Endpoint (Admin Only)

**Files:**
- Modify: `backend/src/routes/leads.routes.ts`

**Step 1: Add assignment endpoint**

```typescript
// Assign lead to designer (admin only)
router.patch('/:id/assign', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { designerId, note } = z.object({
    designerId: z.string().uuid(),
    note: z.string().optional(),
  }).parse(req.body);

  const existing = await prisma.lead.findUnique({
    where: { id: req.params.id },
    select: { designerId: true, firstName: true, lastName: true, projectType: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  // Verify designer exists and is a designer
  const designer = await prisma.user.findUnique({
    where: { id: designerId },
    select: { id: true, name: true, role: true },
  });

  if (!designer || designer.role !== 'designer') {
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
    oldValue: existing.designerId,
    newValue: designerId,
    note: note || `Assigned to ${designer.name}`,
  });

  // Send notification to designer
  await createNotification({
    userId: designerId,
    type: 'lead_assigned',
    title: 'New Lead Assigned',
    message: `You have been assigned a new lead: ${existing.firstName} ${existing.lastName} - ${existing.projectType}`,
    entityType: 'lead',
    entityId: lead.id,
    sendEmail: true,
    emailSubject: 'New Lead Assigned to You',
    emailBody: `
      <h2>New Lead Assigned</h2>
      <p>You have been assigned a new lead:</p>
      <p><strong>${existing.firstName} ${existing.lastName}</strong> - ${existing.projectType}</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/designer/leads/${lead.id}">View Lead</a></p>
    `,
  });

  res.json(lead);
});
```

**Step 2: Commit**

```bash
git add backend/src/routes/leads.routes.ts
git commit -m "feat(backend): add lead assignment endpoint for admins"
```

---

## Task 11: Add Lead Notes Endpoint

**Files:**
- Modify: `backend/src/routes/leads.routes.ts`

**Step 1: Add notes endpoint**

```typescript
// Add note to lead
router.post('/:id/notes', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { note } = z.object({
    note: z.string().min(1, 'Note is required'),
  }).parse(req.body);

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

  const historyEntry = await createLeadHistory({
    leadId: req.params.id,
    userId: req.user!.id,
    eventType: 'note_added',
    note,
  });

  res.status(201).json(historyEntry);
});
```

**Step 2: Commit**

```bash
git add backend/src/routes/leads.routes.ts
git commit -m "feat(backend): add lead notes endpoint"
```

---

## Task 12: Add Lead Photo Upload Endpoints

**Files:**
- Modify: `backend/src/routes/leads.routes.ts`

**Step 1: Add multer configuration at top of file**

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for lead photos
const leadPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const leadId = req.params.id;
    const dir = path.join(process.cwd(), 'uploads', 'leads', leadId, 'before-photos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  },
});

const leadPhotoUpload = multer({
  storage: leadPhotoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed.'));
    }
  },
});
```

**Step 2: Add photo upload endpoint**

```typescript
// Upload photos to lead
router.post(
  '/:id/photos',
  authenticate,
  requireDesignerOrAdmin,
  leadPhotoUpload.array('photos', 20),
  async (req: Request, res: Response) => {
    const { tag = 'before_photo' } = req.body;

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

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    // Create photo records
    const photos = await Promise.all(
      files.map((file) =>
        prisma.leadPhoto.create({
          data: {
            leadId: req.params.id,
            userId: req.user!.id,
            filePath: `/uploads/leads/${req.params.id}/before-photos/${file.filename}`,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            tag: tag as any,
          },
        })
      )
    );

    // Create history entry
    await createLeadHistory({
      leadId: req.params.id,
      userId: req.user!.id,
      eventType: 'photo_uploaded',
      note: `Uploaded ${files.length} photo(s)`,
      metadata: { photoIds: photos.map((p) => p.id), tag },
    });

    res.status(201).json({ photos });
  }
);

// Get lead photos
router.get('/:id/photos', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
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

  const photos = await prisma.leadPhoto.findMany({
    where: { leadId: req.params.id },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ photos });
});

// Delete lead photo
router.delete('/:id/photos/:photoId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const photo = await prisma.leadPhoto.findFirst({
    where: { id: req.params.photoId, leadId: req.params.id },
    include: { lead: { select: { designerId: true } } },
  });

  if (!photo) {
    res.status(404).json({ error: 'Photo not found' });
    return;
  }

  if (req.user!.role === 'designer' && photo.lead.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Delete file from disk
  const filePath = path.join(process.cwd(), photo.filePath);
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Failed to delete photo file:', err);
  }

  await prisma.leadPhoto.delete({ where: { id: req.params.photoId } });

  res.json({ message: 'Photo deleted' });
});
```

**Step 3: Commit**

```bash
git add backend/src/routes/leads.routes.ts
git commit -m "feat(backend): add lead photo upload endpoints"
```

---

## Task 13: Create Lead Sources Routes

**Files:**
- Create: `backend/src/routes/leadSources.routes.ts`
- Modify: `backend/src/index.ts`

**Step 1: Create the lead sources routes file**

```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate, requireAdmin, requireDesignerOrAdmin } from '../middleware/auth.js';

const router = Router();

// List lead sources
router.get('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  // For now, use a hardcoded org ID or get from user context
  // TODO: Implement proper multi-tenancy when organization context is available

  const sources = await prisma.leadSource.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  // If no sources exist, return defaults
  if (sources.length === 0) {
    const defaults = [
      'Phone Call',
      'Walk-in',
      'Website',
      'Referral',
      'Social Media',
      'Home Show/Event',
      'Other',
    ];
    res.json({ sources: defaults.map((name, i) => ({ id: `default-${i}`, name, isDefault: true })) });
    return;
  }

  res.json({ sources });
});

// Create lead source (admin only)
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { name } = z.object({
    name: z.string().min(1, 'Name is required'),
  }).parse(req.body);

  // Get organization ID from first lead or create without org for now
  const firstLead = await prisma.lead.findFirst({ select: { organizationId: true } });
  const organizationId = firstLead?.organizationId;

  if (!organizationId) {
    res.status(400).json({ error: 'No organization found' });
    return;
  }

  // Get max sort order
  const maxOrder = await prisma.leadSource.aggregate({
    where: { organizationId },
    _max: { sortOrder: true },
  });

  const source = await prisma.leadSource.create({
    data: {
      organizationId,
      name,
      sortOrder: (maxOrder._max.sortOrder || 0) + 1,
    },
  });

  res.status(201).json(source);
});

// Update lead source (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { name, isActive } = z.object({
    name: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);

  const existing = await prisma.leadSource.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lead source not found' });
    return;
  }

  const source = await prisma.leadSource.update({
    where: { id: req.params.id },
    data: { name, isActive },
  });

  res.json(source);
});

// Reorder lead sources (admin only)
router.patch('/reorder', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { order } = z.object({
    order: z.array(z.string().uuid()),
  }).parse(req.body);

  await Promise.all(
    order.map((id, index) =>
      prisma.leadSource.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  res.json({ message: 'Order updated' });
});

export default router;
```

**Step 2: Register routes in index.ts**

Add import and route registration:

```typescript
import leadSourcesRoutes from './routes/leadSources.routes.js';

// Add with other route registrations
app.use('/api/lead-sources', leadSourcesRoutes);
```

**Step 3: Commit**

```bash
git add backend/src/routes/leadSources.routes.ts backend/src/index.ts
git commit -m "feat(backend): add lead sources management routes"
```

---

## Task 14: Create Notifications Routes

**Files:**
- Create: `backend/src/routes/notifications.routes.ts`
- Modify: `backend/src/index.ts`

**Step 1: Create the notifications routes file**

```typescript
import { Router, Request, Response } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from '../services/notification.service.js';

const router = Router();

// Get user's notifications
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { unreadOnly = 'false', limit = '20' } = req.query;

  const notifications = await getUserNotifications(
    req.user!.id,
    unreadOnly === 'true',
    parseInt(limit as string)
  );

  res.json({ notifications });
});

// Get unread count
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  const count = await getUnreadCount(req.user!.id);
  res.json({ count });
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
  await markNotificationRead(req.params.id, req.user!.id);
  res.json({ message: 'Marked as read' });
});

// Mark all as read
router.patch('/read-all', authenticate, async (req: Request, res: Response) => {
  await markAllNotificationsRead(req.user!.id);
  res.json({ message: 'All marked as read' });
});

export default router;
```

**Step 2: Register routes in index.ts**

```typescript
import notificationsRoutes from './routes/notifications.routes.js';

// Add with other route registrations
app.use('/api/notifications', notificationsRoutes);
```

**Step 3: Commit**

```bash
git add backend/src/routes/notifications.routes.ts backend/src/index.ts
git commit -m "feat(backend): add notifications routes"
```

---

## Task 15: Update Lead Create to Include History Entry

**Files:**
- Modify: `backend/src/routes/leads.routes.ts`

**Step 1: Update the POST / create endpoint**

Modify the existing create endpoint to add history:

```typescript
// Create lead
router.post('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const data = createLeadSchema.parse(req.body);

  // Get organization ID - for now get from first existing lead or user's org membership
  const orgMember = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id },
    select: { organizationId: true },
  });

  if (!orgMember) {
    res.status(400).json({ error: 'User not associated with an organization' });
    return;
  }

  const lead = await prisma.lead.create({
    data: {
      ...data,
      organizationId: orgMember.organizationId,
      designerId: req.user!.id,
      status: 'new',
    },
    include: {
      designer: { select: { id: true, name: true, email: true } },
    },
  });

  // Create initial history entry
  await createLeadHistory({
    leadId: lead.id,
    userId: req.user!.id,
    eventType: 'created',
    note: 'Lead created',
  });

  res.status(201).json(lead);
});
```

**Step 2: Commit**

```bash
git add backend/src/routes/leads.routes.ts
git commit -m "feat(backend): add history entry on lead creation"
```

---

## Task 16: Update Lead List Endpoint with Designer Filter

**Files:**
- Modify: `backend/src/routes/leads.routes.ts`

**Step 1: Update the GET / list endpoint to support designer filter for admins**

```typescript
// List leads
router.get('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { status, projectType, search, designerId, page = '1', limit = '20' } = req.query;

  const where: any = {};

  // Get user's organization
  const orgMember = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id },
    select: { organizationId: true },
  });

  if (orgMember) {
    where.organizationId = orgMember.organizationId;
  }

  // Designers only see their own leads, admin sees all (with optional filter)
  if (req.user!.role === 'designer') {
    where.designerId = req.user!.id;
  } else if (designerId) {
    where.designerId = designerId as string;
  }

  if (status) {
    where.status = status as any;
  }

  if (projectType) {
    where.projectType = projectType as any;
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
```

**Step 2: Commit**

```bash
git add backend/src/routes/leads.routes.ts
git commit -m "feat(backend): add designer filter to lead list for admins"
```

---

## Task 17: Add Dashboard Follow-ups Endpoint

**Files:**
- Modify: `backend/src/routes/leads.routes.ts` or create new dashboard routes

**Step 1: Add follow-ups endpoint at end of leads routes**

```typescript
// Get upcoming follow-ups for dashboard
router.get('/dashboard/followups', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { days = '7' } = req.query;

  const where: any = {
    followUpDate: {
      gte: new Date(),
      lte: new Date(Date.now() + parseInt(days as string) * 24 * 60 * 60 * 1000),
    },
    status: { in: ['on_hold', 'future_client'] },
  };

  // Designers only see their own
  if (req.user!.role === 'designer') {
    where.designerId = req.user!.id;
  }

  const leads = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      projectType: true,
      followUpDate: true,
      followUpReason: true,
      followUpReasonOther: true,
      status: true,
    },
    orderBy: { followUpDate: 'asc' },
    take: 20,
  });

  res.json({ followups: leads });
});

// Get lead stats for dashboard
router.get('/dashboard/stats', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const where: any = {};

  if (req.user!.role === 'designer') {
    where.designerId = req.user!.id;
  }

  const statuses = ['new', 'contacted', 'pre_estimate', 'estimated', 'converted', 'on_hold', 'future_client', 'dropped'];

  const counts = await Promise.all(
    statuses.map(async (status) => ({
      status,
      count: await prisma.lead.count({ where: { ...where, status: status as any } }),
    }))
  );

  res.json({ stats: counts });
});
```

**Step 2: Commit**

```bash
git add backend/src/routes/leads.routes.ts
git commit -m "feat(backend): add dashboard follow-ups and stats endpoints"
```

---

## Task 18: Seed Default Lead Sources

**Files:**
- Modify: `backend/prisma/seed.ts`

**Step 1: Add lead sources seeding**

Add to the seed file:

```typescript
// Seed default lead sources
async function seedLeadSources(organizationId: string) {
  const defaultSources = [
    'Phone Call',
    'Walk-in',
    'Website',
    'Referral',
    'Social Media',
    'Home Show/Event',
    'Other',
  ];

  for (let i = 0; i < defaultSources.length; i++) {
    await prisma.leadSource.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: defaultSources[i],
        },
      },
      update: {},
      create: {
        organizationId,
        name: defaultSources[i],
        sortOrder: i,
      },
    });
  }

  console.log('Lead sources seeded');
}

// Call this in main seed function after organization is created
// await seedLeadSources(organization.id);
```

**Step 2: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(backend): add lead sources seeding"
```

---

## Task 19: Update Frontend Types

**Files:**
- Modify: `frontend/src/types/index.ts`

**Step 1: Update LeadStatus type and add new types**

```typescript
// Lead types - UPDATED
export type LeadStatus = 'new' | 'contacted' | 'pre_estimate' | 'estimated' | 'converted' | 'on_hold' | 'future_client' | 'dropped';
export type SubStatus = 'in_progress' | 'complete';
export type FollowUpReason = 'budget' | 'timing' | 'permits' | 'comparing' | 'personal' | 'other';
export type LeadEventType = 'created' | 'status_change' | 'substatus_change' | 'note_added' | 'photo_uploaded' | 'assigned' | 'followup_set' | 'reactivated';
export type PhotoTag = 'before_photo' | 'measurement' | 'other';

export interface Lead {
  id: string;
  organizationId: string;
  designerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  source?: string;
  status: LeadStatus;
  subStatus?: SubStatus;
  projectType: ProjectType;
  notes?: string;
  followUpDate?: string;
  followUpReason?: FollowUpReason;
  followUpReasonOther?: string;
  createdAt: string;
  updatedAt: string;
  designer?: User;
  history?: LeadHistory[];
  photos?: LeadPhoto[];
}

export interface LeadHistory {
  id: string;
  leadId: string;
  userId: string;
  eventType: LeadEventType;
  oldValue?: string;
  newValue?: string;
  note?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: User;
}

export interface LeadPhoto {
  id: string;
  leadId: string;
  userId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  tag: PhotoTag;
  createdAt: string;
  user?: User;
}

export interface LeadSource {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  isDefault?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}
```

**Step 2: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat(frontend): update types for lead workflow"
```

---

## Task 20: Update Frontend API

**Files:**
- Modify: `frontend/src/lib/api.ts`

**Step 1: Update leadsApi with new endpoints**

```typescript
// Leads API - UPDATED
export const leadsApi = {
  list: (params?: { status?: string; projectType?: string; search?: string; designerId?: string; page?: number; limit?: number }) =>
    api.get('/leads', { params }),

  get: (id: string) => api.get(`/leads/${id}`),

  create: (data: any) => api.post('/leads', data),

  update: (id: string, data: any) => api.put(`/leads/${id}`, data),

  updateStatus: (id: string, data: { status: string; subStatus?: string; note: string; followUpDate?: string; followUpReason?: string; followUpReasonOther?: string }) =>
    api.patch(`/leads/${id}/status`, data),

  assign: (id: string, designerId: string, note?: string) =>
    api.patch(`/leads/${id}/assign`, { designerId, note }),

  addNote: (id: string, note: string) =>
    api.post(`/leads/${id}/notes`, { note }),

  getHistory: (id: string) => api.get(`/leads/${id}/history`),

  uploadPhotos: (id: string, formData: FormData) =>
    api.post(`/leads/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getPhotos: (id: string) => api.get(`/leads/${id}/photos`),

  deletePhoto: (id: string, photoId: string) =>
    api.delete(`/leads/${id}/photos/${photoId}`),

  convert: (id: string) => api.post(`/leads/${id}/convert`),

  delete: (id: string) => api.delete(`/leads/${id}`),

  // Dashboard
  getFollowups: (days?: number) =>
    api.get('/leads/dashboard/followups', { params: { days } }),

  getStats: () => api.get('/leads/dashboard/stats'),
};

// Lead Sources API - NEW
export const leadSourcesApi = {
  list: () => api.get('/lead-sources'),
  create: (name: string) => api.post('/lead-sources', { name }),
  update: (id: string, data: { name?: string; isActive?: boolean }) =>
    api.put(`/lead-sources/${id}`, data),
  reorder: (order: string[]) => api.patch('/lead-sources/reorder', { order }),
};

// Notifications API - NEW
export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; limit?: number }) =>
    api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// Users API - ADD (if not exists)
export const usersApi = {
  list: (params?: { role?: string; search?: string }) =>
    api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
};
```

**Step 2: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(frontend): update API with lead workflow endpoints"
```

---

## Task 21: Create Lead Timeline Component

**Files:**
- Create: `frontend/src/features/leads/components/LeadTimeline.tsx`

**Step 1: Create the timeline component**

```typescript
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  MessageSquare,
  Camera,
  UserPlus,
  ArrowRight,
  Calendar,
  Plus
} from 'lucide-react';
import type { LeadHistory } from '@/types';

const eventIcons: Record<string, React.ElementType> = {
  created: Plus,
  status_change: ArrowRight,
  substatus_change: ArrowRight,
  note_added: MessageSquare,
  photo_uploaded: Camera,
  assigned: UserPlus,
  followup_set: Calendar,
  reactivated: ArrowRight,
};

const eventLabels: Record<string, string> = {
  created: 'Lead Created',
  status_change: 'Status Changed',
  substatus_change: 'Progress Updated',
  note_added: 'Note Added',
  photo_uploaded: 'Photos Uploaded',
  assigned: 'Lead Assigned',
  followup_set: 'Follow-up Scheduled',
  reactivated: 'Lead Reactivated',
};

interface LeadTimelineProps {
  history: LeadHistory[];
}

export default function LeadTimeline({ history }: LeadTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No activity yet
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {history.map((entry, index) => {
          const Icon = eventIcons[entry.eventType] || Clock;
          const isLast = index === history.length - 1;

          return (
            <li key={entry.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                      <Icon className="h-4 w-4 text-gray-500" />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{eventLabels[entry.eventType]}</span>
                        {entry.user && (
                          <span className="text-gray-500"> by {entry.user.name}</span>
                        )}
                      </p>
                      {entry.note && (
                        <p className="mt-1 text-sm text-gray-600">{entry.note}</p>
                      )}
                      {entry.eventType === 'status_change' && entry.oldValue && entry.newValue && (
                        <p className="mt-1 text-xs text-gray-500">
                          {JSON.parse(entry.oldValue).status} → {JSON.parse(entry.newValue).status}
                        </p>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-gray-500">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/features/leads/components/LeadTimeline.tsx
git commit -m "feat(frontend): create LeadTimeline component"
```

---

## Task 22: Create Status Change Modal Component

**Files:**
- Create: `frontend/src/features/leads/components/StatusChangeModal.tsx`

**Step 1: Create the modal component**

```typescript
import { useState } from 'react';
import { X } from 'lucide-react';
import type { LeadStatus, SubStatus, FollowUpReason } from '@/types';

const STATUS_OPTIONS: LeadStatus[] = [
  'new', 'contacted', 'pre_estimate', 'estimated', 'converted', 'on_hold', 'future_client', 'dropped'
];

const SUBSTATUS_OPTIONS: SubStatus[] = ['in_progress', 'complete'];

const FOLLOWUP_REASONS: { value: FollowUpReason; label: string }[] = [
  { value: 'budget', label: 'Budget constraints' },
  { value: 'timing', label: 'Timing not right' },
  { value: 'permits', label: 'Waiting on permits' },
  { value: 'comparing', label: 'Comparing quotes' },
  { value: 'personal', label: 'Personal circumstances' },
  { value: 'other', label: 'Other' },
];

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    status: LeadStatus;
    subStatus?: SubStatus;
    note: string;
    followUpDate?: string;
    followUpReason?: FollowUpReason;
    followUpReasonOther?: string;
  }) => void;
  currentStatus: LeadStatus;
  currentSubStatus?: SubStatus;
  isLoading?: boolean;
}

export default function StatusChangeModal({
  isOpen,
  onClose,
  onSubmit,
  currentStatus,
  currentSubStatus,
  isLoading,
}: StatusChangeModalProps) {
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [subStatus, setSubStatus] = useState<SubStatus | undefined>(currentSubStatus);
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpReason, setFollowUpReason] = useState<FollowUpReason | ''>('');
  const [followUpReasonOther, setFollowUpReasonOther] = useState('');

  if (!isOpen) return null;

  const showSubStatus = ['pre_estimate', 'estimated', 'converted'].includes(status);
  const showFollowUp = ['on_hold', 'future_client'].includes(status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      status,
      subStatus: showSubStatus ? subStatus : undefined,
      note,
      followUpDate: showFollowUp && followUpDate ? followUpDate : undefined,
      followUpReason: showFollowUp && followUpReason ? followUpReason : undefined,
      followUpReasonOther: followUpReason === 'other' ? followUpReasonOther : undefined,
    });
  };

  const setQuickFollowUp = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setFollowUpDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Change Status</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="input"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {showSubStatus && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progress
                </label>
                <select
                  value={subStatus || 'in_progress'}
                  onChange={(e) => setSubStatus(e.target.value as SubStatus)}
                  className="input"
                >
                  {SUBSTATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showFollowUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason *
                  </label>
                  <select
                    value={followUpReason}
                    onChange={(e) => setFollowUpReason(e.target.value as FollowUpReason)}
                    className="input"
                    required
                  >
                    <option value="">Select reason...</option>
                    {FOLLOWUP_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {followUpReason === 'other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specify reason
                    </label>
                    <input
                      type="text"
                      value={followUpReasonOther}
                      onChange={(e) => setFollowUpReasonOther(e.target.value)}
                      className="input"
                      placeholder="Enter reason..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => setQuickFollowUp(7)} className="btn btn-outline btn-sm">
                      1 week
                    </button>
                    <button type="button" onClick={() => setQuickFollowUp(30)} className="btn btn-outline btn-sm">
                      1 month
                    </button>
                    <button type="button" onClick={() => setQuickFollowUp(90)} className="btn btn-outline btn-sm">
                      3 months
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note *
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input"
                rows={3}
                placeholder="Add a note about this status change..."
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn btn-outline flex-1">
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-designer flex-1"
                disabled={isLoading || !note.trim()}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/features/leads/components/StatusChangeModal.tsx
git commit -m "feat(frontend): create StatusChangeModal component"
```

---

## Task 23: Create Photo Upload Component

**Files:**
- Create: `frontend/src/features/leads/components/PhotoUploader.tsx`

**Step 1: Create the component**

```typescript
import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { leadsApi } from '@/lib/api';

interface PhotoUploaderProps {
  leadId: string;
}

export default function PhotoUploader({ leadId }: PhotoUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('photos', file));
      formData.append('tag', 'before_photo');
      return leadsApi.uploadPhotos(leadId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-photos', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-history', leadId] });
      setSelectedFiles([]);
      setPreviews([]);
      toast.success('Photos uploaded successfully');
    },
    onError: () => {
      toast.error('Failed to upload photos');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;
    uploadMutation.mutate(selectedFiles);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => cameraInputRef.current?.click()}
          className="btn btn-outline flex-1"
        >
          <Camera className="w-4 h-4 mr-2" />
          Take Photo
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-outline flex-1"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </button>
      </div>

      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {previews.map((preview, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            className="btn btn-designer w-full"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/features/leads/components/PhotoUploader.tsx
git commit -m "feat(frontend): create PhotoUploader component"
```

---

## Task 24: Create Photo Grid Component

**Files:**
- Create: `frontend/src/features/leads/components/PhotoGrid.tsx`

**Step 1: Create the component**

```typescript
import { useState } from 'react';
import { Trash2, X, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { leadsApi } from '@/lib/api';
import type { LeadPhoto } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface PhotoGridProps {
  leadId: string;
  photos: LeadPhoto[];
}

export default function PhotoGrid({ leadId, photos }: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<LeadPhoto | null>(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => leadsApi.deletePhoto(leadId, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-photos', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-history', leadId] });
      setSelectedPhoto(null);
      toast.success('Photo deleted');
    },
    onError: () => {
      toast.error('Failed to delete photo');
    },
  });

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No photos uploaded yet
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-designer-500 transition-all"
          >
            <img
              src={photo.filePath}
              alt={photo.fileName}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-4xl max-h-[80vh] mx-4">
            <img
              src={selectedPhoto.filePath}
              alt={selectedPhoto.fileName}
              className="max-w-full max-h-[70vh] object-contain"
            />
            <div className="mt-4 flex items-center justify-between text-white">
              <div>
                <p className="text-sm opacity-75">
                  Uploaded {formatDistanceToNow(new Date(selectedPhoto.createdAt), { addSuffix: true })}
                  {selectedPhoto.user && ` by ${selectedPhoto.user.name}`}
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(selectedPhoto.id)}
                disabled={deleteMutation.isPending}
                className="btn bg-red-500 hover:bg-red-600 text-white"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/features/leads/components/PhotoGrid.tsx
git commit -m "feat(frontend): create PhotoGrid component"
```

---

## Task 25: Create Notification Bell Component

**Files:**
- Create: `frontend/src/components/layout/NotificationBell.tsx`

**Step 1: Create the component**

```typescript
import { useState } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { notificationsApi } from '@/lib/api';
import { getBasePath } from '@/lib/utils';
import type { Notification } from '@/types';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getBasePath(location.pathname);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const response = await notificationsApi.getUnreadCount();
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationsApi.list({ limit: 10 });
      return response.data;
    },
    enabled: isOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.entityType === 'lead' && notification.entityId) {
      navigate(`${basePath}/leads/${notification.entityId}`);
    }
    setIsOpen(false);
  };

  const unreadCount = countData?.count || 0;
  const notifications = notificationsData?.notifications || [];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-xs text-designer-600 hover:text-designer-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications
                </div>
              ) : (
                notifications.map((notification: Notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 ${
                      !notification.isRead ? 'bg-designer-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-designer-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/layout/NotificationBell.tsx
git commit -m "feat(frontend): create NotificationBell component"
```

---

## Task 26: Create Follow-ups Dashboard Widget

**Files:**
- Create: `frontend/src/features/dashboard/FollowUpsWidget.tsx`

**Step 1: Create the widget component**

```typescript
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ArrowRight } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { leadsApi } from '@/lib/api';
import { getBasePath } from '@/lib/utils';

export default function FollowUpsWidget() {
  const location = useLocation();
  const basePath = getBasePath(location.pathname);

  const { data, isLoading } = useQuery({
    queryKey: ['followups'],
    queryFn: async () => {
      const response = await leadsApi.getFollowups(7);
      return response.data;
    },
  });

  const followups = data?.followups || [];

  const formatFollowUpDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d');
  };

  const getReasonLabel = (reason?: string) => {
    const labels: Record<string, string> = {
      budget: 'Budget',
      timing: 'Timing',
      permits: 'Permits',
      comparing: 'Comparing',
      personal: 'Personal',
      other: 'Other',
    };
    return reason ? labels[reason] || reason : '';
  };

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Follow-ups</h2>
        </div>
        <Link
          to={`${basePath}/leads?status=on_hold,future_client`}
          className="text-sm text-designer-600 hover:text-designer-700 font-medium flex items-center gap-1"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-4 text-center text-gray-500">Loading...</div>
      ) : followups.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No upcoming follow-ups
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {followups.map((lead: any) => (
            <Link
              key={lead.id}
              to={`${basePath}/leads/${lead.id}`}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {lead.firstName} {lead.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  {lead.projectType.charAt(0).toUpperCase() + lead.projectType.slice(1)}
                  {lead.followUpReason && ` • ${getReasonLabel(lead.followUpReason)}`}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-medium ${
                  isToday(new Date(lead.followUpDate))
                    ? 'text-red-600'
                    : isTomorrow(new Date(lead.followUpDate))
                    ? 'text-yellow-600'
                    : 'text-gray-600'
                }`}>
                  {formatFollowUpDate(lead.followUpDate)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/features/dashboard/FollowUpsWidget.tsx
git commit -m "feat(frontend): create FollowUpsWidget component"
```

---

## Task 27: Update LeadsListPage with New Statuses

**Files:**
- Modify: `frontend/src/features/leads/LeadsListPage.tsx`

**Step 1: Update the STATUS_OPTIONS array and status rendering**

Update the existing file to use the new statuses:

```typescript
const STATUS_OPTIONS: LeadStatus[] = [
  'new', 'contacted', 'pre_estimate', 'estimated', 'converted', 'on_hold', 'future_client', 'dropped'
];
```

Also update the status dropdown in LeadRow to open the StatusChangeModal instead of direct status change. Add the modal import and state management.

**Step 2: Commit**

```bash
git add frontend/src/features/leads/LeadsListPage.tsx
git commit -m "feat(frontend): update LeadsListPage with new statuses"
```

---

## Task 28: Create Lead Detail Page with Timeline

**Files:**
- Create: `frontend/src/features/leads/LeadDetailPage.tsx`

**Step 1: Create the comprehensive lead detail page**

This is a large component - create with tabs for Details, Timeline, Photos, and Notes. Include:
- Lead information header
- Status change button with modal
- Assignment dropdown (admin only)
- Timeline tab with LeadTimeline component
- Photos tab with PhotoUploader and PhotoGrid
- Pre-Estimate section when status is pre_estimate
- Measurements text area

**Step 2: Commit**

```bash
git add frontend/src/features/leads/LeadDetailPage.tsx
git commit -m "feat(frontend): create LeadDetailPage with timeline and photos"
```

---

## Task 29: Update App Router with New Routes

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Add routes for lead detail page**

Ensure routes exist for:
- `/admin/leads/:id` -> LeadDetailPage
- `/designer/leads/:id` -> LeadDetailPage

**Step 2: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): add lead detail routes"
```

---

## Task 30: Update Designer Layout with Notification Bell

**Files:**
- Modify: `frontend/src/components/layout/DesignerLayout.tsx`
- Modify: `frontend/src/components/layout/AdminLayout.tsx`

**Step 1: Add NotificationBell to header**

Import and add the NotificationBell component to both layouts in the header section.

**Step 2: Commit**

```bash
git add frontend/src/components/layout/DesignerLayout.tsx frontend/src/components/layout/AdminLayout.tsx
git commit -m "feat(frontend): add notification bell to layouts"
```

---

## Task 31: Update Designer Dashboard with Follow-ups Widget

**Files:**
- Modify: `frontend/src/features/dashboard/DesignerDashboard.tsx`

**Step 1: Add FollowUpsWidget to dashboard**

Import and add the FollowUpsWidget component, replacing or alongside the static mock data.

**Step 2: Commit**

```bash
git add frontend/src/features/dashboard/DesignerDashboard.tsx
git commit -m "feat(frontend): add follow-ups widget to dashboard"
```

---

## Task 32: Update Lead Form Page

**Files:**
- Modify: `frontend/src/features/leads/LeadFormPage.tsx`

**Step 1: Update source field to use lead sources from API**

Fetch lead sources from API and populate the source dropdown.

**Step 2: Commit**

```bash
git add frontend/src/features/leads/LeadFormPage.tsx
git commit -m "feat(frontend): update lead form with dynamic sources"
```

---

## Task 33: Add Admin Designer Filter to Leads List

**Files:**
- Modify: `frontend/src/features/leads/LeadsListPage.tsx`

**Step 1: Add designer filter dropdown for admin users**

- Fetch designers list from users API
- Add dropdown filter that only shows for admin role
- Pass designerId filter to API

**Step 2: Commit**

```bash
git add frontend/src/features/leads/LeadsListPage.tsx
git commit -m "feat(frontend): add designer filter for admin users"
```

---

## Task 34: Create Lead Sources Settings Page

**Files:**
- Create: `frontend/src/features/admin/LeadSourcesPage.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create settings page for managing lead sources**

CRUD interface for lead sources with drag-drop reordering.

**Step 2: Add route**

Add route `/admin/settings/lead-sources` -> LeadSourcesPage

**Step 3: Commit**

```bash
git add frontend/src/features/admin/LeadSourcesPage.tsx frontend/src/App.tsx
git commit -m "feat(frontend): add lead sources settings page"
```

---

## Task 35: Final Testing and Cleanup

**Step 1: Run backend**

```bash
cd backend && npm run dev
```

Verify no errors in console.

**Step 2: Run frontend**

```bash
cd frontend && npm run dev
```

Verify no errors in console.

**Step 3: Test key flows**

1. Create a new lead as designer
2. Change status with note
3. Upload photos to pre-estimate
4. As admin, assign lead to designer
5. Verify notifications
6. Check timeline shows all actions

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete lead status workflow enhancement"
```

---

## Summary

This plan implements the complete lead status workflow with:
- 8 status types with sub-statuses for Pre-Estimate, Estimated, Converted
- Full timeline/history tracking
- Photo upload for pre-estimate workflow
- Designer assignment with notifications
- Follow-up reminders with dashboard widget
- Configurable lead sources
- Role-based visibility (designers see only their leads)

Total tasks: 35
Estimated implementation: Follow task-by-task with TDD approach where applicable.
