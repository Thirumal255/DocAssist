import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get Prescriptions
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId, patientId } = req.query;
    const user = req.user!;

    const where: any = {};

    if (user.role === 'doctor') {
      where.doctorId = user.id;
    } else if (doctorId && doctorId !== 'all') {
      where.doctorId = doctorId as string;
    }

    if (patientId && patientId !== 'all') {
      where.patientId = patientId as string;
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

    res.json({ success: true, data: prescriptions });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

// Get Single Prescription
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        visit: { include: { patient: true, doctor: true } },
        items: true
      }
    });

    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
    res.json({ success: true, data: prescription });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch prescription' });
  }
});

// --- CREATE ROUTE (FIXED) ---
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    if (user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can create prescriptions' });
    }

    let { visitId, patientId, diagnosis, items, notes, aiSuggestionUsed } = req.body;

    // 1. Validate Items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Prescription items are required' });
    }

    // 2. Handle Missing Visit ID (Auto-create Visit)
    if (!visitId) {
      if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required to create a new visit' });
      }

      // Create a new Visit implicitly
      const newVisit = await prisma.visit.create({
        data: {
          patientId,
          doctorId: user.id,
          visitedAt: new Date(),
          diagnosis: diagnosis || 'Prescription created',
          notes: notes || 'Auto-generated visit from prescription',
          chiefComplaint: 'Prescription Entry'
        }
      });
      visitId = newVisit.id;
    }

    // 3. Create Prescription
    const prescription = await prisma.prescription.create({
      data: {
        // FIX 1: Use 'connect' for relations (Solved previous error)
        visit: { connect: { id: visitId } },
        patient: { connect: { id: patientId } },
        doctor: { connect: { id: user.id } },
        
        diagnosis,
        notes,
        aiSuggestionUsed: aiSuggestionUsed || false,
        items: {
          create: items.map((item: any) => ({
            medicineName: item.medicineName,
            genericName: item.genericName,
            dose: item.dose,
            frequency: item.frequency,
            
            // FIX 2: Correct column name is 'days', not 'duration'
            days: parseInt(item.days) || 1, 
            
            timing: item.timing || 'after_food',
            instructions: item.instructions
          }))
        }
      },
      include: {
        visit: { 
          include: { 
            patient: { select: { id: true, name: true, phone: true } }, 
            doctor: { select: { id: true, name: true } } 
          } 
        },
        items: true
      }
    });

    res.status(201).json({ success: true, data: prescription });

  } catch (error) {
    console.error('Create Prescription Error:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
});

export default router;