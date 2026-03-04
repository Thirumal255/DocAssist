import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger'; // Import your logger

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  logger.info('Auth', `Login attempt for: ${email}`); // Log the start

  try {
    if (!email || !password) {
      logger.warn('Auth', 'Login failed: Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      logger.warn('Auth', `Login failed: User not found for ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // FIX: Changed user.passwordHash to user.password to match schema
    if (!user.password) {
      logger.error('Auth', `Critical: User ${email} has no password set in DB`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      logger.warn('Auth', `Login failed: Incorrect password for ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info('Auth', `Login successful: ${email} (${user.role})`);

    // FIX: Wrapped response in 'data' object to match what frontend expects
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          specialty: user.specialty,
          phone: user.phone,
          registrationNo: user.registrationNo,
        },
        token
      }
    });
  } catch (error) {
    logger.error('Auth', 'Internal Login Error', error);
    res.status(500).json({ error: 'Login failed' });
  }
});


router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json(req.user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
