import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { range } = req.query; 
    const user = req.user!;

    let startDate = new Date();
    let endDate = new Date();
    
    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === 'week') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    const dateFilter = {
      gte: startDate,
      lte: endDate,
    };

    const doctorFilter = user.role === 'doctor' ? { doctorId: user.id } : {};

    // Fetch Invoices (Include Doctor Info)
    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: dateFilter,
        ...(user.role === 'doctor' && { appointment: { doctorId: user.id } })
      },
      include: { appointment: { include: { doctor: { select: { id: true, name: true } } } } }
    });

    const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (i.amount || 0), 0);
    const pendingRevenue = invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + (i.amount || 0), 0);
    const refundedRevenue = invoices.filter(i => i.status === 'REFUNDED').reduce((sum, i) => sum + (i.amount || 0), 0);

    const paymentMethods = {
      CASH: invoices.filter(i => i.status === 'PAID' && i.paymentMethod === 'CASH').length,
      CARD: invoices.filter(i => i.status === 'PAID' && i.paymentMethod === 'CARD').length,
      UPI: invoices.filter(i => i.status === 'PAID' && i.paymentMethod === 'UPI').length,
    };

    // Fetch Appointments (Include Doctor Info)
    const appointments = await prisma.appointment.findMany({
      where: {
        scheduledAt: dateFilter,
        ...doctorFilter
      },
      include: { doctor: { select: { id: true, name: true } } }
    });

    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === 'COMPLETED').length;
    const cancelledAppointments = appointments.filter(a => a.status === 'CANCELLED').length;
    const noShowAppointments = appointments.filter(a => a.status === 'NO_SHOW').length;
    
    // --- NEW: DOCTOR-WISE STATS CALCULATION ---
    const doctorStatsMap: Record<string, { name: string; appointments: number; revenue: number }> = {};

    appointments.forEach(appt => {
      if (!appt.doctor) return;
      const docId = appt.doctor.id;
      if (!doctorStatsMap[docId]) doctorStatsMap[docId] = { name: appt.doctor.name, appointments: 0, revenue: 0 };
      doctorStatsMap[docId].appointments += 1;
    });

    invoices.forEach(inv => {
      if (inv.status === 'PAID' && inv.appointment?.doctor) {
        const docId = inv.appointment.doctor.id;
        if (!doctorStatsMap[docId]) doctorStatsMap[docId] = { name: inv.appointment.doctor.name, appointments: 0, revenue: 0 };
        doctorStatsMap[docId].revenue += (inv.amount || 0);
      }
    });

    // Convert map to array and sort by highest revenue
    const doctorStats = Object.values(doctorStatsMap).sort((a, b) => b.revenue - a.revenue);

    res.json({
      success: true,
      data: {
        financials: { totalRevenue, pendingRevenue, refundedRevenue, paymentMethods },
        operations: { totalAppointments, completedAppointments, cancelledAppointments, noShowAppointments },
        doctorStats // Send the new array to the frontend
      }
    });

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;