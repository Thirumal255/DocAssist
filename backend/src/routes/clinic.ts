import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /clinic - Fetch global settings
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let settings = await prisma.clinicSettings.findUnique({
      where: { id: 'global' }
    });

    // If it doesn't exist yet, create the default one automatically
    if (!settings) {
      settings = await prisma.clinicSettings.create({
        data: { id: 'global', name: 'My Clinic', brandColor: '#0A7B6E' }
      });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching clinic settings:', error);
    res.status(500).json({ error: 'Failed to fetch clinic settings' });
  }
});

// PUT /clinic - Update global settings (Admin Only)
router.put('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update clinic settings' });
    }

    const { name, address, phone, email, logoBase64, brandColor, taxId, footerText } = req.body;

    const settings = await prisma.clinicSettings.upsert({
      where: { id: 'global' },
      update: { name, address, phone, email, logoBase64, brandColor, taxId, footerText },
      create: { 
        id: 'global', 
        name: name || 'My Clinic', 
        address, phone, email, logoBase64, brandColor, taxId, footerText 
      }
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error updating clinic settings:', error);
    res.status(500).json({ error: 'Failed to update clinic settings' });
  }
});

export default router;