/**
 * Loads the Indian medicine dataset (prisma/medicines.csv) into the
 * `medicines` table. Safe to re-run: existing ids are skipped.
 *
 *   Local:      npm run db:load-medicines
 *   Cloud Run:  the `docassist-ops` job with args ["dist/scripts/load-medicines.js"]
 */
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { prisma } from '../lib/prisma';

const BATCH_SIZE = 2000;
const CSV_PATH = process.env.MEDICINES_CSV || path.join(process.cwd(), 'prisma', 'medicines.csv');

function parseInteractions(raw: string): object {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    try {
      // Some rows use Python-style literals.
      return JSON.parse(
        raw.replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bFalse\b/g, 'false').replace(/\bTrue\b/g, 'true'),
      );
    } catch {
      return {};
    }
  }
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`Medicine CSV not found at ${CSV_PATH}`);
  }
  console.log(`Loading medicines from ${CSV_PATH}`);

  const batch: any[] = [];
  let total = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    const result = await prisma.medicine.createMany({ data: batch, skipDuplicates: true });
    total += result.count;
    batch.length = 0;
    console.log(`  inserted ${total} so far`);
  };

  for await (const row of fs.createReadStream(CSV_PATH).pipe(csv())) {
    if (!row.id || !row.name) continue;
    batch.push({
      id: row.id,
      name: row.name.trim(),
      manufacturer: row.manufacturer_name || null,
      packSizeLabel: row.pack_size_label || null,
      saltComposition: row.salt_composition || null,
      medicineDesc: row.medicine_desc || null,
      sideEffects: row.side_effects || null,
      drugInteractions: parseInteractions(row.drug_interactions),
    });
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();

  const count = await prisma.medicine.count();
  console.log(`Done. Inserted ${total} new rows; table now has ${count} medicines.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
