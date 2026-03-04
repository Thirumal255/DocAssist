import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// --- 1. SPECIFIC ROUTES (Must come BEFORE /:doctorId) ---

// Get all doctors with their availability (For Admin Dashboard)
router.get('/doctors', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'doctor', isActive: true },
      select: {
        id: true,
        name: true,
        specialty: true,
        phone: true,
        // Include availability so the frontend can display the summary
        availability: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// --- 2. DYNAMIC ROUTES ---

// Get specific doctor's availability
router.get('/:doctorId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId } = req.params;

    const availability = await prisma.doctorAvailability.findMany({
      where: { doctorId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });

    res.json({ success: true, data: availability });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Get calculated slots for a specific date (Booking Logic)
router.get('/:doctorId/slots', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId } = req.params;
    const { date, excludeAppointmentId } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const requestedDate = new Date(date as string);
    const dayOfWeek = requestedDate.getDay();

    // 1. Get Doctor's Schedule for this day
    const availabilitySlots = await prisma.doctorAvailability.findMany({
      where: { doctorId, dayOfWeek, isActive: true },
      orderBy: { startTime: 'asc' }
    });

    if (availabilitySlots.length === 0) {
      return res.json({ 
        success: true, 
        data: {
          available: false, 
          message: 'Doctor is not available on this day', 
          slots: [] 
        }
      });
    }

    // 2. Get Existing Appointments
    // Define start and end of the requested day
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { notIn: ['cancelled', 'no_show'] },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId as string } } : {})
      }
    });

    // 3. Generate 15-min Time Slots
    const generatedSlots: any[] = [];
    const bookedTimes = new Set(existingAppointments.map(app => 
      new Date(app.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    ));

    // Current time for "past slot" validation
    const now = new Date();
    const isToday = startOfDay.toDateString() === now.toDateString();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const schedule of availabilitySlots) {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      
      let currentSlotTime = startHour * 60 + startMin;
      const endTimeMinutes = endHour * 60 + endMin;
      
      // Default to 15 mins if not set
      const duration = schedule.slotDuration || 15; 

      while (currentSlotTime + duration <= endTimeMinutes) {
        // Format minutes to HH:MM
        const h = Math.floor(currentSlotTime / 60);
        const m = currentSlotTime % 60;
        const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        let isAvailable = !bookedTimes.has(timeString);

        // Filter past slots if today
        if (isToday && currentSlotTime < currentMinutes) {
          isAvailable = false;
        }

        if (isAvailable) {
          generatedSlots.push({
            time: timeString,
            available: true,
            slotDuration: duration
          });
        }

        currentSlotTime += duration;
      }
    }

    res.json({
      success: true,
      data: {
        available: generatedSlots.length > 0,
        date: date,
        dayName: requestedDate.toLocaleDateString('en-US', { weekday: 'long' }),
        slots: generatedSlots
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate slots' });
  }
});

// Replace all availability (Admin Action)
router.put('/:doctorId/replace', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId } = req.params;
    const { slots } = req.body; // Expects array of availability objects
    const user = req.user!;

    if (user.role !== 'admin' && user.id !== doctorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 1. Delete existing availability
    await prisma.doctorAvailability.deleteMany({ where: { doctorId } });

    // 2. Create new slots
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

    // 3. Return updated list
    const newAvailability = await prisma.doctorAvailability.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });

    res.json({ success: true, data: newAvailability });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

export default router;