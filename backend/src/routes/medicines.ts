import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import crypto from 'crypto'; // <--- 1. Add this import

const router = Router();
const prisma = new PrismaClient();

// Search Medicines
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json([]);
    }

    const medicines = await prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { saltComposition: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 20,
      orderBy: { name: 'asc' }
    });

    res.json(medicines);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to search medicines' });
  }
});

// --- NEW ROUTE: Create Medicine (Quick Add) ---
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Valid medicine name is required' });
    }

    // 1. Check for duplicates (Case insensitive)
    const existing = await prisma.medicine.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } }
    });

    if (existing) {
      return res.json(existing);
    }

    // 2. Create new medicine
    const medicine = await prisma.medicine.create({
      data: {
        id: crypto.randomUUID(), // <--- 2. FIX: Manually generate ID
        name: name.trim(),
        saltComposition: '', 
        medicineDesc: '',
        sideEffects: '',
        drugInteractions: {} // Ensure this matches your Json type in Prisma
      }
    });

    res.status(201).json(medicine);
  } catch (error) {
    console.error('Error creating medicine:', error);
    res.status(500).json({ error: 'Failed to create medicine' });
  }
});
// ----------------------------------------------

// Get All Medicines
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const medicines = await prisma.medicine.findMany({
      take: 100,
      orderBy: { name: 'asc' }
    });

    res.json(medicines);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
});

// Get Single Medicine
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const medicine = await prisma.medicine.findUnique({ where: { id } });

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    res.json(medicine);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch medicine' });
  }
});

export default router;