import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/:doctorId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId } = req.params;

    const availability = await prisma.doctorAvailability.findMany({
      where: { doctorId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });

    res.json(availability);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

router.get('/:doctorId/slots', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId } = req.params;
    const { date, excludeAppointmentId } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const requestedDate = new Date(date as string);
    const dayOfWeek = requestedDate.getDay();

    const availabilitySlots = await prisma.doctorAvailability.findMany({
      where: { doctorId, dayOfWeek, isActive: true },
      orderBy: { startTime: 'asc' }
    });

    if (availabilitySlots.length === 0) {
      return res.json({ available: false, message: 'Doctor is not available on this day', slots: [] });
    }

    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedWhere: any = {
      doctorId,
      scheduledAt: { gte: startOfDay, lte: endOfDay },
      status: { notIn: ['cancelled'] }
    };

    if (excludeAppointmentId) {
      bookedWhere.id = { not: excludeAppointmentId as string };
    }

    const bookedAppointments = await prisma.appointment.findMany({
      where: bookedWhere,
      select: { scheduledAt: true }
    });

    const bookedTimes = new Set(
      bookedAppointments.map(apt => {
        const d = new Date(apt.scheduledAt);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      })
    );

    const slots: { time: string; available: boolean }[] = [];
    const now = new Date();
    const isToday = requestedDate.toDateString() === now.toDateString();

    for (const avail of availabilitySlots) {
      const [startH, startM] = avail.startTime.split(':').map(Number);
      const [endH, endM] = avail.endTime.split(':').map(Number);
      const slotDuration = avail.slotDuration || 15;

      let currentMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      while (currentMinutes < endMinutes) {
        const hours = Math.floor(currentMinutes / 60);
        const mins = currentMinutes % 60;
        const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

        let isAvailable = !bookedTimes.has(timeStr);

        if (isToday && isAvailable) {
          const slotTime = new Date(requestedDate);
          slotTime.setHours(hours, mins, 0, 0);
          const cutoffTime = new Date(now.getTime() + 15 * 60 * 1000);
          if (slotTime <= cutoffTime) {
            isAvailable = false;
          }
        }

        slots.push({ time: timeStr, available: isAvailable });
        currentMinutes += slotDuration;
      }
    }

    res.json({
      available: true,
      periods: availabilitySlots.map(a => ({ startTime: a.startTime, endTime: a.endTime })),
      slots
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

router.post('/:doctorId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId } = req.params;
    const { dayOfWeek, startTime, endTime, slotDuration } = req.body;
    const user = req.user!;

    if (user.role !== 'admin' && user.id !== doctorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const availability = await prisma.doctorAvailability.create({
      data: { doctorId, dayOfWeek, startTime, endTime, slotDuration: slotDuration || 15 }
    });

    res.status(201).json(availability);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create availability' });
  }
});

router.post('/:doctorId/replace-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId } = req.params;
    const { slots } = req.body;
    const user = req.user!;

    if (user.role !== 'admin' && user.id !== doctorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.doctorAvailability.deleteMany({ where: { doctorId } });

    if (slots && slots.length > 0) {
      await prisma.doctorAvailability.createMany({
        data: slots.map((slot: any) => ({
          doctorId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          slotDuration: slot.slotDuration || 15,
          isActive: true
        }))
      });
    }

    const newAvailability = await prisma.doctorAvailability.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });

    res.json(newAvailability);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to replace availability' });
  }
});

export default router;
