import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
// Import the actual OpenAI service functions
import { getPrescriptionSuggestions, checkDrugInteractions, PatientContext } from '../services/openai.service';

const router = Router();
const prisma = new PrismaClient();

// ------------------------------------------------------------------
// 1. Helper Function: getPatientContext (PRESERVED FROM ORIGINAL)
// ------------------------------------------------------------------
async function getPatientContext(patientId: string): Promise<PatientContext> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      visits: {
        take: 3,
        orderBy: { visitedAt: 'desc' },
        include: {
          prescription: {
            include: { items: true }
          }
        }
      }
    }
  });

  if (!patient) throw new Error('Patient not found');

  // Calculate age from DOB
  const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();

  return {
    age,
    gender: patient.gender,
    chronicConditions: patient.chronicConditions as string[] || [],
    allergies: patient.allergies as string[] || [],
    recentPrescriptions: patient.visits
      .filter(v => v.prescription)
      .map(v => ({
        diagnosis: v.prescription!.diagnosis,
        medicines: v.prescription!.items.map(i => i.medicineName),
        date: v.visitedAt.toISOString()
      }))
  };
}

// ------------------------------------------------------------------
// 2. Diagnosis Suggestion Route (Uses OpenAI)
// ------------------------------------------------------------------
router.post('/suggest', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { diagnosis, patientId } = req.body;

    if (!diagnosis || !patientId) {
      return res.status(400).json({ error: 'Diagnosis and Patient ID are required' });
    }

    // Fetch real patient context
    const patientContext = await getPatientContext(patientId);

    // Call OpenAI service
    const suggestion = await getPrescriptionSuggestions(
      diagnosis, 
      undefined, 
      patientContext
    );

    // Return the suggestion directly (matches frontend expectations)
    res.json(suggestion);

  } catch (error: any) {
    console.error('AI suggestion error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI suggestion' });
  }
});

// ------------------------------------------------------------------
// 3. Drug Interaction Route (UPDATED to use OpenAI)
// ------------------------------------------------------------------
router.post('/drug-interaction', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { medicines, patientAllergies } = req.body;

    if (!medicines || !Array.isArray(medicines)) {
      return res.status(400).json({ error: 'Medicines array is required' });
    }

    // Call the OpenAI service function (Replaces local hardcoded rules)
    const result = await checkDrugInteractions(medicines, patientAllergies || []);
    
    // Return the result directly (Frontend expects result.data.warnings)
    res.json(result);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to check drug interactions' });
  }
});

export default router;