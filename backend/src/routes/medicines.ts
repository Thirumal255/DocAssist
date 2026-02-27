import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json([]);
    }

    const medicines = await prisma.medicine.findMany({
      where: {
        OR: [
          { brandName: { contains: q, mode: 'insensitive' } },
          { genericName: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 20,
      orderBy: { brandName: 'asc' }
    });

    res.json(medicines);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to search medicines' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const medicines = await prisma.medicine.findMany({
      take: 100,
      orderBy: { brandName: 'asc' }
    });

    res.json(medicines);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
});

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
