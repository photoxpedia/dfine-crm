import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../config/database.js';
import { authenticate, requireDesignerOrAdmin, requireAdmin } from '../middleware/auth.js';
import * as estimatesService from '../services/estimates.service.js';
import * as paymentService from '../services/payment.service.js';
import * as invoiceService from '../services/invoice.service.js';
import { sendEmail } from '../config/email.js';
import { EstimateStatus, UnitOfMeasure, ProjectType } from '@prisma/client';
import { createNotification } from '../services/notification.service.js';

const router = Router();

const nullToUndefined = <T>(val: T | null | undefined): T | undefined =>
  val === null ? undefined : val;

const addLineItemSchema = z.object({
  pricingItemId: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable().transform(nullToUndefined),
  unitOfMeasure: z.nativeEnum(UnitOfMeasure).optional(),
  quantity: z.coerce.number().min(0).optional(),
  contractorCost: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  productUrl: z.string().optional().nullable().transform((val) => {
    if (!val || val.trim() === '') return undefined;
    return val;
  }),
  imageUrl: z.string().optional().nullable().transform((val) => {
    if (!val || val.trim() === '') return undefined;
    return val;
  }),
  notes: z.string().optional().nullable().transform(nullToUndefined),
});

const updateLineItemSchema = addLineItemSchema.partial();

// List recent estimates across all projects (for copy-from picker)
router.get('/recent', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { excludeProjectId } = req.query;

  const where: any = {};

  if (req.user!.role === 'designer') {
    where.project = { designerId: req.user!.id };
  }

  if (excludeProjectId) {
    where.projectId = { not: excludeProjectId as string };
  }

  const estimates = await prisma.estimate.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, projectType: true } },
      _count: { select: { sections: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  res.json({ estimates });
});

// List estimates for a project
router.get('/project/:projectId', authenticate, async (req: Request, res: Response) => {
  const { projectId } = req.params;

  // Check project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true, clientId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (
    req.user!.role === 'designer' && project.designerId !== req.user!.id ||
    req.user!.role === 'client' && project.clientId !== req.user!.id
  ) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const estimates = await prisma.estimate.findMany({
    where: { projectId },
    include: {
      sections: { select: { id: true, name: true } },
      _count: { select: { sections: true } },
    },
    orderBy: { version: 'desc' },
  });

  res.json({ estimates });
});

// Get single estimate with full details
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const estimate = await estimatesService.getEstimate(req.params.id);

  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  // Check access
  if (
    req.user!.role === 'designer' && estimate.project.designerId !== req.user!.id ||
    req.user!.role === 'client' && estimate.project.clientId !== req.user!.id
  ) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // If client is viewing, mark as viewed
  if (req.user!.role === 'client' && !estimate.viewedAt) {
    await prisma.estimate.update({
      where: { id: estimate.id },
      data: { viewedAt: new Date() },
    });
  }

  res.json(estimate);
});

// Create new estimate
router.post('/project/:projectId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { name, marginPercentage, fromTemplate } = req.body;

  // Check project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true, projectType: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (req.user!.role === 'designer' && project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  let estimate;
  if (fromTemplate) {
    estimate = await estimatesService.createEstimateFromTemplate(
      projectId,
      project.projectType as 'bathroom' | 'kitchen' | 'general',
      marginPercentage || 40
    );
  } else {
    estimate = await estimatesService.createEstimate(projectId, marginPercentage || 40, name);
  }

  res.status(201).json(estimate);
});

// Add section to estimate
router.post('/:id/sections', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { name, categoryId } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Section name is required' });
    return;
  }

  const estimate = await estimatesService.getEstimate(req.params.id);
  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  if (req.user!.role === 'designer' && estimate.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const section = await estimatesService.addSection(req.params.id, name, categoryId);
  res.status(201).json(section);
});

// Update section
router.put('/:id/sections/:sectionId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { name, sortOrder } = req.body;

  const section = await prisma.estimateSection.findUnique({
    where: { id: req.params.sectionId },
    include: { estimate: { include: { project: { select: { designerId: true } } } } },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found' });
    return;
  }

  if (req.user!.role === 'designer' && section.estimate.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const updated = await prisma.estimateSection.update({
    where: { id: req.params.sectionId },
    data: { name, sortOrder },
  });

  res.json(updated);
});

// Delete section
router.delete('/:id/sections/:sectionId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const section = await prisma.estimateSection.findUnique({
    where: { id: req.params.sectionId },
    include: { estimate: { include: { project: { select: { designerId: true } } } } },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found' });
    return;
  }

  if (req.user!.role === 'designer' && section.estimate.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  await prisma.estimateSection.delete({ where: { id: req.params.sectionId } });
  await estimatesService.recalculateTotals(section.estimateId);

  res.json({ message: 'Section deleted' });
});

// Add line item
router.post('/:id/items', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { sectionId, ...data } = req.body;

  if (!sectionId) {
    res.status(400).json({ error: 'Section ID is required' });
    return;
  }

  const parsedData = addLineItemSchema.parse(data);

  const section = await prisma.estimateSection.findUnique({
    where: { id: sectionId },
    include: { estimate: { include: { project: { select: { designerId: true } } } } },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found' });
    return;
  }

  if (req.user!.role === 'designer' && section.estimate.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const lineItem = await estimatesService.addLineItem(sectionId, parsedData);
  res.status(201).json(lineItem);
});

// Update line item
router.put('/:id/items/:itemId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const data = updateLineItemSchema.parse(req.body);

  const lineItem = await prisma.estimateLineItem.findUnique({
    where: { id: req.params.itemId },
    include: {
      section: { include: { estimate: { include: { project: { select: { designerId: true } } } } } },
    },
  });

  if (!lineItem) {
    res.status(404).json({ error: 'Line item not found' });
    return;
  }

  if (req.user!.role === 'designer' && lineItem.section.estimate.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const updated = await estimatesService.updateLineItem(req.params.itemId, data);
  res.json(updated);
});

// Delete line item
router.delete('/:id/items/:itemId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const lineItem = await prisma.estimateLineItem.findUnique({
    where: { id: req.params.itemId },
    include: {
      section: { include: { estimate: { include: { project: { select: { designerId: true } } } } } },
    },
  });

  if (!lineItem) {
    res.status(404).json({ error: 'Line item not found' });
    return;
  }

  if (req.user!.role === 'designer' && lineItem.section.estimate.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  await estimatesService.deleteLineItem(req.params.itemId);
  res.json({ message: 'Line item deleted' });
});

// Recalculate totals
router.post('/:id/calculate', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const estimate = await estimatesService.recalculateTotals(req.params.id);
  res.json(estimate);
});

// Apply margin to all items
router.post('/:id/apply-margin', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { marginPercentage } = req.body;

  if (typeof marginPercentage !== 'number' || marginPercentage < 0 || marginPercentage >= 100) {
    res.status(400).json({ error: 'Invalid margin percentage' });
    return;
  }

  const estimate = await estimatesService.applyMarginToEstimate(req.params.id, marginPercentage);
  res.json(estimate);
});

// Apply discount
router.post('/:id/discount', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { discountType, discountValue } = req.body;

  const estimate = await estimatesService.getEstimate(req.params.id);
  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  if (req.user!.role === 'designer' && estimate.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  if (discountType && !['percentage', 'fixed'].includes(discountType)) {
    res.status(400).json({ error: 'Invalid discount type' });
    return;
  }

  const result = await estimatesService.applyDiscount(
    req.params.id,
    discountType || null,
    parseFloat(discountValue) || 0
  );

  res.json(result);
});

// Update estimate settings (scope of work, county licensing, etc.)
router.put('/:id/settings', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { scopeOfWork, countyLicensing, projectStartDate, notes, validUntil } = req.body;

  const estimate = await estimatesService.getEstimate(req.params.id);
  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  if (req.user!.role === 'designer' && estimate.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  await estimatesService.updateEstimateSettings(req.params.id, {
    scopeOfWork,
    countyLicensing,
    projectStartDate: projectStartDate ? new Date(projectStartDate) : undefined,
    notes,
    validUntil: validUntil ? new Date(validUntil) : undefined,
  });

  const updated = await estimatesService.getEstimate(req.params.id);
  res.json(updated);
});

// Update estimate status
router.patch('/:id/status', authenticate, async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.nativeEnum(EstimateStatus) }).parse(req.body);

  const estimate = await estimatesService.getEstimate(req.params.id);
  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  // Clients can only approve or reject
  if (req.user!.role === 'client') {
    if (!['approved', 'rejected'].includes(status)) {
      res.status(403).json({ error: 'Clients can only approve or reject estimates' });
      return;
    }
    if (estimate.project.clientId !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
  } else if (req.user!.role === 'designer') {
    if (estimate.project.designerId !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
  }

  const updated = await estimatesService.updateEstimateStatus(req.params.id, status);
  res.json(updated);
});

// Duplicate estimate
router.post('/:id/duplicate', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const estimate = await estimatesService.getEstimate(req.params.id);
  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  if (req.user!.role === 'designer' && estimate.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const newEstimate = await estimatesService.duplicateEstimate(req.params.id);
  res.status(201).json(newEstimate);
});

// Duplicate estimate to another project
router.post('/:id/duplicate-to/:projectId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const estimate = await estimatesService.getEstimate(req.params.id);
  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  // Check source access
  if (req.user!.role === 'designer' && estimate.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Check target project access
  const targetProject = await prisma.project.findUnique({
    where: { id: req.params.projectId },
    select: { designerId: true },
  });

  if (!targetProject) {
    res.status(404).json({ error: 'Target project not found' });
    return;
  }

  if (req.user!.role === 'designer' && targetProject.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied to target project' });
    return;
  }

  const newEstimate = await estimatesService.duplicateEstimate(req.params.id, req.params.projectId);
  res.status(201).json(newEstimate);
});

// Delete estimate
router.delete('/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const estimate = await estimatesService.getEstimate(req.params.id);
  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  if (req.user!.role === 'designer' && estimate.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Delete all line items in all sections first
  for (const section of estimate.sections) {
    await prisma.estimateLineItem.deleteMany({ where: { sectionId: section.id } });
  }

  // Delete all sections
  await prisma.estimateSection.deleteMany({ where: { estimateId: req.params.id } });

  // Delete the estimate
  await prisma.estimate.delete({ where: { id: req.params.id } });

  res.json({ message: 'Estimate deleted' });
});

// ============ FINALIZATION & APPROVAL ENDPOINTS ============

// Finalize estimate and send for approval
router.post('/:id/finalize', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { sendEmail: shouldSendEmail = true } = req.body;

  // Get estimate with full project and lead info
  const estimate = await prisma.estimate.findUnique({
    where: { id: req.params.id },
    include: {
      project: {
        include: {
          client: true,
          designer: true,
          lead: true, // Include lead for fallback contact info
        },
      },
      sections: {
        include: { lineItems: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  if (req.user!.role === 'designer' && estimate.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Check estimate has items
  const hasItems = estimate.sections.some((s: { lineItems: unknown[] }) => s.lineItems.length > 0);
  if (!hasItems) {
    res.status(400).json({ error: 'Estimate must have at least one line item' });
    return;
  }

  // Allow re-sending rejected estimates
  if (estimate.status === 'rejected' || estimate.status === 'draft') {
    // OK to proceed
  } else if (estimate.status === 'sent' || estimate.status === 'viewed') {
    // Allow resending
  } else {
    res.status(400).json({ error: 'Estimate cannot be finalized in its current status' });
    return;
  }

  // Get client info - either from assigned client or from the lead
  const clientEmail = estimate.project.client?.email || estimate.project.lead?.email;
  const clientName = estimate.project.client?.name ||
    (estimate.project.lead ? `${estimate.project.lead.firstName} ${estimate.project.lead.lastName}` : null);

  // Check we have some way to contact the client (if sending email)
  if (shouldSendEmail && !clientEmail) {
    res.status(400).json({ error: 'No client email available. Please add a client or update lead email before finalizing.' });
    return;
  }

  // Generate approval token
  const approvalToken = crypto.randomBytes(32).toString('hex');
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30); // Valid for 30 days

  // Update estimate
  const updatedEstimate = await prisma.estimate.update({
    where: { id: req.params.id },
    data: {
      status: 'sent',
      sentAt: new Date(),
      approvalToken,
      validUntil,
    },
    include: {
      project: {
        include: {
          client: true,
          designer: true,
          lead: true,
        },
      },
      sections: {
        include: { lineItems: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  // Create payment schedule (30/30/30/10)
  const total = parseFloat(estimate.total.toString());
  await paymentService.createPaymentSchedule(estimate.project.id, total);

  // Auto-create invoice for the first milestone (contract_signing)
  try {
    const firstMilestone = await prisma.paymentSchedule.findFirst({
      where: {
        projectId: estimate.project.id,
        milestone: 'contract_signing',
      },
    });

    if (firstMilestone) {
      await invoiceService.createInvoiceFromSchedule(firstMilestone.id);
    }
  } catch (invoiceError) {
    // Log error but don't fail the finalization
    console.error('Error auto-creating invoice for first milestone:', invoiceError);
  }

  // Send email to client (use lead email as fallback)
  const recipientEmail = updatedEstimate.project.client?.email || updatedEstimate.project.lead?.email;
  if (shouldSendEmail && recipientEmail) {
    const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/estimate/approve/${approvalToken}`;
    const recipientName = clientName || 'Valued Customer';
    const projectName = updatedEstimate.project.name;
    const designerName = updatedEstimate.project.designer?.name || 'Our Team';

    await sendEmail({
      to: recipientEmail,
      subject: `Estimate Ready for Review - ${projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">D'Fine Kitchen & Bath</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937;">Your Estimate is Ready!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Dear ${recipientName},
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              Great news! Your estimate for <strong>${projectName}</strong> has been prepared by ${designerName} and is ready for your review.
            </p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280;">Estimate Total:</p>
              <p style="font-size: 28px; font-weight: bold; color: #7c3aed; margin: 10px 0;">
                $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">Valid until ${validUntil.toLocaleDateString()}</p>
            </div>
            <p style="color: #4b5563; line-height: 1.6;">
              Please review the estimate and click below to approve or provide feedback.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approvalUrl}" style="background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Review Estimate
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
              If you have any questions, please don't hesitate to reach out to us.
            </p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              D'Fine Kitchen & Bath Remodeling<br>
              123 Main Street, Ellicott City, MD 21042<br>
              (410) 555-1234 | info@dfinekb.com
            </p>
          </div>
        </div>
      `,
    });
  }

  // Notify the designer that the estimate was sent
  if (estimate.project.designerId && estimate.project.designerId !== req.user!.id) {
    createNotification({
      userId: estimate.project.designerId,
      type: 'estimate_sent',
      title: 'Estimate Sent',
      message: `Estimate for ${estimate.project.name} has been sent to the client`,
      entityType: 'estimate',
      entityId: estimate.id,
    }).catch(err => console.error('Notification failed:', err));
  }

  res.json({
    ...updatedEstimate,
    approvalUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/estimate/approve/${approvalToken}`,
  });
});

// Public endpoint - Get estimate by approval token (no auth required)
router.get('/approval/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  const estimate = await prisma.estimate.findUnique({
    where: { approvalToken: token },
    include: {
      project: {
        include: {
          client: { select: { id: true, name: true, email: true } },
          designer: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      sections: {
        include: { lineItems: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found or link expired' });
    return;
  }

  // Check if expired
  if (estimate.validUntil && new Date() > estimate.validUntil) {
    await prisma.estimate.update({
      where: { id: estimate.id },
      data: { status: 'expired' },
    });
    res.status(410).json({ error: 'This estimate has expired' });
    return;
  }

  // Mark as viewed if not already
  if (!estimate.viewedAt) {
    await prisma.estimate.update({
      where: { id: estimate.id },
      data: { viewedAt: new Date(), status: 'viewed' },
    });
  }

  res.json(estimate);
});

// Public endpoint - Approve estimate (no auth required, uses token)
router.post('/approval/:token/approve', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { signature, approvedBy } = req.body;

  const estimate = await prisma.estimate.findUnique({
    where: { approvalToken: token },
    include: {
      project: {
        include: {
          client: true,
          designer: true,
        },
      },
    },
  });

  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found or link expired' });
    return;
  }

  // Check if already approved/rejected
  if (estimate.status === 'approved') {
    res.status(400).json({ error: 'Estimate has already been approved' });
    return;
  }
  if (estimate.status === 'rejected') {
    res.status(400).json({ error: 'Estimate has already been rejected' });
    return;
  }

  // Check if expired
  if (estimate.validUntil && new Date() > estimate.validUntil) {
    res.status(410).json({ error: 'This estimate has expired' });
    return;
  }

  // Update estimate status (including signature data if provided)
  const updated = await prisma.estimate.update({
    where: { id: estimate.id },
    data: {
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: approvedBy || estimate.project.client?.name || 'Client',
      signatureData: signature || null,
    },
  });

  // Update project status to approved
  await prisma.project.update({
    where: { id: estimate.projectId },
    data: { status: 'approved' },
  });

  // Create a contract Document record linked to the estimate
  try {
    const creatorId = estimate.project.client?.id || estimate.project.designerId;

    const document = await prisma.document.create({
      data: {
        projectId: estimate.projectId,
        estimateId: estimate.id,
        createdById: creatorId,
        type: 'contract',
        name: `Contract - ${estimate.project.name || 'Estimate'} (Approved)`,
        status: 'signed',
      },
    });

    // Create a Signature record if we have signature data AND a client user
    if (signature && estimate.project.client?.id) {
      await prisma.signature.create({
        data: {
          documentId: document.id,
          userId: estimate.project.client.id,
          signatureData: signature,
          ipAddress: req.ip || req.headers['x-forwarded-for'] as string || null,
          userAgent: req.headers['user-agent'] || null,
          signedAt: new Date(),
        },
      });
    }
  } catch (docError) {
    // Log error but don't fail the approval
    console.error('Error creating contract document/signature:', docError);
  }

  // Auto-generate materials from estimate line items
  try {
    const estimateWithItems = await prisma.estimate.findUnique({
      where: { id: estimate.id },
      include: {
        sections: {
          include: {
            lineItems: true,
          },
        },
      },
    });

    if (estimateWithItems?.sections) {
      const now = new Date();
      const materialItemsToCreate = [];

      for (const section of estimateWithItems.sections) {
        for (const lineItem of section.lineItems) {
          // Create a material item for each line item
          materialItemsToCreate.push({
            projectId: estimate.projectId,
            estimateLineItemId: lineItem.id,
            name: lineItem.name,
            description: lineItem.description,
            quantity: lineItem.quantity,
            unit: lineItem.unitOfMeasure,
            productUrl: lineItem.productUrl,
            imageUrl: lineItem.imageUrl,
            estimatedCost: lineItem.totalContractor,
            purchaseStatus: 'pending' as const,
            isPurchaseable: true,
            readyToPurchaseAt: now,
          });
        }
      }

      // Bulk create all material items
      if (materialItemsToCreate.length > 0) {
        await prisma.materialItem.createMany({
          data: materialItemsToCreate,
        });
      }
    }
  } catch (materialError) {
    // Log error but don't fail the approval
    console.error('Error auto-generating materials:', materialError);
  }

  // Send confirmation email
  if (estimate.project.client?.email) {
    await sendEmail({
      to: estimate.project.client.email,
      subject: `Estimate Approved - ${estimate.project.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Estimate Approved!</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <p style="color: #4b5563; line-height: 1.6;">
              Thank you for approving the estimate for <strong>${estimate.project.name}</strong>.
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              Our team will be in touch shortly to schedule the project start date and arrange the deposit payment.
            </p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <h3 style="margin-top: 0; color: #1f2937;">Payment Schedule</h3>
              <ul style="color: #4b5563; line-height: 1.8;">
                <li>30% Deposit - Due upon signing</li>
                <li>30% - Due at project start</li>
                <li>30% - Due at midpoint</li>
                <li>10% - Due upon completion</li>
              </ul>
            </div>
            <p style="color: #4b5563; line-height: 1.6;">
              If you have any questions, please contact your designer or call us.
            </p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              D'Fine Kitchen & Bath Remodeling<br>
              (410) 555-1234 | info@dfinekb.com
            </p>
          </div>
        </div>
      `,
    });
  }

  // Notify designer
  if (estimate.project.designer?.email) {
    await sendEmail({
      to: estimate.project.designer.email,
      subject: `Client Approved Estimate - ${estimate.project.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #10b981; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">Estimate Approved!</h2>
          </div>
          <div style="padding: 20px;">
            <p>${estimate.project.client?.name || 'The client'} has approved the estimate for <strong>${estimate.project.name}</strong>.</p>
            <p>Total: <strong>$${parseFloat(estimate.total.toString()).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></p>
            <p>Please schedule the project start date and send the deposit invoice.</p>
          </div>
        </div>
      `,
    });
  }

  // Create in-app notification for the designer
  if (estimate.project.designerId) {
    createNotification({
      userId: estimate.project.designerId,
      type: 'estimate_approved',
      title: 'Estimate Approved',
      message: `${estimate.project.client?.name || 'The client'} approved the estimate for ${estimate.project.name}`,
      entityType: 'estimate',
      entityId: estimate.id,
    }).catch(err => console.error('Notification failed:', err));
  }

  res.json({
    message: 'Estimate approved successfully',
    estimate: updated,
  });
});

// Public endpoint - Reject estimate (no auth required, uses token)
router.post('/approval/:token/reject', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { reason } = req.body;

  const estimate = await prisma.estimate.findUnique({
    where: { approvalToken: token },
    include: {
      project: {
        include: {
          client: true,
          designer: true,
        },
      },
    },
  });

  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found or link expired' });
    return;
  }

  // Check if already approved/rejected
  if (estimate.status === 'approved') {
    res.status(400).json({ error: 'Estimate has already been approved' });
    return;
  }
  if (estimate.status === 'rejected') {
    res.status(400).json({ error: 'Estimate has already been rejected' });
    return;
  }

  // Update estimate status
  const updated = await prisma.estimate.update({
    where: { id: estimate.id },
    data: {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason: reason || null,
    },
  });

  // Notify designer
  if (estimate.project.designer?.email) {
    await sendEmail({
      to: estimate.project.designer.email,
      subject: `Estimate Needs Revision - ${estimate.project.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f59e0b; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">Estimate Feedback Received</h2>
          </div>
          <div style="padding: 20px;">
            <p>${estimate.project.client?.name || 'The client'} has requested changes to the estimate for <strong>${estimate.project.name}</strong>.</p>
            ${reason ? `<div style="background: #fef3c7; padding: 15px; border-radius: 4px; margin: 15px 0;"><strong>Feedback:</strong><br>${reason}</div>` : ''}
            <p>Please review and create a revised estimate.</p>
          </div>
        </div>
      `,
    });
  }

  // Create in-app notification for the designer
  if (estimate.project.designerId) {
    createNotification({
      userId: estimate.project.designerId,
      type: 'estimate_rejected',
      title: 'Estimate Needs Revision',
      message: `${estimate.project.client?.name || 'The client'} requested changes to the estimate for ${estimate.project.name}${reason ? `: ${reason}` : ''}`,
      entityType: 'estimate',
      entityId: estimate.id,
    }).catch(err => console.error('Notification failed:', err));
  }

  res.json({
    message: 'Feedback submitted successfully',
    estimate: updated,
  });
});

// ============ ADMIN MAINTENANCE ENDPOINTS ============

// Fix all line items with quantity = 0 (admin only)
router.post('/admin/fix-zero-quantities', authenticate, requireAdmin, async (req: Request, res: Response) => {
  // Find all line items with quantity = 0
  const zeroQtyItems = await prisma.estimateLineItem.findMany({
    where: {
      quantity: 0,
    },
    include: {
      section: {
        select: { estimateId: true },
      },
    },
  });

  if (zeroQtyItems.length === 0) {
    res.json({
      message: 'No items found with quantity = 0',
      itemsFixed: 0,
      estimatesRecalculated: 0,
    });
    return;
  }

  // Get unique estimate IDs that need recalculation
  const estimateIds = [...new Set(zeroQtyItems.map(item => item.section.estimateId))];

  // Update all items to quantity = 1 and recalculate their totals
  let itemsFixed = 0;
  for (const item of zeroQtyItems) {
    const contractorCost = parseFloat(item.contractorCost.toString());
    const sellingPrice = parseFloat(item.sellingPrice.toString());
    const quantity = 1;

    await prisma.estimateLineItem.update({
      where: { id: item.id },
      data: {
        quantity: quantity,
        totalContractor: contractorCost * quantity,
        totalSelling: sellingPrice * quantity,
      },
    });
    itemsFixed++;
  }

  // Recalculate totals for all affected estimates
  for (const estimateId of estimateIds) {
    await estimatesService.recalculateTotals(estimateId);
  }

  res.json({
    message: `Fixed ${itemsFixed} items and recalculated ${estimateIds.length} estimates`,
    itemsFixed,
    estimatesRecalculated: estimateIds.length,
    estimateIds,
  });
});

export default router;
