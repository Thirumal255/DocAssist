import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId, patientId } = req.query;
    const user = req.user!;

    const where: any = {};

    if (user.role === 'doctor') {
      where.visit = { doctorId: user.id };
    } else if (doctorId && doctorId !== 'all') {
      where.visit = { doctorId: doctorId as string };
    }

    if (patientId && patientId !== 'all') {
      where.visit = { ...where.visit, patientId: patientId as string };
    }

    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        visit: {
          include: {
            patient: { select: { id: true, name: true, phone: true } },
            doctor: { select: { id: true, name: true } }
          }
        },
        items: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(prescriptions);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        visit: {
          include: {
            patient: true,
            doctor: { select: { id: true, name: true, specialty: true } }
          }
        },
        items: true
      }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (user.role === 'doctor' && prescription.visit.doctorId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(prescription);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch prescription' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    if (user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can create prescriptions' });
    }

    const { visitId, diagnosis, items, notes, aiSuggestionUsed } = req.body;

    if (!visitId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Visit ID and items are required' });
    }

    const prescription = await prisma.prescription.create({
      data: {
        visitId,
        diagnosis,
        notes,
        aiSuggestionUsed: aiSuggestionUsed || false,
        items: {
          create: items.map((item: any) => ({
            medicineName: item.medicineName,
            genericName: item.genericName,
            dose: item.dose,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions
          }))
        }
      },
      include: {
        visit: { include: { patient: true, doctor: { select: { id: true, name: true } } } },
        items: true
      }
    });

    res.status(201).json(prescription);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
});

export default router;
