import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
// Import the actual OpenAI service functions
import { getPrescriptionSuggestions, checkDrugInteractions } from '../services/openai.service';
import { getPatientContext } from '../services/patient-context';
import { checkPrescriptionSafety } from '../services/rx-safety';

const router = Router();

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
// 3. Drug Interaction Route (kept for the current app; same response shape)
//    Database rules first; the AI check is a labelled second opinion.
// ------------------------------------------------------------------
router.post('/drug-interaction', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { medicines, patientAllergies, patientId } = req.body;

    if (!medicines || !Array.isArray(medicines)) {
      return res.status(400).json({ error: 'Medicines array is required' });
    }
    const names: string[] = medicines.filter((m: unknown) => typeof m === 'string' && m.trim()).slice(0, 30);
    const allergies: string[] = Array.isArray(patientAllergies) ? patientAllergies : [];

    const rules = await checkPrescriptionSafety({
      items: names.map((name) => ({ name })),
      allergies,
      patientId: typeof patientId === 'string' ? patientId : undefined,
    });
    const ai = process.env.OPENAI_API_KEY
      ? await checkDrugInteractions(names, allergies)
      : { interactions: [], warnings: [] };

    const icon: Record<string, string> = { critical: '⛔', high: '⚠️', medium: '⚠️', low: 'ℹ️', info: 'ℹ️' };
    const ruleLines = rules.warnings.map((w) => `${icon[w.severity]} ${w.message}`);
    const aiLines = [...ai.interactions, ...ai.warnings].map((w) => `🤖 AI check (verify): ${w}`);

    res.json({
      interactions: rules.warnings.filter((w) => w.type === 'interaction').map((w) => w.message),
      warnings: [...ruleLines, ...aiLines],
      details: rules.warnings,
      ok: rules.ok,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to check drug interactions' });
  }
});

export default router;