import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate, requireDesignerOrAdmin } from '../middleware/auth.js';
import * as invoiceService from '../services/invoice.service.js';
import { sendEmail } from '../config/email.js';
import { InvoiceStatus } from '@prisma/client';

const router = Router();

// List all invoices
router.get('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, status, page = '1', limit = '20' } = req.query;

  const result = await invoiceService.getInvoices({
    projectId: projectId as string | undefined,
    status: status as InvoiceStatus | undefined,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
  });

  res.json(result);
});

// Get single invoice
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const invoice = await invoiceService.getInvoice(req.params.id);

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  // Check access for non-admins
  if (req.user!.role === 'designer' && invoice.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  if (req.user!.role === 'client' && invoice.project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(invoice);
});

// Create invoice from payment schedule
router.post('/from-schedule/:scheduleId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { scheduleId } = req.params;
  const { dueDate } = req.body;

  try {
    const invoice = await invoiceService.createInvoiceFromSchedule(
      scheduleId,
      dueDate ? new Date(dueDate) : undefined
    );
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Create manual invoice
router.post('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const schema = z.object({
    projectId: z.string().uuid(),
    amount: z.number().positive(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
  });

  const parsed = schema.parse(req.body);

  // Check project access
  const project = await prisma.project.findUnique({
    where: { id: parsed.projectId },
    select: { designerId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (req.user!.role === 'designer' && project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const invoice = await invoiceService.createManualInvoice(
    parsed.projectId,
    parsed.amount,
    parsed.dueDate ? new Date(parsed.dueDate) : undefined,
    parsed.notes
  );

  res.status(201).json(invoice);
});

// Update invoice status
router.patch('/:id/status', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const schema = z.object({
    status: z.nativeEnum(InvoiceStatus),
    paidAt: z.string().optional(),
  });

  const { status, paidAt } = schema.parse(req.body);

  const invoice = await invoiceService.getInvoice(req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  if (req.user!.role === 'designer' && invoice.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const updated = await invoiceService.updateInvoiceStatus(
    req.params.id,
    status,
    paidAt ? new Date(paidAt) : undefined
  );

  res.json(updated);
});

// Send invoice to client
router.post('/:id/send', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const invoice = await invoiceService.getInvoice(req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  if (req.user!.role === 'designer' && invoice.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  if (!invoice.project.client?.email) {
    res.status(400).json({ error: 'Client does not have an email address' });
    return;
  }

  // Send email
  const clientName = invoice.project.client.name || 'Valued Customer';
  const amount = parseFloat(invoice.amount.toString());
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt';

  await sendEmail({
    to: invoice.project.client.email,
    subject: `Invoice ${invoice.invoiceNumber} - ${invoice.project.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">D'Fine Kitchen & Bath</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Invoice ${invoice.invoiceNumber}</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Dear ${clientName},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Please find your invoice for <strong>${invoice.project.name}</strong> below.
          </p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280;">Amount Due:</p>
            <p style="font-size: 28px; font-weight: bold; color: #059669; margin: 10px 0;">
              $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 14px;">Due: ${dueDate}</p>
          </div>
          ${invoice.notes ? `<p style="color: #4b5563; line-height: 1.6;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
          <div style="background: #fef3c7; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Payment Methods:</strong><br>
              Check: Make payable to "D'Fine Kitchen & Bath Remodeling"<br>
              Credit Card: Contact us for a secure payment link
            </p>
          </div>
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
            If you have any questions about this invoice, please contact us.
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

  // Update invoice status to sent
  const updated = await invoiceService.markInvoiceSent(req.params.id);

  res.json({ message: 'Invoice sent', invoice: updated });
});

// Mark invoice as paid
router.post('/:id/mark-paid', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { paidAt } = req.body;

  const invoice = await invoiceService.getInvoice(req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  if (req.user!.role === 'designer' && invoice.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const updated = await invoiceService.markInvoicePaid(
    req.params.id,
    paidAt ? new Date(paidAt) : undefined
  );

  res.json(updated);
});

// Delete invoice (draft only)
router.delete('/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const invoice = await invoiceService.getInvoice(req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  if (req.user!.role === 'designer' && invoice.project.designerId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    await invoiceService.deleteInvoice(req.params.id);
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Get dashboard summary
router.get('/summary/dashboard', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const summary = await invoiceService.getInvoiceDashboardSummary();
  res.json(summary);
});

// Get invoices for a project
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

  const invoices = await prisma.invoice.findMany({
    where: { projectId },
    include: {
      schedule: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ invoices });
});

export default router;
