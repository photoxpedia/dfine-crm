import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import { authenticate, requireAdmin, requireDesignerOrAdmin } from '../middleware/auth.js';
import { requireActiveSubscription, requirePlanLimit } from '../middleware/subscription.js';
import { sendEmail } from '../config/email.js';
import { generateToken, AuthUser } from '../middleware/auth.js';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const router = Router();
const INVITE_EXPIRY_DAYS = 7;
const SALT_ROUNDS = 10;

// Helper to get user's org
async function getUserOrg(userId: string) {
  return prisma.organizationMember.findFirst({
    where: { userId, isDefault: true },
    select: { organizationId: true, role: true },
  });
}

// ==================== ORGANIZATION ====================

// Get current organization
router.get('/', authenticate, async (req: Request, res: Response) => {
  const userOrg = await getUserOrg(req.user!.id);
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: userOrg.organizationId },
    include: {
      _count: { select: { members: true, projects: true, leads: true } },
    },
  });

  res.json(organization);
});

// Update organization (admin only)
router.put('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const userOrg = await getUserOrg(req.user!.id);
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    website: z.string().url().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
  });

  const data = updateSchema.parse(req.body);

  const organization = await prisma.organization.update({
    where: { id: userOrg.organizationId },
    data,
  });

  res.json(organization);
});

// ==================== MEMBERS ====================

// List members
router.get('/members', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  const userOrg = await getUserOrg(req.user!.id);
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: userOrg.organizationId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ members });
});

// Update member role (admin only)
router.put('/members/:memberId', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const userOrg = await getUserOrg(req.user!.id);
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const { role } = z.object({ role: z.enum(['admin', 'member']) }).parse(req.body);

  const member = await prisma.organizationMember.findFirst({
    where: { id: req.params.memberId, organizationId: userOrg.organizationId },
  });

  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  // Can't change the owner
  if (member.role === 'owner') {
    res.status(400).json({ error: 'Cannot change the owner role' });
    return;
  }

  // Can't change yourself
  if (member.userId === req.user!.id) {
    res.status(400).json({ error: 'Cannot change your own role' });
    return;
  }

  const updated = await prisma.organizationMember.update({
    where: { id: member.id },
    data: { role },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
  });

  res.json(updated);
});

// Remove member (admin only)
router.delete('/members/:memberId', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const userOrg = await getUserOrg(req.user!.id);
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const member = await prisma.organizationMember.findFirst({
    where: { id: req.params.memberId, organizationId: userOrg.organizationId },
    include: { user: { select: { id: true } } },
  });

  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  if (member.role === 'owner') {
    res.status(400).json({ error: 'Cannot remove the organization owner' });
    return;
  }

  if (member.userId === req.user!.id) {
    res.status(400).json({ error: 'Cannot remove yourself' });
    return;
  }

  await prisma.organizationMember.delete({ where: { id: member.id } });

  res.json({ message: 'Member removed' });
});

// ==================== INVITES ====================

// List pending invites
router.get('/invites', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const userOrg = await getUserOrg(req.user!.id);
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const invites = await prisma.organizationInvite.findMany({
    where: {
      organizationId: userOrg.organizationId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      invitedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ invites });
});

// Send invite (admin only)
router.post('/invites', authenticate, requireAdmin, requireActiveSubscription, requirePlanLimit('members'), async (req: Request, res: Response) => {
  const userOrg = await getUserOrg(req.user!.id);
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const inviteSchema = z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum(['admin', 'member']).default('member'),
    userRole: z.enum(['admin', 'designer']).default('designer'),
  });

  const { email, role, userRole } = inviteSchema.parse(req.body);
  const normalizedEmail = email.toLowerCase().trim();

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    const existingMember = await prisma.organizationMember.findFirst({
      where: { organizationId: userOrg.organizationId, userId: existingUser.id },
    });
    if (existingMember) {
      res.status(400).json({ error: 'This person is already a member of your organization' });
      return;
    }
  }

  // Check for existing pending invite
  const existingInvite = await prisma.organizationInvite.findFirst({
    where: {
      organizationId: userOrg.organizationId,
      email: normalizedEmail,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    res.status(400).json({ error: 'An invite has already been sent to this email' });
    return;
  }

  // Get org name for the email
  const org = await prisma.organization.findUnique({
    where: { id: userOrg.organizationId },
    select: { name: true },
  });

  // Create the invite
  const token = uuidv4();
  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId: userOrg.organizationId,
      email: normalizedEmail,
      role,
      token,
      invitedById: req.user!.id,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
    include: {
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Send invite email
  const inviteUrl = `${process.env.APP_URL || 'http://localhost:5174'}/invite/accept?token=${token}`;
  await sendEmail({
    to: normalizedEmail,
    subject: `You're invited to join ${org?.name || 'our organization'}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #8B5CF6;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer { margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>You're invited to join ${org?.name || 'our organization'}</h2>
            <p>${req.user!.name} has invited you to join their team as a ${userRole}.</p>
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${inviteUrl}</p>
            <p><strong>This invitation expires in ${INVITE_EXPIRY_DAYS} days.</strong></p>
            <div class="footer">
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  res.status(201).json(invite);
});

// Revoke invite (admin only)
router.delete('/invites/:inviteId', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const userOrg = await getUserOrg(req.user!.id);
  if (!userOrg) {
    res.status(400).json({ error: 'User must belong to an organization' });
    return;
  }

  const invite = await prisma.organizationInvite.findFirst({
    where: { id: req.params.inviteId, organizationId: userOrg.organizationId },
  });

  if (!invite) {
    res.status(404).json({ error: 'Invite not found' });
    return;
  }

  await prisma.organizationInvite.delete({ where: { id: invite.id } });

  res.json({ message: 'Invite revoked' });
});

// ==================== ACCEPT INVITE (PUBLIC) ====================

// Verify invite token (public - no auth required)
router.get('/invites/verify', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: {
      organization: { select: { id: true, name: true } },
      invitedBy: { select: { name: true } },
    },
  });

  if (!invite) {
    res.status(404).json({ error: 'Invalid invitation' });
    return;
  }

  if (invite.acceptedAt) {
    res.status(400).json({ error: 'This invitation has already been accepted' });
    return;
  }

  if (new Date() > invite.expiresAt) {
    res.status(400).json({ error: 'This invitation has expired' });
    return;
  }

  res.json({
    email: invite.email,
    organizationName: invite.organization.name,
    invitedBy: invite.invitedBy.name,
    role: invite.role,
  });
});

// Accept invite (public - no auth required)
router.post('/invites/accept', async (req: Request, res: Response) => {
  const acceptSchema = z.object({
    token: z.string(),
    name: z.string().min(1, 'Name is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  });

  const { token, name, password } = acceptSchema.parse(req.body);

  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (!invite) {
    res.status(404).json({ error: 'Invalid invitation' });
    return;
  }

  if (invite.acceptedAt) {
    res.status(400).json({ error: 'This invitation has already been accepted' });
    return;
  }

  if (new Date() > invite.expiresAt) {
    res.status(400).json({ error: 'This invitation has expired' });
    return;
  }

  // Create user and membership in transaction
  const result = await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: invite.email } });

    if (user) {
      // User exists - just add to org
      const existingMember = await tx.organizationMember.findFirst({
        where: { organizationId: invite.organizationId, userId: user.id },
      });
      if (existingMember) {
        throw new Error('You are already a member of this organization');
      }
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      user = await tx.user.create({
        data: {
          email: invite.email,
          name,
          role: 'designer' as UserRole, // Default role for invited team members
          passwordHash,
        },
      });
    }

    // Create membership
    await tx.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId: user.id,
        role: invite.role,
        isDefault: true,
      },
    });

    // Mark invite as accepted
    await tx.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return user;
  });

  const authUser: AuthUser = {
    id: result.id,
    email: result.email,
    name: result.name,
    role: result.role,
    isSuperAdmin: false,
  };

  const jwtToken = generateToken(authUser);

  res.cookie('token', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ user: authUser, token: jwtToken });
});

export default router;
