import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service.js';
import { authenticate, requireDesignerOrAdmin } from '../middleware/auth.js';

const router = Router();

const magicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const setPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().min(1, 'Company name is required'),
});

const clientInviteSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  email: z.string().email('Invalid email address'),
});

// Register new user + organization
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.registerUser(data);

    if (result.success && result.token) {
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({ user: result.user, token: result.token });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      throw error;
    }
  }
});

// Request magic link
router.post('/magic-link', async (req: Request, res: Response) => {
  try {
    const { email } = magicLinkSchema.parse(req.body);
    const result = await authService.requestMagicLink(email);

    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      throw error;
    }
  }
});

// Verify magic link
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const result = await authService.verifyMagicLink(token);

    if (result.success && result.token) {
      // Set HTTP-only cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({ user: result.user, token: result.token });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    throw error;
  }
});

// Create client invite (designer/admin only)
router.post('/client-invite', authenticate, requireDesignerOrAdmin, async (req: Request, res: Response) => {
  try {
    const { projectId, email } = clientInviteSchema.parse(req.body);
    const result = await authService.createClientInvite(projectId, email, req.user!.id);

    if (result.success) {
      res.json({ inviteUrl: result.inviteUrl, message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      throw error;
    }
  }
});

// Verify client invite
router.get('/client-invite/verify', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const result = await authService.verifyClientInvite(token);

    if (result.success && result.token) {
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ user: result.user, token: result.token });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    throw error;
  }
});

// Login with password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.loginWithPassword(email, password);

    if (result.success && result.token) {
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ user: result.user, token: result.token });
    } else {
      res.status(401).json({ error: result.message });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      throw error;
    }
  }
});

// Set password (for authenticated users who don't have a password yet)
router.post('/set-password', authenticate, async (req: Request, res: Response) => {
  try {
    const { password } = setPasswordSchema.parse(req.body);
    const result = await authService.setPassword(req.user!.id, password);

    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      throw error;
    }
  }
});

// Change password
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const result = await authService.changePassword(req.user!.id, currentPassword, newPassword);

    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      throw error;
    }
  }
});

// Get current user
router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

export default router;
