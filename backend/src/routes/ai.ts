import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/suggest', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { diagnosis } = req.body;

    if (!diagnosis) {
      return res.status(400).json({ error: 'Diagnosis is required' });
    }

    const suggestion = generateMockSuggestion(diagnosis);
    res.json({ data: suggestion });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate AI suggestion' });
  }
});

router.post('/drug-interaction', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { medicines, patientAllergies } = req.body;

    if (!medicines || !Array.isArray(medicines)) {
      return res.status(400).json({ error: 'Medicines array is required' });
    }

    const interactions = checkDrugInteractions(medicines, patientAllergies || []);
    res.json({ data: interactions });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to check drug interactions' });
  }
});

function generateMockSuggestion(diagnosis: string) {
  const suggestions: Record<string, any> = {
    diabetes: {
      medicines: [
        { name: 'Metformin 1000mg', genericName: 'Metformin HCl', dose: '1-0-1', reason: 'First-line therapy for T2DM' },
        { name: 'Glimepiride 2mg', genericName: 'Glimepiride', dose: '1-0-0', reason: 'Add sulfonylurea for better control' },
      ],
      warnings: ['Monitor blood glucose regularly', 'Check HbA1c after 3 months'],
      interactions: [],
      notes: 'Consider adding second agent if HbA1c > 7.5%',
    },
    hypertension: {
      medicines: [
        { name: 'Ramipril 5mg', genericName: 'Ramipril', dose: '0-0-1', reason: 'ACE inhibitor - first line for HTN with diabetes' },
        { name: 'Amlodipine 5mg', genericName: 'Amlodipine Besylate', dose: '0-0-1', reason: 'CCB for additional BP control' },
      ],
      warnings: ['Monitor serum creatinine and potassium with ACE inhibitor'],
      interactions: [],
      notes: 'Target BP < 130/80 mmHg for diabetic patients',
    },
    default: {
      medicines: [
        { name: 'Ramipril 5mg', genericName: 'Ramipril', dose: '0-0-1', reason: 'ACE inhibitor for dual benefit' },
        { name: 'Metformin 1000mg', genericName: 'Metformin HCl', dose: '1-0-1', reason: 'Better glycemic control' },
      ],
      warnings: ['Monitor BP closely'],
      interactions: [],
      notes: 'Based on diagnosis + patient history',
    },
  };

  const diagnosisLower = diagnosis.toLowerCase();

  if (diagnosisLower.includes('diabetes')) return suggestions.diabetes;
  if (diagnosisLower.includes('hypertension')) return suggestions.hypertension;

  return suggestions.default;
}

function checkDrugInteractions(medicines: string[], allergies: string[]) {
  const interactions: string[] = [];
  const warnings: string[] = [];

  const rules: Record<string, string[]> = {
    'aspirin': ['warfarin', 'ibuprofen', 'naproxen'],
    'metformin': ['alcohol', 'contrast dye'],
    'ramipril': ['potassium', 'spironolactone'],
  };

  const lower = medicines.map(m => m.toLowerCase());

  for (const [drug, interacts] of Object.entries(rules)) {
    if (lower.some(m => m.includes(drug))) {
      for (const i of interacts) {
        if (lower.some(m => m.includes(i))) {
          interactions.push(`${drug} may interact with ${i}`);
        }
      }
    }
  }

  for (const allergy of allergies) {
    if (lower.some(m => m.includes(allergy.toLowerCase()))) {
      warnings.push(`Patient is allergic to ${allergy}`);
    }
  }

  return { interactions, warnings };
}

export default router;
