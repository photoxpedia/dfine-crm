import { Router, Request, Response } from 'express';
import prisma from '../config/database.js';
import stripe, { STRIPE_WEBHOOK_SECRET } from '../config/stripe.js';
import { authenticate, requireDesignerOrAdmin } from '../middleware/auth.js';
import { PaymentMilestone, PaymentStatus } from '@prisma/client';
import * as invoiceService from '../services/invoice.service.js';
import { createNotification } from '../services/notification.service.js';

const router = Router();

const PAYMENT_MILESTONES: { milestone: PaymentMilestone; percentage: number }[] = [
  { milestone: 'contract_signing', percentage: 30 },
  { milestone: 'project_start', percentage: 30 },
  { milestone: 'midpoint', percentage: 30 },
  { milestone: 'completion', percentage: 10 },
];

// Milestone ordering for determining "next" milestone
const MILESTONE_ORDER: PaymentMilestone[] = [
  'contract_signing',
  'project_start',
  'midpoint',
  'completion',
];

// Auto-create invoice for the next unpaid milestone after a payment is completed
async function autoCreateNextInvoice(projectId: string, completedScheduleId: string): Promise<void> {
  try {
    // Find the completed schedule's milestone to determine its position
    const completedSchedule = await prisma.paymentSchedule.findUnique({
      where: { id: completedScheduleId },
    });

    if (!completedSchedule) return;

    const completedIndex = MILESTONE_ORDER.indexOf(completedSchedule.milestone);
    if (completedIndex < 0 || completedIndex >= MILESTONE_ORDER.length - 1) return;

    // Find the next milestone in order
    const nextMilestone = MILESTONE_ORDER[completedIndex + 1];

    const nextSchedule = await prisma.paymentSchedule.findFirst({
      where: {
        projectId,
        milestone: nextMilestone,
        status: 'pending',
      },
    });

    if (!nextSchedule) return;

    // Check if an invoice already exists for this schedule
    const existingInvoice = await prisma.invoice.findFirst({
      where: { scheduleId: nextSchedule.id },
    });

    if (existingInvoice) return;

    // Create invoice for the next milestone
    await invoiceService.createInvoiceFromSchedule(nextSchedule.id);
  } catch (error) {
    console.error('Error auto-creating invoice for next milestone:', error);
  }
}

// Check if all payment schedules for a project are completed, and if so, auto-complete the project
async function checkAndCompleteProject(projectId: string): Promise<void> {
  try {
    const allSchedules = await prisma.paymentSchedule.findMany({
      where: { projectId },
    });

    if (allSchedules.length === 0) return;

    const allCompleted = allSchedules.every((s) => s.status === 'completed');
    if (!allCompleted) return;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, status: true, designerId: true },
    });

    if (!project || project.status === 'completed') return;

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'completed', completedAt: new Date() },
    });

    // Notify the project designer
    await createNotification({
      userId: project.designerId,
      type: 'project_completed',
      title: 'Project Completed',
      message: `All payments received for ${project.name}. Project marked as completed.`,
      entityType: 'project',
      entityId: project.id,
    });
  } catch (error) {
    console.error('Error auto-completing project:', error);
  }
}

// ==================== STRIPE WEBHOOK (must be before authenticate) ====================

router.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(500).json({ error: 'Stripe not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    res.status(400).json({ error: 'Missing signature or webhook secret' });
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  // Helper to map Stripe price ID to plan name
  function mapPriceToPlan(stripePriceId: string): 'starter' | 'professional' | 'enterprise' | null {
    const { STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_ENTERPRISE_PRICE_ID } = process.env;
    if (stripePriceId === STRIPE_STARTER_PRICE_ID) return 'starter';
    if (stripePriceId === STRIPE_PRO_PRICE_ID) return 'professional';
    if (stripePriceId === STRIPE_ENTERPRISE_PRICE_ID) return 'enterprise';
    return null;
  }

  // ==================== PROJECT PAYMENT EVENTS ====================

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const stripeSessionId = session.id;

    // Find the payment by stripeSessionId (for one-time project payments)
    const payment = await prisma.payment.findFirst({
      where: { stripeSessionId },
    });

    if (payment) {
      // Mark payment as completed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          stripePaymentIntentId: session.payment_intent,
          paidAt: new Date(),
          paymentMethod: 'stripe',
        },
      });

      // Update schedule status if applicable
      if (payment.scheduleId) {
        const schedule = await prisma.paymentSchedule.findUnique({
          where: { id: payment.scheduleId },
        });

        if (schedule) {
          const completedPayments = await prisma.payment.aggregate({
            where: {
              scheduleId: payment.scheduleId,
              status: 'completed',
            },
            _sum: { amount: true },
          });

          const totalPaid = Number(completedPayments._sum.amount || 0);
          const amountDue = Number(schedule.amountDue);

          if (totalPaid >= amountDue) {
            await prisma.paymentSchedule.update({
              where: { id: payment.scheduleId },
              data: { status: 'completed' },
            });

            // Auto-create invoice for the next unpaid milestone
            await autoCreateNextInvoice(payment.projectId, payment.scheduleId);

            // Check if all payments are completed and auto-complete the project
            await checkAndCompleteProject(payment.projectId);
          }
        }
      }
    }
  }

  // ==================== SUBSCRIPTION WEBHOOK EVENTS ====================

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any;
    const customerId = subscription.customer as string;
    const stripePriceId = subscription.items?.data?.[0]?.price?.id;
    const plan = stripePriceId ? mapPriceToPlan(stripePriceId) : null;

    const org = await prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (org) {
      // Map Stripe subscription status to our SubscriptionStatus enum
      const statusMap: Record<string, 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing'> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'unpaid',
        trialing: 'trialing',
      };
      const mappedStatus = statusMap[subscription.status] || 'active';

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          subscriptionStatus: mappedStatus,
          ...(plan ? { subscriptionPlan: plan } : {}),
        },
      });

      // Upsert the Subscription record
      const existingSub = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

      const subData = {
        stripePriceId: stripePriceId || null,
        status: mappedStatus,
        ...(plan ? { plan } : {}),
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      };

      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: subData,
        });
      } else {
        await prisma.subscription.create({
          data: {
            organizationId: org.id,
            stripeSubscriptionId: subscription.id,
            plan: plan || 'starter',
            ...subData,
          },
        });
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;
    const customerId = subscription.customer as string;

    const org = await prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (org) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { subscriptionStatus: 'canceled' },
      });

      const existingSub = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            status: 'canceled',
            canceledAt: new Date(),
          },
        });
      }
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as any;
    const customerId = invoice.customer as string;

    const org = await prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (org) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { subscriptionStatus: 'past_due' },
      });

      if (invoice.subscription) {
        const existingSub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: invoice.subscription as string },
        });
        if (existingSub) {
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: { status: 'past_due' },
          });
        }
      }
    }
  }

  res.json({ received: true });
});

// ==================== STRIPE CHECKOUT ====================

router.post('/checkout/:scheduleId', authenticate, async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(500).json({ error: 'Stripe payments are not configured' });
    return;
  }

  const { scheduleId } = req.params;

  const schedule = await prisma.paymentSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      project: {
        select: { id: true, name: true, clientId: true, organizationId: true },
      },
    },
  });

  if (!schedule) {
    res.status(404).json({ error: 'Payment schedule not found' });
    return;
  }

  // Verify client access
  if (req.user!.role === 'client' && schedule.project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  if (schedule.status === 'completed') {
    res.status(400).json({ error: 'This payment has already been completed' });
    return;
  }

  const amountCents = Math.round(Number(schedule.amountDue) * 100);
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${schedule.project.name} - ${schedule.milestone.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
              description: `Payment for ${schedule.project.name}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payment/cancel`,
      metadata: {
        scheduleId: schedule.id,
        projectId: schedule.projectId,
      },
    });

    // Create a pending payment record linked to this session
    await prisma.payment.create({
      data: {
        scheduleId: schedule.id,
        projectId: schedule.projectId,
        amount: schedule.amountDue,
        paymentMethod: 'stripe',
        stripeSessionId: session.id,
        status: 'processing',
      },
    });

    // Update schedule status to processing
    await prisma.paymentSchedule.update({
      where: { id: schedule.id },
      data: { status: 'processing' },
    });

    res.json({ sessionUrl: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ==================== EXISTING ROUTES ====================

// Get payment schedule for a project
router.get('/schedule/:projectId', authenticate, async (req: Request, res: Response) => {
  const { projectId } = req.params;

  // Check access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { designerId: true, clientId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (req.user!.role === 'client' && project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const schedules = await prisma.paymentSchedule.findMany({
    where: { projectId },
    orderBy: { milestone: 'asc' },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Calculate summary
  let totalDue = 0;
  let totalPaid = 0;

  for (const schedule of schedules) {
    totalDue += Number(schedule.amountDue);
    const paidAmount = schedule.payments
      .filter((p: { status: string }) => p.status === 'completed')
      .reduce((sum: number, p: { amount: any }) => sum + Number(p.amount), 0);
    totalPaid += paidAmount;
  }

  const summary = {
    totalDue,
    totalPaid,
    totalRemaining: totalDue - totalPaid,
  };

  res.json({ schedules, summary });
});

// Generate payment schedule for a project
router.post('/schedule/:projectId', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      estimates: {
        where: { status: 'approved' },
        orderBy: { approvedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Check if schedule already exists
  const existingSchedule = await prisma.paymentSchedule.count({
    where: { projectId },
  });

  if (existingSchedule > 0) {
    res.status(400).json({ error: 'Payment schedule already exists for this project' });
    return;
  }

  // Get total from approved estimate
  const approvedEstimate = project.estimates[0];
  if (!approvedEstimate) {
    res.status(400).json({ error: 'No approved estimate found for this project' });
    return;
  }

  const total = Number(approvedEstimate.total);

  // Create payment schedule
  const scheduleItems = await Promise.all(
    PAYMENT_MILESTONES.map(({ milestone, percentage }) =>
      prisma.paymentSchedule.create({
        data: {
          projectId,
          milestone,
          percentage,
          amountDue: total * (percentage / 100),
          status: 'pending',
        },
      })
    )
  );

  res.status(201).json({ schedule: scheduleItems });
});

// Record a payment (manual - for admin/designer recording offline payments)
router.post('/', authenticate, async (req: Request, res: Response) => {
  const { scheduleId, projectId, amount, paymentMethod, notes } = req.body;

  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientId: true, designerId: true },
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Only client or admin/designer can record payment
  if (req.user!.role === 'client' && project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // For admin/designer recording manual payments, mark as completed immediately
  const isManualRecording = req.user!.role !== 'client';
  const status = isManualRecording ? 'completed' : 'pending';

  const payment = await prisma.payment.create({
    data: {
      scheduleId,
      projectId,
      amount,
      paymentMethod: paymentMethod || 'manual',
      notes,
      status,
      paidAt: isManualRecording ? new Date() : undefined,
    },
  });

  // Notify the project designer about the payment
  if (isManualRecording && project.designerId && project.designerId !== req.user!.id) {
    createNotification({
      userId: project.designerId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `A payment of $${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} has been recorded for the project`,
      entityType: 'project',
      entityId: projectId,
    }).catch(err => console.error('Notification failed:', err));
  } else if (!isManualRecording && project.designerId) {
    // Client made the payment, notify the designer
    createNotification({
      userId: project.designerId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `A payment of $${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} has been submitted by the client`,
      entityType: 'project',
      entityId: projectId,
    }).catch(err => console.error('Notification failed:', err));
  }

  // If manual payment completed, update schedule status
  if (isManualRecording && scheduleId) {
    const schedule = await prisma.paymentSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (schedule) {
      const completedPayments = await prisma.payment.aggregate({
        where: {
          scheduleId,
          status: 'completed',
        },
        _sum: { amount: true },
      });

      const totalPaid = Number(completedPayments._sum.amount || 0);
      const amountDue = Number(schedule.amountDue);

      if (totalPaid >= amountDue) {
        await prisma.paymentSchedule.update({
          where: { id: scheduleId },
          data: { status: 'completed' },
        });

        // Auto-create invoice for the next unpaid milestone
        await autoCreateNextInvoice(projectId, scheduleId);

        // Check if all payments are completed and auto-complete the project
        await checkAndCompleteProject(projectId);
      }
    }
  }

  res.status(201).json(payment);
});

// Update payment status (mark as completed, etc.)
router.patch('/:id', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { status, paidAt } = req.body;

  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
  });

  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  const updateData: any = { status };
  if (status === 'completed' && !payment.paidAt) {
    updateData.paidAt = paidAt ? new Date(paidAt) : new Date();
  }

  const updated = await prisma.payment.update({
    where: { id: req.params.id },
    data: updateData,
  });

  // Update schedule status if payment completed
  if (status === 'completed' && payment.scheduleId) {
    const schedule = await prisma.paymentSchedule.findUnique({
      where: { id: payment.scheduleId },
    });

    if (schedule) {
      // Sum all completed payments for this schedule
      const completedPayments = await prisma.payment.aggregate({
        where: {
          scheduleId: payment.scheduleId,
          status: 'completed',
        },
        _sum: { amount: true },
      });

      const totalPaid = Number(completedPayments._sum.amount || 0);
      const amountDue = Number(schedule.amountDue);

      if (totalPaid >= amountDue) {
        await prisma.paymentSchedule.update({
          where: { id: payment.scheduleId },
          data: { status: 'completed' },
        });

        // Auto-create invoice for the next unpaid milestone
        await autoCreateNextInvoice(payment.projectId, payment.scheduleId);

        // Check if all payments are completed and auto-complete the project
        await checkAndCompleteProject(payment.projectId);
      }
    }
  }

  res.json(updated);
});

// Get all payments (admin view)
router.get('/', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const { projectId, status, page = '1', limit = '20' } = req.query;

  const where: any = {};
  if (projectId) where.projectId = projectId as string;
  if (status) where.status = status as PaymentStatus;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        schedule: { select: { milestone: true, amountDue: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({
    payments,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// Get payment details
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: {
      project: {
        select: { id: true, name: true, clientId: true, designerId: true },
      },
      schedule: true,
    },
  });

  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  // Check access
  if (req.user!.role === 'client' && payment.project.clientId !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(payment);
});

export default router;
