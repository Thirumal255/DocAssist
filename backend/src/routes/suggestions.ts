/**
 * Prescription suggestions for the doctor typing a prescription.
 *
 * Most suggestions come from the doctor's own history and the clinic's data,
 * not from AI: they are instant, repeatable and trusted. AI is only a labelled
 * fallback when the doctor has no history for a diagnosis, and every AI
 * regimen passes the rule-based safety check before it is returned.
 *
 *   GET  /api/suggestions/medicine-defaults   usual dose/frequency/timing/days for a medicine
 *   GET  /api/suggestions/diagnoses           autocomplete from this doctor's past diagnoses
 *   GET  /api/suggestions/diagnosis           this doctor's usual regimens for a diagnosis (+ AI fallback)
 *   GET  /api/suggestions/patient-context/:id history panel: allergies, current meds, recent visits, vitals
 *   POST /api/suggestions/safety-check        allergy, duplicate-salt and interaction check
 *   POST /api/suggestions/feedback            record accepted/edited/rejected suggestions
 */
import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { checkPrescriptionSafety, activeMedicines } from '../services/rx-safety';
import { getPatientContext, ageOn } from '../services/patient-context';
import { getPrescriptionSuggestions } from '../services/openai.service';

const router = Router();
router.use(authMiddleware);

const badRequest = (res: Response, error: z.ZodError) =>
  res.status(400).json({ error: 'Invalid request', details: error.flatten().fieldErrors });

// ---------------------------------------------------------------------------
// Usual dose for a medicine, from this doctor's own prescriptions.
// ---------------------------------------------------------------------------
const defaultsQuery = z
  .object({ medicineId: z.string().min(1).optional(), name: z.string().min(2).max(120).optional() })
  .refine((v) => v.medicineId || v.name, { message: 'medicineId or name is required' });

router.get('/medicine-defaults', async (req: AuthRequest, res: Response) => {
  const parsed = defaultsQuery.safeParse(req.query);
  if (!parsed.success) return badRequest(res, parsed.error);
  const { medicineId = '', name = '' } = parsed.data;

  try {
    const rows = await prisma.$queryRaw<{ dose: string; frequency: string; timing: string; days: number; uses: number }[]>`
      SELECT pi.dose, pi.frequency, pi.timing, pi.days, count(*)::int AS uses
      FROM prescription_items pi
      JOIN prescriptions p ON p.id = pi."prescriptionId"
      WHERE p."doctorId" = ${req.user!.id}
        AND (pi."medicineId" = ${medicineId} OR lower(pi."medicineName") = lower(${name}))
      GROUP BY pi.dose, pi.frequency, pi.timing, pi.days
      ORDER BY uses DESC, max(p."createdAt") DESC
      LIMIT 3`;

    const totalUses = rows.reduce((n, r) => n + r.uses, 0);
    res.json({
      source: 'doctor_history',
      usual: rows[0] ?? null,
      alternatives: rows.slice(1),
      totalUses,
    });
  } catch (error) {
    console.error('medicine-defaults error:', error);
    res.status(500).json({ error: 'Failed to load usual dose' });
  }
});

// ---------------------------------------------------------------------------
// Diagnosis autocomplete from this doctor's own past diagnoses.
// ---------------------------------------------------------------------------
router.get('/diagnoses', async (req: AuthRequest, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  if (q.length < 2) return res.json([]);
  const contains = `%${q.replace(/[\\%_]/g, '\\$&')}%`;

  try {
    const rows = await prisma.$queryRaw<{ diagnosis: string; uses: number }[]>`
      SELECT min(diagnosis) AS diagnosis, count(*)::int AS uses
      FROM prescriptions
      WHERE "doctorId" = ${req.user!.id}
        AND (diagnosis ILIKE ${contains} OR diagnosis % ${q})
      GROUP BY lower(trim(diagnosis))
      ORDER BY uses DESC, max(similarity(diagnosis, ${q})) DESC
      LIMIT 8`;
    res.json(rows);
  } catch (error) {
    console.error('diagnoses error:', error);
    res.status(500).json({ error: 'Failed to load diagnoses' });
  }
});

// ---------------------------------------------------------------------------
// "Your usual for viral fever": the doctor's most-used regimens for a
// similar diagnosis. Falls back to AI (labelled) only when there is no history.
// ---------------------------------------------------------------------------
const diagnosisQuery = z.object({
  q: z.string().trim().min(2).max(120),
  patientId: z.string().min(1).optional(),
  fallbackToAi: z.enum(['true', 'false']).optional(),
});

router.get('/diagnosis', async (req: AuthRequest, res: Response) => {
  const parsed = diagnosisQuery.safeParse(req.query);
  if (!parsed.success) return badRequest(res, parsed.error);
  const { q, patientId, fallbackToAi } = parsed.data;

  try {
    // Group past prescriptions by their set of medicines ("regimen"), so the
    // same combination prescribed many times counts as one, frequently used regimen.
    const groups = await prisma.$queryRaw<{ uses: number; last_used: Date; latest_id: string; matched_diagnosis: string }[]>`
      WITH matched AS (
        SELECT p.id, p."createdAt", p.diagnosis,
               (SELECT string_agg(lower(pi."medicineName"), '|' ORDER BY lower(pi."medicineName"))
                  FROM prescription_items pi WHERE pi."prescriptionId" = p.id) AS signature
        FROM prescriptions p
        WHERE p."doctorId" = ${req.user!.id}
          AND (lower(trim(p.diagnosis)) = lower(${q})
               OR (p.diagnosis % ${q} AND similarity(p.diagnosis, ${q}) >= 0.45))
      )
      SELECT count(*)::int AS uses,
             max("createdAt") AS last_used,
             (array_agg(id ORDER BY "createdAt" DESC))[1] AS latest_id,
             (array_agg(diagnosis ORDER BY "createdAt" DESC))[1] AS matched_diagnosis
      FROM matched
      WHERE signature IS NOT NULL
      GROUP BY signature
      ORDER BY uses DESC, last_used DESC
      LIMIT 3`;

    if (groups.length > 0) {
      const latest = await prisma.prescriptionItem.findMany({
        where: { prescriptionId: { in: groups.map((g) => g.latest_id) } },
      });
      return res.json({
        source: 'doctor_history',
        regimens: groups.map((g) => ({
          uses: g.uses,
          lastUsed: g.last_used,
          matchedDiagnosis: g.matched_diagnosis,
          // Doses from the most recent time this regimen was used.
          items: latest
            .filter((i) => i.prescriptionId === g.latest_id)
            .map(({ medicineId, medicineName, genericName, dose, frequency, timing, days, instructions }) => ({
              medicineId, medicineName, genericName, dose, frequency, timing, days, instructions,
            })),
        })),
      });
    }

    if (fallbackToAi !== 'true' || !patientId || !process.env.OPENAI_API_KEY) {
      return res.json({ source: 'none', regimens: [] });
    }

    // No history: ask the AI, then run every suggestion through the rules.
    const context = await getPatientContext(patientId);
    const ai = await getPrescriptionSuggestions(q, undefined, context);
    const safety = ai.medicines.length
      ? await checkPrescriptionSafety({
          patientId,
          items: ai.medicines.map((m) => ({ name: m.name, genericName: m.genericName })),
        })
      : null;

    res.json({ source: 'ai', regimens: [], ai, safety });
  } catch (error: any) {
    if (error?.message === 'Patient not found') return res.status(404).json({ error: 'Patient not found' });
    console.error('diagnosis suggestion error:', error);
    res.status(500).json({ error: 'Failed to load suggestions' });
  }
});

// ---------------------------------------------------------------------------
// History panel for the prescription screen.
// ---------------------------------------------------------------------------
router.get('/patient-context/:patientId', async (req: AuthRequest, res: Response) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.patientId },
      select: { id: true, name: true, dob: true, gender: true, bloodGroup: true, allergies: true, chronicConditions: true },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const [visits, current] = await Promise.all([
      prisma.visit.findMany({
        where: { patientId: patient.id },
        orderBy: { visitedAt: 'desc' },
        take: 5,
        include: {
          vitals: true,
          doctor: { select: { id: true, name: true } },
          prescription: { include: { items: { select: { medicineName: true, dose: true, days: true } } } },
        },
      }),
      activeMedicines(patient.id),
    ]);

    const lastVitals = visits.find((v) => v.vitals)?.vitals ?? null;

    res.json({
      patient: { ...patient, age: ageOn(patient.dob) },
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions,
      currentMedicines: current.map((m) => ({ name: m.name, until: m.until })),
      lastVitals,
      recentVisits: visits.map((v) => ({
        id: v.id,
        date: v.visitedAt,
        doctor: v.doctor,
        chiefComplaint: v.chiefComplaint,
        diagnosis: v.prescription?.diagnosis ?? v.diagnosis,
        medicines: v.prescription?.items ?? [],
        vitals: v.vitals,
      })),
    });
  } catch (error) {
    console.error('patient-context error:', error);
    res.status(500).json({ error: 'Failed to load patient context' });
  }
});

// ---------------------------------------------------------------------------
// Safety check before saving.
// ---------------------------------------------------------------------------
const safetyBody = z.object({
  patientId: z.string().min(1).optional(),
  allergies: z.array(z.string().max(80)).max(30).optional(),
  items: z
    .array(
      z.object({
        medicineId: z.string().min(1).nullish(),
        name: z.string().trim().min(1).max(160),
        genericName: z.string().max(300).nullish(),
      }),
    )
    .min(1)
    .max(30),
});

router.post('/safety-check', async (req: AuthRequest, res: Response) => {
  const parsed = safetyBody.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  try {
    res.json(await checkPrescriptionSafety(parsed.data));
  } catch (error) {
    console.error('safety-check error:', error);
    res.status(500).json({ error: 'Safety check failed' });
  }
});

// ---------------------------------------------------------------------------
// Learning loop: what the doctor did with each suggestion.
// ---------------------------------------------------------------------------
const feedbackBody = z.object({
  kind: z.enum(['medicine_search', 'dose_default', 'diagnosis_regimen', 'ai_regimen', 'safety_warning']),
  outcome: z.enum(['accepted', 'edited', 'rejected', 'ignored']),
  patientId: z.string().min(1).optional(),
  suggestion: z.unknown(),
  final: z.unknown().optional(),
});

router.post('/feedback', async (req: AuthRequest, res: Response) => {
  const parsed = feedbackBody.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const { kind, outcome, patientId, suggestion, final } = parsed.data;
  if (suggestion === undefined) return res.status(400).json({ error: 'suggestion is required' });
  if (JSON.stringify({ suggestion, final }).length > 20_000) {
    return res.status(413).json({ error: 'Feedback payload too large' });
  }

  try {
    await prisma.suggestionEvent.create({
      data: {
        doctorId: req.user!.id,
        patientId: patientId ?? null,
        kind,
        outcome,
        suggestion: suggestion as Prisma.InputJsonValue,
        final: final === undefined ? undefined : (final as Prisma.InputJsonValue),
      },
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

export default router;
