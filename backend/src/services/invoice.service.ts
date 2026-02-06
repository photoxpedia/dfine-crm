import prisma from '../config/database.js';
import { Prisma, InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Utility functions
function toDecimal(value: number | string | Decimal): Decimal {
  return new Prisma.Decimal(value);
}

function decimalToNumber(value: Decimal | null): number {
  return value ? parseFloat(value.toString()) : 0;
}

// Generate unique invoice number
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Get the last invoice number for this year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: 'desc' },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

// Create an invoice from a payment schedule
export async function createInvoiceFromSchedule(scheduleId: string, dueDate?: Date) {
  const schedule = await prisma.paymentSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      project: {
        include: {
          client: true,
        },
      },
    },
  });

  if (!schedule) {
    throw new Error('Payment schedule not found');
  }

  const invoiceNumber = await generateInvoiceNumber();
  const amount = decimalToNumber(schedule.amountDue);

  // Default due date is 30 days from now
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      projectId: schedule.projectId,
      scheduleId: schedule.id,
      amount: toDecimal(amount),
      status: 'draft',
      dueDate: dueDate || defaultDueDate,
    },
    include: {
      project: {
        include: {
          client: true,
          designer: true,
        },
      },
      schedule: true,
    },
  });

  return invoice;
}

// Create a manual invoice (not tied to payment schedule)
export async function createManualInvoice(
  projectId: string,
  amount: number,
  dueDate?: Date,
  notes?: string
) {
  const invoiceNumber = await generateInvoiceNumber();

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      projectId,
      amount: toDecimal(amount),
      status: 'draft',
      dueDate: dueDate || defaultDueDate,
      notes,
    },
    include: {
      project: {
        include: {
          client: true,
          designer: true,
        },
      },
    },
  });

  return invoice;
}

// Get invoice by ID
export async function getInvoice(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      project: {
        include: {
          client: true,
          designer: true,
        },
      },
      schedule: true,
    },
  });
}

// Get invoices with filters
export async function getInvoices(params: {
  projectId?: string;
  status?: InvoiceStatus;
  page?: number;
  limit?: number;
}) {
  const { projectId, status, page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.InvoiceWhereInput = {};
  if (projectId) where.projectId = projectId;
  if (status) where.status = status;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        project: {
          include: {
            client: true,
          },
        },
        schedule: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    invoices,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

// Update invoice status
export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  paidAt?: Date
) {
  const updateData: Prisma.InvoiceUpdateInput = { status };

  if (status === 'sent' && !paidAt) {
    updateData.sentAt = new Date();
  }
  if (status === 'paid') {
    updateData.paidAt = paidAt || new Date();
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: updateData,
    include: {
      project: {
        include: {
          client: true,
        },
      },
      schedule: true,
    },
  });
}

// Mark invoice as sent
export async function markInvoiceSent(invoiceId: string) {
  return updateInvoiceStatus(invoiceId, 'sent');
}

// Mark invoice as paid
export async function markInvoicePaid(invoiceId: string, paidAt?: Date) {
  const invoice = await updateInvoiceStatus(invoiceId, 'paid', paidAt);

  // Also update the payment schedule if linked
  if (invoice.scheduleId) {
    await prisma.paymentSchedule.update({
      where: { id: invoice.scheduleId },
      data: { status: 'completed' },
    });
  }

  return invoice;
}

// Update invoice PDF URL
export async function updateInvoicePdfUrl(invoiceId: string, pdfUrl: string) {
  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { pdfUrl },
  });
}

// Check and update overdue invoices
export async function checkOverdueInvoices(): Promise<number> {
  const now = new Date();
  const result = await prisma.invoice.updateMany({
    where: {
      status: 'sent',
      dueDate: { lt: now },
    },
    data: {
      status: 'overdue',
    },
  });

  return result.count;
}

// Delete invoice (only drafts)
export async function deleteInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Can only delete draft invoices');
  }

  await prisma.invoice.delete({
    where: { id: invoiceId },
  });

  return true;
}

// Get invoice summary for dashboard
export async function getInvoiceDashboardSummary() {
  const [draft, sent, paid, overdue] = await Promise.all([
    prisma.invoice.aggregate({
      where: { status: 'draft' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { status: 'sent' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { status: 'overdue' },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    draftAmount: decimalToNumber(draft._sum.amount),
    draftCount: draft._count,
    sentAmount: decimalToNumber(sent._sum.amount),
    sentCount: sent._count,
    paidAmount: decimalToNumber(paid._sum.amount),
    paidCount: paid._count,
    overdueAmount: decimalToNumber(overdue._sum.amount),
    overdueCount: overdue._count,
  };
}
