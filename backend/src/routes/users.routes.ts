import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { requestMagicLink } from '../services/auth.service.js';
import { UserRole } from '@prisma/client';

const router = Router();

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().optional(),
  role: z.nativeEnum(UserRole),
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

// List users
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { role, search } = req.query;

  const where: any = {};

  if (role) {
    where.role = role as UserRole;
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ users });
});

// Get single user
router.get('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

// Create user
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    res.status(400).json({ error: 'Email already exists' });
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name || '',
      role: data.role,
    },
  });

  // Send magic link for non-client users
  if (data.role !== 'client') {
    try {
      await requestMagicLink(data.email);
    } catch (error) {
      console.error('Failed to send magic link:', error);
    }
  }

  res.status(201).json(user);
});

// Update user
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const data = updateUserSchema.parse(req.body);

  const existing = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      name: data.name,
      role: data.role,
      phone: data.phone,
      avatarUrl: data.avatarUrl,
    },
  });

  res.json(user);
});

// Delete user
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const existing = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Prevent self-deletion
  if (existing.id === req.user!.id) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  // Check if user has projects
  const projectCount = await prisma.project.count({
    where: {
      OR: [
        { designerId: req.params.id },
        { clientId: req.params.id },
      ],
    },
  });

  if (projectCount > 0) {
    res.status(400).json({
      error: 'Cannot delete user with associated projects. Reassign projects first.',
    });
    return;
  }

  await prisma.user.delete({ where: { id: req.params.id } });

  res.json({ message: 'User deleted' });
});

// Send magic link to user
router.post('/:id/send-invite', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  try {
    await requestMagicLink(user.email);
    res.json({ message: 'Magic link sent' });
  } catch (error) {
    console.error('Failed to send magic link:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

export default router;
