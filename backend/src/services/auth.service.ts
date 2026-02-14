import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import prisma from '../config/database.js';
import { sendEmail } from '../config/email.js';
import { generateToken, AuthUser } from '../middleware/auth.js';
import { UserRole } from '@prisma/client';

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const CLIENT_INVITE_EXPIRY_DAYS = 7;
const SALT_ROUNDS = 10;

export interface MagicLinkResult {
  success: boolean;
  message: string;
}

export interface VerifyResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  message?: string;
}

export async function requestMagicLink(email: string): Promise<MagicLinkResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user exists and is active
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, isActive: true, role: true },
  });

  if (!user || !user.isActive) {
    // Don't reveal if user exists or not for security
    return { success: true, message: 'If this email is registered, you will receive a login link.' };
  }

  // Only admin and designer can use magic link
  if (user.role === 'client') {
    return { success: false, message: 'Clients should use their invitation link to access the portal.' };
  }

  // Generate magic link token
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

  // Save magic link
  await prisma.magicLink.create({
    data: {
      userId: user.id,
      email: normalizedEmail,
      token,
      expiresAt,
    },
  });

  // Send email
  const magicLinkUrl = `${process.env.APP_URL}/auth/verify?token=${token}`;

  const emailSent = await sendEmail({
    to: normalizedEmail,
    subject: "Your Login Link - D'Fine Kitchen & Bath Remodeling",
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
            <h2>Login to D'Fine Kitchen & Bath Remodeling CRM</h2>
            <p>Click the button below to securely log in to your account:</p>
            <a href="${magicLinkUrl}" class="button">Log In</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${magicLinkUrl}</p>
            <p><strong>This link will expire in ${MAGIC_LINK_EXPIRY_MINUTES} minutes.</strong></p>
            <div class="footer">
              <p>If you didn't request this login link, you can safely ignore this email.</p>
              <p>&copy; ${new Date().getFullYear()} D'Fine Kitchen & Bath Remodeling</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (!emailSent) {
    return { success: false, message: 'Failed to send login email. Please try again.' };
  }

  return { success: true, message: 'Login link sent! Check your email.' };
}

export async function verifyMagicLink(token: string): Promise<VerifyResult> {
  const magicLink = await prisma.magicLink.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, name: true, role: true, isActive: true } } },
  });

  if (!magicLink) {
    return { success: false, message: 'Invalid login link.' };
  }

  if (magicLink.usedAt) {
    return { success: false, message: 'This login link has already been used.' };
  }

  if (new Date() > magicLink.expiresAt) {
    return { success: false, message: 'This login link has expired. Please request a new one.' };
  }

  if (!magicLink.user || !magicLink.user.isActive) {
    return { success: false, message: 'User account not found or inactive.' };
  }

  // Mark as used
  await prisma.magicLink.update({
    where: { id: magicLink.id },
    data: { usedAt: new Date() },
  });

  // Get full user data including isSuperAdmin
  const fullUser = await prisma.user.findUnique({
    where: { id: magicLink.user.id },
    select: { id: true, email: true, name: true, role: true, isSuperAdmin: true },
  });

  // Generate JWT
  const authUser: AuthUser = {
    id: magicLink.user.id,
    email: magicLink.user.email,
    name: magicLink.user.name,
    role: magicLink.user.role,
    isSuperAdmin: fullUser?.isSuperAdmin || false,
  };

  const jwtToken = generateToken(authUser);

  return {
    success: true,
    user: authUser,
    token: jwtToken,
  };
}

export async function createClientInvite(
  projectId: string,
  clientEmail: string,
  sentById: string
): Promise<{ success: boolean; inviteUrl?: string; message?: string }> {
  const normalizedEmail = clientEmail.toLowerCase().trim();

  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, designerId: true },
  });

  if (!project) {
    return { success: false, message: 'Project not found.' };
  }

  // Generate invite token
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + CLIENT_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Create or update invite
  await prisma.clientInvite.create({
    data: {
      projectId,
      email: normalizedEmail,
      token,
      sentById,
      expiresAt,
    },
  });

  const inviteUrl = `${process.env.APP_URL}/client/invite?token=${token}`;

  // Send email
  const emailSent = await sendEmail({
    to: normalizedEmail,
    subject: `You're Invited to View Your Project - ${project.name}`,
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
              background-color: #10B981;
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
            <h2>View Your Project: ${project.name}</h2>
            <p>You've been invited to view your project details, documents, and make payments through our client portal.</p>
            <a href="${inviteUrl}" class="button">View Your Project</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${inviteUrl}</p>
            <p><strong>This invitation expires in ${CLIENT_INVITE_EXPIRY_DAYS} days.</strong></p>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} D'Fine Kitchen & Bath Remodeling</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  return {
    success: true,
    inviteUrl,
    message: emailSent ? 'Invitation sent successfully!' : 'Invitation created but email failed to send.',
  };
}

export async function verifyClientInvite(token: string): Promise<VerifyResult> {
  const invite = await prisma.clientInvite.findUnique({
    where: { token },
    include: { project: { select: { id: true, name: true } } },
  });

  if (!invite) {
    return { success: false, message: 'Invalid invitation link.' };
  }

  if (invite.acceptedAt) {
    // If already accepted, just log them in
    const user = await prisma.user.findFirst({
      where: { email: invite.email, role: 'client' },
      select: { id: true, email: true, name: true, role: true },
    });

    if (user) {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isSuperAdmin: true },
      });
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: fullUser?.isSuperAdmin || false,
      };
      return {
        success: true,
        user: authUser,
        token: generateToken(authUser),
      };
    }
  }

  if (new Date() > invite.expiresAt) {
    return { success: false, message: 'This invitation has expired. Please contact your designer for a new link.' };
  }

  // Create or find user
  let user = await prisma.user.findFirst({
    where: { email: invite.email },
  });

  if (!user) {
    // Create new client user
    user = await prisma.user.create({
      data: {
        email: invite.email,
        name: invite.email.split('@')[0], // Default name from email
        role: 'client' as UserRole,
      },
    });
  }

  // Mark invite as accepted and link user to project
  await prisma.$transaction([
    prisma.clientInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), acceptedBy: user.id },
    }),
    prisma.project.update({
      where: { id: invite.projectId },
      data: { clientId: user.id },
    }),
  ]);

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isSuperAdmin: false,
  };

  return {
    success: true,
    user: authUser,
    token: generateToken(authUser),
  };
}

// ==================== REGISTRATION ====================

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  companyName: string;
}): Promise<VerifyResult> {
  const normalizedEmail = data.email.toLowerCase().trim();

  // Check if email already taken
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return { success: false, message: 'An account with this email already exists.' };
  }

  // Generate slug from company name
  const slug = data.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  // Check slug uniqueness
  const existingOrg = await prisma.organization.findUnique({ where: { slug } });
  const finalSlug = existingOrg ? `${slug}-${Date.now().toString(36)}` : slug;

  // Create user, org, and membership in one transaction
  const result = await prisma.$transaction(async (tx) => {
    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create organization
    const organization = await tx.organization.create({
      data: {
        name: data.companyName,
        slug: finalSlug,
        subscriptionPlan: 'starter',
        subscriptionStatus: 'trialing',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
      },
    });

    // Create user as admin of the org
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        name: data.name,
        role: 'admin' as UserRole,
        passwordHash,
      },
    });

    // Create org membership
    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: 'owner',
        isDefault: true,
      },
    });

    // Create default lead sources for the org
    const defaultSources = ['Website', 'Referral', 'Social Media', 'Home Show', 'Google', 'Yelp', 'Other'];
    for (const sourceName of defaultSources) {
      await tx.leadSource.create({
        data: {
          organizationId: organization.id,
          name: sourceName,
          isActive: true,
        },
      });
    }

    return user;
  });

  const authUser: AuthUser = {
    id: result.id,
    email: result.email,
    name: result.name,
    role: result.role,
    isSuperAdmin: false,
  };

  return {
    success: true,
    user: authUser,
    token: generateToken(authUser),
  };
}

// ==================== PASSWORD AUTH ====================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function loginWithPassword(email: string, password: string): Promise<VerifyResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      isSuperAdmin: true,
      passwordHash: true
    },
  });

  if (!user || !user.isActive) {
    return { success: false, message: 'Invalid email or password.' };
  }

  if (!user.passwordHash) {
    return { success: false, message: 'Password not set. Please use magic link or set a password.' };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, message: 'Invalid email or password.' };
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin || false,
  };

  return {
    success: true,
    user: authUser,
    token: generateToken(authUser),
  };
}

export async function setPassword(userId: string, password: string): Promise<{ success: boolean; message: string }> {
  if (password.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters.' };
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true, message: 'Password set successfully.' };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    return { success: false, message: 'User not found.' };
  }

  // If user has a password, verify current password
  if (user.passwordHash) {
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return { success: false, message: 'Current password is incorrect.' };
    }
  }

  return setPassword(userId, newPassword);
}
