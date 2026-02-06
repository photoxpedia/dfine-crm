import prisma from '../config/database.js';
import { Prisma, PaymentMilestone, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Utility functions
function toDecimal(value: number | string | Decimal): Decimal {
  return new Prisma.Decimal(value);
}

function decimalToNumber(value: Decimal | null): number {
  return value ? parseFloat(value.toString()) : 0;
}

// Payment split configuration (30/30/30/10)
const PAYMENT_MILESTONES: { milestone: PaymentMilestone; percentage: number }[] = [
  { milestone: 'contract_signing', percentage: 30 },
  { milestone: 'project_start', percentage: 30 },
  { milestone: 'midpoint', percentage: 30 },
  { milestone: 'completion', percentage: 10 },
];

// Create payment schedule for a project
export async function createPaymentSchedule(
  projectId: string,
  totalAmount: number
): Promise<void> {
  // Delete any existing payment schedules for this project
  await prisma.paymentSchedule.deleteMany({
    where: { projectId },
  });

  // Create new payment schedules
  for (const { milestone, percentage } of PAYMENT_MILESTONES) {
    const amountDue = (totalAmount * percentage) / 100;
    await prisma.paymentSchedule.create({
      data: {
        projectId,
        milestone,
        percentage: toDecimal(percentage),
        amountDue: toDecimal(amountDue),
        status: 'pending',
      },
    });
  }
}

// Get payment schedule for a project
export async function getPaymentSchedule(projectId: string) {
  const schedules = await prisma.paymentSchedule.findMany({
    where: { projectId },
    include: {
      payments: true,
      invoices: true,
    },
    orderBy: {
      milestone: 'asc',
    },
  });

  // Calculate payment summary
  const summary = {
    totalDue: 0,
    totalPaid: 0,
    totalRemaining: 0,
    nextPayment: null as typeof schedules[0] | null,
  };

  for (const schedule of schedules) {
    const amountDue = decimalToNumber(schedule.amountDue);
    const paidAmount = schedule.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + decimalToNumber(p.amount), 0);

    summary.totalDue += amountDue;
    summary.totalPaid += paidAmount;

    if (schedule.status === 'pending' && !summary.nextPayment) {
      summary.nextPayment = schedule;
    }
  }

  summary.totalRemaining = summary.totalDue - summary.totalPaid;

  return { schedules, summary };
}

// Update payment schedule status
export async function updatePaymentScheduleStatus(
  scheduleId: string,
  status: PaymentStatus,
  dueDate?: Date
): Promise<void> {
  await prisma.paymentSchedule.update({
    where: { id: scheduleId },
    data: {
      status,
      dueDate,
    },
  });
}

// Mark payment schedule as invoiced
export async function markScheduleInvoiced(scheduleId: string): Promise<void> {
  await prisma.paymentSchedule.update({
    where: { id: scheduleId },
    data: {
      status: 'invoiced',
    },
  });
}

// Record a payment
export async function recordPayment(
  scheduleId: string,
  projectId: string,
  amount: number,
  paymentMethod: string,
  notes?: string
) {
  const payment = await prisma.payment.create({
    data: {
      scheduleId,
      projectId,
      amount: toDecimal(amount),
      paymentMethod,
      status: 'completed',
      paidAt: new Date(),
      notes,
    },
  });

  // Check if full amount has been paid for this schedule
  const schedule = await prisma.paymentSchedule.findUnique({
    where: { id: scheduleId },
    include: { payments: true },
  });

  if (schedule) {
    const totalPaid = schedule.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + decimalToNumber(p.amount), 0);
    const amountDue = decimalToNumber(schedule.amountDue);

    if (totalPaid >= amountDue) {
      await prisma.paymentSchedule.update({
        where: { id: scheduleId },
        data: { status: 'completed' },
      });
    }
  }

  return payment;
}

// Get all payments for a project
export async function getProjectPayments(projectId: string) {
  return prisma.payment.findMany({
    where: { projectId },
    include: {
      schedule: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

// Update payment status
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  paidAt?: Date
) {
  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      status,
      paidAt: paidAt || (status === 'completed' ? new Date() : undefined),
    },
  });
}

// Check and update overdue payments
export async function checkOverduePayments(): Promise<number> {
  const now = new Date();
  const result = await prisma.paymentSchedule.updateMany({
    where: {
      status: { in: ['pending', 'invoiced'] },
      dueDate: { lt: now },
    },
    data: {
      status: 'overdue',
    },
  });

  return result.count;
}

// Send payment reminder
export async function markReminderSent(scheduleId: string): Promise<void> {
  await prisma.paymentSchedule.update({
    where: { id: scheduleId },
    data: {
      reminderSent: true,
      lastReminder: new Date(),
    },
  });
}

// Get overdue payment schedules
export async function getOverduePayments() {
  return prisma.paymentSchedule.findMany({
    where: {
      status: 'overdue',
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
}

// Get payment summary for dashboard
export async function getPaymentDashboardSummary() {
  const [pending, completed, overdue] = await Promise.all([
    prisma.paymentSchedule.aggregate({
      where: { status: { in: ['pending', 'invoiced'] } },
      _sum: { amountDue: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { status: 'completed' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.paymentSchedule.aggregate({
      where: { status: 'overdue' },
      _sum: { amountDue: true },
      _count: true,
    }),
  ]);

  return {
    pendingAmount: decimalToNumber(pending._sum.amountDue),
    pendingCount: pending._count,
    completedAmount: decimalToNumber(completed._sum.amount),
    completedCount: completed._count,
    overdueAmount: decimalToNumber(overdue._sum.amountDue),
    overdueCount: overdue._count,
  };
}
