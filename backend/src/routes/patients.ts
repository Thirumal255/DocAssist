import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const user = req.user!;

    let where: any = {};

    if (search && (search as string).length >= 2) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } }
      ];
    }

    if (user.role === 'doctor') {
      const doctorFilter = {
        OR: [
          { appointments: { some: { doctorId: user.id } } },
          { visits: { some: { doctorId: user.id } } }
        ]
      };
      where = where.OR ? { AND: [where, doctorFilter] } : doctorFilter;
    }

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { id } });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

router.get('/:id/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const visitWhere: any = { patientId: id };
    if (user.role === 'doctor') {
      visitWhere.doctorId = user.id;
    }

    const visits = await prisma.visit.findMany({
      where: visitWhere,
      include: {
        doctor: { select: { id: true, name: true, specialty: true } },
        prescription: { include: { items: true } }
      },
      orderBy: { visitedAt: 'desc' }
    });

    res.json(visits);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, dob, gender, bloodGroup, email, address, allergies, chronicConditions } = req.body;

    if (!name || !phone || !dob || !gender) {
      return res.status(400).json({ error: 'Name, phone, DOB, and gender are required' });
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        phone,
        dob: new Date(dob),
        gender,
        bloodGroup,
        email,
        address,
        allergies: allergies || [],
        chronicConditions: chronicConditions || []
      }
    });

    res.status(201).json(patient);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
        ...(data.dob && { dob: new Date(data.dob) }),
        ...(data.gender && { gender: data.gender }),
        ...(data.bloodGroup !== undefined && { bloodGroup: data.bloodGroup }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.allergies !== undefined && { allergies: data.allergies }),
        ...(data.chronicConditions !== undefined && { chronicConditions: data.chronicConditions })
      }
    });

    res.json(patient);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete patients' });
    }

    await prisma.patient.delete({ where: { id } });
    res.json({ message: 'Patient deleted' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

export default router;
