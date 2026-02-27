import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.query;
    const user = req.user!;

    const where: any = {};

    if (patientId) {
      where.patientId = patientId as string;
    }

    if (user.role === 'doctor') {
      where.doctorId = user.id;
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true, specialty: true } },
        prescription: { include: { items: true } }
      },
      orderBy: { visitedAt: 'desc' },
      take: 50
    });

    res.json(visits);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { select: { id: true, name: true, specialty: true } },
        appointment: true,
        prescription: { include: { items: true } }
      }
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.json(visit);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    if (user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can create visits' });
    }

    const { patientId, appointmentId, chiefComplaint, diagnosis, notes, vitals } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const visit = await prisma.visit.create({
      data: {
        patientId,
        doctorId: user.id,
        appointmentId,
        chiefComplaint,
        diagnosis,
        notes,
        vitals,
        visitedAt: new Date()
      },
      include: {
        patient: true,
        doctor: { select: { id: true, name: true } }
      }
    });

    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'completed' }
      });
    }

    res.status(201).json(visit);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create visit' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { chiefComplaint, diagnosis, notes, vitals } = req.body;

    const visit = await prisma.visit.update({
      where: { id },
      data: {
        ...(chiefComplaint !== undefined && { chiefComplaint }),
        ...(diagnosis !== undefined && { diagnosis }),
        ...(notes !== undefined && { notes }),
        ...(vitals !== undefined && { vitals })
      },
      include: {
        patient: true,
        doctor: { select: { id: true, name: true } }
      }
    });

    res.json(visit);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update visit' });
  }
});

export default router;
