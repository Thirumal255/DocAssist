import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface MedicineSearchResult {
  id: string;
  name: string;
  manufacturer: string | null;
  packSizeLabel: string | null;
  saltComposition: string | null;
  medicineDesc: string | null;
  sideEffects: string | null;
  drugInteractions: unknown;
  usageCount: number; // how often this doctor has prescribed it
}

/**
 * Typeahead search over the medicine database, ranked for the doctor typing:
 *   1. medicines this doctor prescribes most
 *   2. brand names starting with the query
 *   3. entries with a known salt composition (safety checks can run on them)
 *   4. closest spelling (trigram similarity), then shorter names
 * Matches brand or salt, and tolerates typos ("augmentn" finds Augmentin).
 */
export async function searchMedicines(doctorId: string, rawQuery: string, limit = 20): Promise<MedicineSearchResult[]> {
  const q = rawQuery.trim().slice(0, 60);
  if (q.length < 2) return [];
  const escaped = q.replace(/[\\%_]/g, '\\$&');
  const contains = `%${escaped}%`;
  const prefix = `${escaped}%`;
  const take = Math.min(Math.max(limit, 1), 50);

  return prisma.$queryRaw<MedicineSearchResult[]>(Prisma.sql`
    WITH usage AS (
      SELECT pi."medicineId" AS mid, lower(pi."medicineName") AS lname, count(*)::int AS uses
      FROM prescription_items pi
      JOIN prescriptions p ON p.id = pi."prescriptionId"
      WHERE p."doctorId" = ${doctorId}
      GROUP BY 1, 2
    )
    , ranked AS (
    SELECT DISTINCT ON (lower(m.name))
           m.id, m.name,
           m.manufacturer_name AS "manufacturer",
           m.pack_size_label   AS "packSizeLabel",
           m.salt_composition  AS "saltComposition",
           m.medicine_desc     AS "medicineDesc",
           m.side_effects      AS "sideEffects",
           m.drug_interactions AS "drugInteractions",
           COALESCE((SELECT sum(u.uses) FROM usage u
                     WHERE u.mid = m.id OR u.lname = lower(m.name)), 0)::int AS "usageCount"
    FROM medicines m
    WHERE m.name ILIKE ${contains}
       OR m.salt_composition ILIKE ${contains}
       OR m.name % ${q}
    -- The dataset repeats some brand names; keep the most complete row of each.
    ORDER BY lower(m.name), (m.salt_composition IS NOT NULL AND m.salt_composition <> '') DESC, m.id
    )
    SELECT * FROM ranked
    ORDER BY "usageCount" DESC,
             (name ILIKE ${prefix}) DESC,
             ("saltComposition" IS NOT NULL AND "saltComposition" <> '') DESC,
             similarity(name, ${q}) DESC,
             length(name) ASC
    LIMIT ${take}`);
}
