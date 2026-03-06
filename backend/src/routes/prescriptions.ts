import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

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
// GET /:id - Get single prescription
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        items: true,
        patient: true,
        doctor: {
          include: {
            template: true
          }
        }
      }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Helper to convert local file to Base64
    const getBase64 = (relativePath: string) => {
      try {
        // Since we moved 'uploads' to backend/uploads, path.join(process.cwd(), 'uploads', filename)
        // Note: logoUrl already contains '/uploads/filename.png', so we replace the leading slash
        const filePath = path.join(process.cwd(), relativePath.startsWith('/') ? relativePath.substring(1) : relativePath);
        
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const extension = path.extname(filePath).replace('.', '') || 'png';
          return `data:image/${extension};base64,${fileBuffer.toString('base64')}`;
        }
      } catch (err) {
        console.error(`Base64 conversion failed for ${relativePath}:`, err);
      }
      return null;
    };

    const doctor = prescription.doctor as any;
    if (doctor?.template) {
      // Convert Logo if exists
      if (doctor.template.logoUrl) {
        doctor.template.logoBase64 = getBase64(doctor.template.logoUrl);
      }
      // Convert Signature if exists
      if (doctor.template.digitalSignatureUrl) {
        doctor.template.sigBase64 = getBase64(doctor.template.digitalSignatureUrl);
      }
    }

    res.json(prescription);
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({ error: 'Failed to fetch prescription' });
  }
});

// --- CREATE ROUTE (FIXED) ---
// --- CREATE ROUTE (FIXED) ---
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    if (user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can create prescriptions' });
    }

    // FIX 1: Extracted 'vitals' from req.body
    let { visitId, patientId, diagnosis, items, notes, aiSuggestionUsed, vitals } = req.body;

    // 1. Validate Items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Prescription items are required' });
    }

   
    
    // 2. Handle Missing Visit ID (Auto-create Visit & Handle Appointment)
    if (!visitId) {
      if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required to create a new visit' });
      }

      // --- AUTO-DETECT OR CREATE APPOINTMENT ---
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Check if they have a scheduled appointment today
      const pendingAppt = await prisma.appointment.findFirst({
        where: {
          patientId,
          doctorId: user.id,
          status: 'SCHEDULED',
          scheduledAt: { gte: todayStart, lte: todayEnd } // <--- FIXED: 'scheduledAt' instead of 'date'
        }
      });

      let targetAppointmentId = null;

      if (pendingAppt) {
        // SCENARIO A: Found an existing appointment -> Mark it Completed
        await prisma.appointment.update({
          where: { id: pendingAppt.id },
          data: { status: 'COMPLETED' }
        });
        targetAppointmentId = pendingAppt.id;
      } else {
        // SCENARIO B: No appointment found (Walk-in) -> Create one now and mark Completed
        const now = new Date();

        const newAppt = await prisma.appointment.create({
          data: {
            patientId,
            doctorId: user.id,
            scheduledAt: now, // <--- FIXED: Uses 'scheduledAt' instead of 'date' and 'time'
            status: 'COMPLETED',
            // type: 'WALK_IN' // Uncomment this if your Prisma schema requires the 'type' field!
          }
        });
        targetAppointmentId = newAppt.id;
      }

      // --- CREATE THE VISIT AND LINK EVERYTHING ---
      const newVisit = await prisma.visit.create({
        data: {
          patientId,
          doctorId: user.id,
          appointmentId: targetAppointmentId, // Link the detected or newly created appointment
          visitedAt: new Date(),
          diagnosis: diagnosis || 'Prescription created',
          notes: notes || 'Auto-generated visit from prescription',
          chiefComplaint: 'Prescription Entry',
          vitals: vitals ? { create: vitals } : undefined 
        }
      });
      visitId = newVisit.id;
      
    } else if (vitals) {
      // If a visit already exists, just securely update the vitals
      await prisma.visit.update({
        where: { id: visitId },
        data: { 
          vitals: {
            upsert: { create: vitals, update: vitals }
          }
        }
      });
    }

    // 3. Create Prescription
    const prescription = await prisma.prescription.create({
      data: {
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