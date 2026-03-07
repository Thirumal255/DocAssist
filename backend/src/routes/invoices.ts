import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /invoices - Fetch all invoices (useful for the Receptionist Dashboard)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        appointment: {
          include: { doctor: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// put /invoices/:id/pay - Collect Payment
router.put('/:id/pay', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body; // Expects 'CASH', 'CARD', or 'UPI'

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paymentMethod,
        paidAt: new Date()
      },
      include: {
        patient: true,
        appointment: { include: { doctor: true } }
      }
    });

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Payment Error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

export default router;