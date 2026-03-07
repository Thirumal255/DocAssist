import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET / - List all appointments
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

// GET /today - Get today's appointments
router.get('/today', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const where: any = {
      scheduledAt: { gte: todayStart, lte: todayEnd },
      status: 'SCHEDULED' // Only fetch pending appointments for the queue!
    };

    if (user.role === 'doctor') {
      where.doctorId = user.id;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true, gender: true, dob: true } },
        // Ensure we bring the doctor's name along for the Admin view
        doctor: { select: { id: true, name: true } } 
      },
      orderBy: { scheduledAt: 'asc' } // Show earliest appointments first
    });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching today queue:', error);
    res.status(500).json({ error: 'Failed to fetch today appointments' });
  }
});

// GET /stats - Dashboard stats
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const baseWhere: any = {
      scheduledAt: { gte: todayStart, lte: todayEnd }
    };

    // Role-based filtering
    if (user.role === 'doctor') {
      baseWhere.doctorId = user.id;
    }

    // 1. Total Appointments (Excluding Cancelled)
    const todayAppointments = await prisma.appointment.count({
      where: { 
        ...baseWhere, 
        status: { not: 'CANCELLED' } 
      }
    });

    // 2. Pending Appointments (Only Scheduled)
    const pendingAppointments = await prisma.appointment.count({
      where: { 
        ...baseWhere, 
        status: 'SCHEDULED' 
      }
    });

    // 3. Cancelled Appointments (Replaces Total Patients)
    const totalCancelled = await prisma.appointment.count({
      where: { 
        ...baseWhere, 
        status: 'CANCELLED' 
      }
    });

    res.json({
      todayAppointments,
      pendingAppointments,
      totalCancelled // Replaced totalPatients with this
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// CREATE APPOINTMENT & AUTO-GENERATE INVOICE
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    // Note: Adjust these destructured fields if your frontend sends different names
    const { patientId, doctorId, scheduledAt, chiefComplaint } = req.body;

    if (!patientId || !doctorId || !scheduledAt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Fetch the Doctor to get their specific Consultation Fee
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      select: { consultationFee: true }
    });

    const feeAmount = doctor?.consultationFee || 0;

    // 2. Create the Appointment AND the linked Invoice simultaneously
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        scheduledAt: new Date(scheduledAt),
        chiefComplaint,
        status: 'SCHEDULED',
        
        // --- NEW: Auto-Create the Pending Invoice ---
        invoice: {
          create: {
            patientId,
            amount: feeAmount,
            status: 'PENDING'
          }
        }
      },
      include: {
        patient: true,
        doctor: { select: { id: true, name: true } },
        invoice: true // Return the new invoice data to the frontend
      }
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});


// PATCH /:id/status - Update Status (Completed, No Show, Cancelled, etc.)
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    // 1. Fetch the appointment AND its linked invoice before updating
    const currentAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: { invoice: true }
    });

    if (!currentAppointment) return res.status(404).json({ error: 'Appointment not found' });

    // 2. THE REFUND ENGINE: Handle the invoice if the appointment is cancelled
    let invoiceUpdate = {};
    if (status === 'CANCELLED' && currentAppointment.invoice) {
      if (currentAppointment.invoice.status === 'PAID') {
        // If they already paid, trigger a refund
        invoiceUpdate = {
          status: 'REFUNDED',
          refundedAt: new Date()
        };
      } else if (currentAppointment.invoice.status === 'PENDING') {
        // If they haven't paid yet, just cancel the draft invoice
        invoiceUpdate = { status: 'CANCELLED' };
      }
    }

    // 3. Perform the update: Update Appointment and conditionally update the Invoice
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { 
        status,
        ...(Object.keys(invoiceUpdate).length > 0 && {
          invoice: { update: invoiceUpdate }
        })
      },
      include: { invoice: true } // Return the updated invoice to the frontend
    });

    res.json(appointment);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PUT /:id - Generic Update
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

// POST /:id/cancel - Explicit Cancel Appointment Route
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // 1. Fetch the appointment and its linked invoice
    const currentAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: { invoice: true }
    });

    if (!currentAppointment) return res.status(404).json({ error: 'Appointment not found' });

    // 2. THE REFUND ENGINE: Handle the invoice
    let invoiceUpdate = {};
    if (currentAppointment.invoice) {
      if (currentAppointment.invoice.status === 'PAID') {
        invoiceUpdate = {
          status: 'REFUNDED',
          refundedAt: new Date()
        };
      } else if (currentAppointment.invoice.status === 'PENDING') {
        invoiceUpdate = { status: 'CANCELLED' };
      }
    }

    // 3. Perform the update
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { 
        status: 'CANCELLED', 
        cancelReason: reason,
        ...(Object.keys(invoiceUpdate).length > 0 && {
          invoice: { update: invoiceUpdate }
        })
      },
      include: { invoice: true }
    });

    res.json(appointment);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// POST /:id/reschedule - Reschedule Appointment
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
        notes: reason ? `Rescheduled: ${reason}` : current.notes,
        // Optional: Reset status to SCHEDULED if rescheduling a cancelled/missed appt
        status: 'SCHEDULED' 
      }
    });

    res.json(appointment);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

export default router;