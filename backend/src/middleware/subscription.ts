import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

// Plan limits
const PLAN_LIMITS: Record<string, { members: number; projects: number; leads: number }> = {
  starter: { members: 3, projects: 50, leads: 200 },
  professional: { members: 10, projects: -1, leads: -1 }, // -1 = unlimited
  enterprise: { members: -1, projects: -1, leads: -1 },
};

// Helper to get user's organization and subscription info
async function getOrgSubscription(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, isDefault: true },
    include: {
      organization: {
        select: {
          id: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          trialEndsAt: true,
        },
      },
    },
  });

  return membership?.organization || null;
}

/**
 * Middleware: Require active subscription (active or trialing with valid trial)
 * Use on routes that should be blocked when subscription expires.
 */
export function requireActiveSubscription(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Clients don't need subscription checks
  if (req.user.role === 'client') {
    next();
    return;
  }

  getOrgSubscription(req.user.id)
    .then((org) => {
      if (!org) {
        res.status(403).json({ error: 'No organization found' });
        return;
      }

      const { subscriptionStatus, trialEndsAt } = org;

      // Active subscription - allow
      if (subscriptionStatus === 'active') {
        next();
        return;
      }

      // Trialing - check if trial hasn't expired
      if (subscriptionStatus === 'trialing') {
        if (trialEndsAt && new Date() > trialEndsAt) {
          res.status(403).json({
            error: 'Your free trial has expired. Please upgrade to continue.',
            code: 'TRIAL_EXPIRED',
          });
          return;
        }
        next();
        return;
      }

      // Past due - allow with warning header
      if (subscriptionStatus === 'past_due') {
        res.setHeader('X-Subscription-Warning', 'past_due');
        next();
        return;
      }

      // Canceled or unpaid - block
      res.status(403).json({
        error: 'Your subscription is inactive. Please reactivate to continue.',
        code: 'SUBSCRIPTION_INACTIVE',
      });
    })
    .catch((error) => {
      console.error('Subscription check error:', error);
      // Fail open - don't block users due to middleware errors
      next();
    });
}

/**
 * Middleware factory: Enforce plan limits for creating resources
 * Usage: requirePlanLimit('projects') or requirePlanLimit('members')
 */
export function requirePlanLimit(resource: 'members' | 'projects' | 'leads') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Clients don't need plan limit checks
    if (req.user.role === 'client') {
      next();
      return;
    }

    getOrgSubscription(req.user.id)
      .then(async (org) => {
        if (!org) {
          res.status(403).json({ error: 'No organization found' });
          return;
        }

        const limits = PLAN_LIMITS[org.subscriptionPlan] || PLAN_LIMITS.starter;
        const limit = limits[resource];

        // Unlimited
        if (limit === -1) {
          next();
          return;
        }

        // Count current usage
        let currentCount = 0;
        switch (resource) {
          case 'members':
            currentCount = await prisma.organizationMember.count({
              where: { organizationId: org.id },
            });
            break;
          case 'projects':
            currentCount = await prisma.project.count({
              where: { organizationId: org.id },
            });
            break;
          case 'leads':
            currentCount = await prisma.lead.count({
              where: { organizationId: org.id },
            });
            break;
        }

        if (currentCount >= limit) {
          res.status(403).json({
            error: `You've reached the ${resource} limit for your ${org.subscriptionPlan} plan (${limit}). Please upgrade to add more.`,
            code: 'PLAN_LIMIT_REACHED',
            limit,
            current: currentCount,
            plan: org.subscriptionPlan,
          });
          return;
        }

        next();
      })
      .catch((error) => {
        console.error('Plan limit check error:', error);
        // Fail open
        next();
      });
  };
}
