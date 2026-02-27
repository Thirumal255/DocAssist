import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { date, doctorId } = req.query;
    const user = req.user!;

    const where: any = {};

    if (date) {
      const startDate = new Date(date as string);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date as string);
      endDate.setHours(23, 59, 59, 999);
      where.scheduledAt = { gte: startDate, lte: endDate };
    }

    if (user.role === 'doctor') {
      where.doctorId = user.id;
    } else if (doctorId && doctorId !== 'all') {
      where.doctorId = doctorId as string;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true, gender: true } },
        doctor: { select: { id: true, name: true, specialty: true } }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

router.get('/today', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = { scheduledAt: { gte: today, lt: tomorrow } };
    if (user.role === 'doctor') {
      where.doctorId = user.id;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    res.json(appointments);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const whereBase: any = {};
    if (user.role === 'doctor') {
      whereBase.doctorId = user.id;
    }

    const [todayAppointments, pendingAppointments, totalPatients] = await Promise.all([
      prisma.appointment.count({
        where: { ...whereBase, scheduledAt: { gte: today, lt: tomorrow } }
      }),
      prisma.appointment.count({
        where: { ...whereBase, status: 'scheduled', scheduledAt: { gte: today } }
      }),
      user.role === 'doctor'
        ? prisma.patient.count({
            where: {
              OR: [
                { appointments: { some: { doctorId: user.id } } },
                { visits: { some: { doctorId: user.id } } }
              ]
            }
          })
        : prisma.patient.count()
    ]);

    res.json({ todayAppointments, pendingAppointments, totalPatients });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, doctorId, scheduledAt, type, chiefComplaint, notes } = req.body;

    if (!patientId || !doctorId || !scheduledAt) {
      return res.status(400).json({ error: 'Patient, doctor, and scheduled time are required' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        scheduledAt: new Date(scheduledAt),
        type: type || 'new_visit',
        chiefComplaint,
        notes,
        status: 'scheduled'
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, chiefComplaint, notes } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(chiefComplaint !== undefined && { chiefComplaint }),
        ...(notes !== undefined && { notes })
      },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } }
      }
    });

    res.json(appointment);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'cancelled', cancelReason: reason }
    });

    res.json(appointment);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

router.post('/:id/reschedule', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newScheduledAt, reason } = req.body;

    if (!newScheduledAt) {
      return res.status(400).json({ error: 'New scheduled time is required' });
    }

    const current = await prisma.appointment.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        scheduledAt: new Date(newScheduledAt),
        rescheduledFrom: current.scheduledAt,
        notes: reason ? `Rescheduled: ${reason}` : current.notes
      }
    });

    res.json(appointment);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

export default router;
