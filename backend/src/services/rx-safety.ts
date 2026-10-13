import { prisma } from '../lib/prisma';

/**
 * Rule-based prescription safety checks, built from the clinic's own medicine
 * database and patient record. No AI involved, so results are repeatable and
 * explainable ("Azithral contains azithromycin, which has a LIFE-THREATENING
 * interaction with terfenadine").
 *
 * Coverage limits of the current dataset (prisma/medicines.csv):
 *  - only ~3% of brands carry a salt composition, so brands without one can't
 *    be checked for duplicates, allergies or interactions (reported as
 *    "unverified" instead of silently passing);
 *  - interaction data exists for ~400 salts. Interactions are applied at salt
 *    level, so data recorded on one brand covers every brand with that salt.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SafetyWarning {
  severity: Severity;
  type: 'allergy' | 'interaction' | 'duplicate' | 'unverified';
  message: string;
  medicines: string[];
  source: 'medicine_database' | 'patient_record';
}

export interface RxItemInput {
  medicineId?: string | null;
  name: string;
  genericName?: string | null; // free text salts, e.g. from the app or an AI suggestion
}

interface ResolvedItem {
  name: string;
  salts: string[];
  current: boolean; // already taking (from an active earlier prescription)
}

// Spelling variants used across Indian and international labelling.
const SYNONYMS: Record<string, string> = {
  amoxycillin: 'amoxicillin',
  acetaminophen: 'paracetamol',
  albuterol: 'salbutamol',
  frusemide: 'furosemide',
  cefalexin: 'cephalexin',
  'clavulanate potassium': 'clavulanic acid',
  'acetylsalicylic acid': 'aspirin',
};

/** "Amoxycillin  (500mg) +  Clavulanic Acid (125mg)" -> ["amoxicillin", "clavulanic acid"] */
export function parseSalts(composition?: string | null): string[] {
  if (!composition) return [];
  return composition
    .split('+')
    .map((s) => normalizeSalt(s))
    .filter((s) => s.length > 1);
}

function normalizeSalt(s: string): string {
  const base = s
    .replace(/\(.*?\)/g, ' ')
    .replace(/\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|%|w\/v|w\/w)\b/gi, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return SYNONYMS[base] ?? base;
}

/** "chlorpheniramine maleate" matches "chlorpheniramine". */
function saltMatches(a: string, b: string): boolean {
  return a === b || a.startsWith(b + ' ') || b.startsWith(a + ' ');
}

// Drug classes for common allergy entries. A recorded allergy matches when it
// names the salt itself or one of these classes.
const ALLERGY_CLASSES: Record<string, string[]> = {
  penicillin: ['amoxicillin', 'ampicillin', 'cloxacillin', 'dicloxacillin', 'flucloxacillin', 'piperacillin', 'benzathine penicillin', 'penicillin', 'phenoxymethylpenicillin'],
  sulfa: ['sulfamethoxazole', 'sulfasalazine', 'sulfadiazine', 'silver sulfadiazine', 'sulfacetamide', 'dapsone'],
  nsaid: ['ibuprofen', 'diclofenac', 'aceclofenac', 'naproxen', 'mefenamic acid', 'ketorolac', 'aspirin', 'etoricoxib', 'nimesulide', 'piroxicam', 'indomethacin', 'celecoxib', 'flurbiprofen', 'ketoprofen', 'lornoxicam'],
  cephalosporin: ['cephalexin', 'cefadroxil', 'cefuroxime', 'cefixime', 'cefpodoxime', 'ceftriaxone', 'cefotaxime', 'cefoperazone', 'ceftazidime', 'cefdinir', 'cefepime'],
  macrolide: ['azithromycin', 'clarithromycin', 'erythromycin', 'roxithromycin'],
  fluoroquinolone: ['ciprofloxacin', 'ofloxacin', 'levofloxacin', 'moxifloxacin', 'norfloxacin', 'prulifloxacin'],
  tetracycline: ['doxycycline', 'minocycline', 'tetracycline'],
  statin: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin', 'lovastatin', 'pitavastatin'],
};
const CLASS_ALIASES: Record<string, string> = {
  penicillins: 'penicillin', sulpha: 'sulfa', 'sulfa drugs': 'sulfa', sulphonamide: 'sulfa', sulfonamide: 'sulfa',
  nsaids: 'nsaid', painkillers: 'nsaid', cephalosporins: 'cephalosporin', macrolides: 'macrolide',
  quinolone: 'fluoroquinolone', quinolones: 'fluoroquinolone', fluoroquinolones: 'fluoroquinolone',
  tetracyclines: 'tetracycline', statins: 'statin',
};

function allergyHits(allergy: string, salts: string[]): string[] {
  const a = normalizeSalt(allergy);
  if (!a) return [];
  const cls = ALLERGY_CLASSES[CLASS_ALIASES[a] ?? a];
  return salts.filter((s) => saltMatches(s, a) || (cls?.some((c) => saltMatches(s, c)) ?? false));
}

const EFFECT_SEVERITY: Record<string, Severity> = {
  'LIFE-THREATENING': 'critical',
  SERIOUS: 'high',
  MODERATE: 'medium',
  MINOR: 'low',
};

// salt -> [{ drug, effect }], built once from the medicines table.
type InteractionMap = Map<string, { drug: string; effect: string }[]>;
let interactionMapPromise: Promise<InteractionMap> | null = null;

async function buildInteractionMap(): Promise<InteractionMap> {
  const rows = await prisma.$queryRaw<{ salt_composition: string; drug_interactions: any }[]>`
    SELECT salt_composition, drug_interactions FROM medicines
    WHERE salt_composition IS NOT NULL
      AND jsonb_typeof(drug_interactions -> 'drug') = 'array'
      AND jsonb_array_length(drug_interactions -> 'drug') > 0`;
  const map: InteractionMap = new Map();
  for (const row of rows) {
    const drugs: string[] = row.drug_interactions?.drug ?? [];
    const effects: string[] = row.drug_interactions?.effect ?? [];
    for (const salt of parseSalts(row.salt_composition)) {
      const list = map.get(salt) ?? [];
      drugs.forEach((d, i) => {
        const drug = normalizeSalt(d);
        const effect = (effects[i] || '').toUpperCase();
        if (!drug || !EFFECT_SEVERITY[effect]) return; // skips BENEFICIAL / unknown
        if (!list.some((x) => x.drug === drug)) list.push({ drug, effect });
      });
      map.set(salt, list);
    }
  }
  return map;
}

function getInteractionMap(): Promise<InteractionMap> {
  if (!interactionMapPromise) {
    interactionMapPromise = buildInteractionMap().catch((err) => {
      interactionMapPromise = null; // retry on next call
      throw err;
    });
  }
  return interactionMapPromise;
}

/** Look up salts for the given items from the medicine database. */
export async function resolveItems(items: RxItemInput[], current = false): Promise<ResolvedItem[]> {
  const ids = items.map((i) => i.medicineId).filter((x): x is string => !!x);
  const names = items.filter((i) => !i.medicineId && i.name).map((i) => i.name.trim().toLowerCase());
  const rows = ids.length || names.length
    ? await prisma.$queryRaw<{ id: string; lname: string; salt_composition: string | null }[]>`
        SELECT id, lower(name) AS lname, salt_composition FROM medicines
        WHERE id = ANY(${ids}::text[]) OR lower(name) = ANY(${names}::text[])`
    : [];
  return items.map((item) => {
    const row = rows.find((r) => (item.medicineId ? r.id === item.medicineId : r.lname === item.name.trim().toLowerCase()));
    const dbSalts = parseSalts(row?.salt_composition);
    const salts = dbSalts.length ? dbSalts : parseSalts(item.genericName);
    return { name: item.name, salts, current };
  });
}

/** Medicines from this patient's earlier prescriptions whose course hasn't ended. */
export async function activeMedicines(patientId: string, now = new Date()): Promise<{ medicineId: string | null; name: string; genericName: string | null; until: Date }[]> {
  const since = new Date(now.getTime() - 180 * 24 * 3600 * 1000);
  const prescriptions = await prisma.prescription.findMany({
    where: { patientId, createdAt: { gte: since } },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  const seen = new Set<string>();
  const active: { medicineId: string | null; name: string; genericName: string | null; until: Date }[] = [];
  for (const p of prescriptions) {
    for (const item of p.items) {
      const until = new Date(p.createdAt.getTime() + item.days * 24 * 3600 * 1000);
      const key = item.medicineName.toLowerCase();
      if (until >= now && !seen.has(key)) {
        seen.add(key);
        active.push({ medicineId: item.medicineId, name: item.medicineName, genericName: item.genericName, until });
      }
    }
  }
  return active;
}

export interface SafetyResult {
  ok: boolean; // false when any critical/high warning exists
  warnings: SafetyWarning[];
  checkedAgainstCurrentMedicines: string[];
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

export async function checkPrescriptionSafety(params: {
  items: RxItemInput[];
  allergies?: string[];
  patientId?: string;
}): Promise<SafetyResult> {
  const newItems = await resolveItems(params.items);
  let allergies = params.allergies ?? [];
  let currentItems: ResolvedItem[] = [];

  if (params.patientId) {
    const patient = await prisma.patient.findUnique({ where: { id: params.patientId }, select: { allergies: true } });
    allergies = [...new Set([...allergies, ...(patient?.allergies ?? [])])];
    const newNames = new Set(params.items.map((i) => i.name.trim().toLowerCase()));
    const active = (await activeMedicines(params.patientId)).filter((a) => !newNames.has(a.name.toLowerCase()));
    currentItems = await resolveItems(active.map((a) => ({ medicineId: a.medicineId, name: a.name, genericName: a.genericName })), true);
  }

  const warnings: SafetyWarning[] = [];
  const label = (i: ResolvedItem) => (i.current ? `${i.name} (already taking)` : i.name);

  // 1. Unverifiable medicines: say so instead of implying they passed.
  const unverified = newItems.filter((i) => i.salts.length === 0).map((i) => i.name);
  if (unverified.length) {
    warnings.push({
      severity: 'info',
      type: 'unverified',
      message: `No salt composition on record for ${unverified.join(', ')}, so allergy, duplicate and interaction checks could not be run for ${unverified.length === 1 ? 'it' : 'them'}.`,
      medicines: unverified,
      source: 'medicine_database',
    });
  }

  // 2. Allergies (new medicines only).
  for (const item of newItems) {
    for (const allergy of allergies) {
      const hits = allergyHits(allergy, item.salts);
      if (hits.length) {
        warnings.push({
          severity: 'critical',
          type: 'allergy',
          message: `${item.name} contains ${hits.join(', ')}; patient has a recorded allergy: ${allergy}.`,
          medicines: [item.name],
          source: 'patient_record',
        });
      }
    }
  }

  // 3. Duplicate therapy: the same salt in two medicines.
  const all = [...newItems, ...currentItems];
  for (let i = 0; i < newItems.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const shared = all[i].salts.filter((s) => all[j].salts.some((t) => saltMatches(s, t)));
      if (shared.length) {
        warnings.push({
          severity: all[j].current ? 'medium' : 'high',
          type: 'duplicate',
          message: `${label(all[i])} and ${label(all[j])} both contain ${shared.join(', ')}.`,
          medicines: [all[i].name, all[j].name],
          source: 'medicine_database',
        });
      }
    }
  }

  // 4. Interactions between salts, both directions.
  const map = await getInteractionMap();
  const seenPairs = new Set<string>();
  for (let i = 0; i < newItems.length; i++) {
    for (let j = 0; j < all.length; j++) {
      if (i === j) continue;
      // Interaction data may be recorded on either medicine's salt, so check both ways.
      for (const [a, b] of [[all[i], all[j]], [all[j], all[i]]] as const) {
        for (const salt of a.salts) {
          for (const { drug, effect } of map.get(salt) ?? []) {
            const hit = b.salts.find((t) => saltMatches(t, drug));
            if (!hit) continue;
            const key = [all[i].name, all[j].name].sort().join('|') + '|' + [salt, hit].sort().join('|');
            if (seenPairs.has(key)) continue;
            seenPairs.add(key);
            warnings.push({
              severity: EFFECT_SEVERITY[effect],
              type: 'interaction',
              message: `${effect.toLowerCase()} interaction: ${label(a)} (${salt}) with ${label(b)} (${hit}).`,
              medicines: [a.name, b.name],
              source: 'medicine_database',
            });
          }
        }
      }
    }
  }

  warnings.sort((x, y) => SEVERITY_ORDER.indexOf(x.severity) - SEVERITY_ORDER.indexOf(y.severity));
  return {
    ok: !warnings.some((w) => w.severity === 'critical' || w.severity === 'high'),
    warnings,
    checkedAgainstCurrentMedicines: currentItems.map((c) => c.name),
  };
}
