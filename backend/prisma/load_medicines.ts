// load_medicines.ts

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// Initialize Prisma
const prisma = new PrismaClient();

// Configuration
const BATCH_SIZE = 5000; // Optimal batch size for bulk inserts
const CSV_FILENAME = 'medicines.csv';

async function main() {
  console.log('🚀 Starting bulk import for Medicines...');

  const csvFilePath = path.join(__dirname, CSV_FILENAME);
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Error: File '${CSV_FILENAME}' not found in ${__dirname}`);
    process.exit(1);
  }

  const batch: any[] = [];
  let totalProcessed = 0;

  // Create a read stream to handle large files (low memory usage)
  const stream = fs.createReadStream(csvFilePath).pipe(csv());

  console.log(`⏳ Reading ${CSV_FILENAME}...`);

  for await (const row of stream) {
    // 1. Map CSV Headers to Prisma Schema Fields
    const medicineRecord = {
      id: row.id,
      name: row.name,
      manufacturer: row.manufacturer_name,       // Maps to CSV 'manufacturer_name'
      packSizeLabel: row.pack_size_label,        // Maps to CSV 'pack_size_label'
      saltComposition: row.salt_composition,     // Maps to CSV 'salt_composition'
      medicineDesc: row.medicine_desc,           // Maps to CSV 'medicine_desc'
      sideEffects: row.side_effects,             // Maps to CSV 'side_effects'
      drugInteractions: safeJsonParse(row.drug_interactions), // Parse JSON string
    };

    batch.push(medicineRecord);

    // 2. Insert when batch is full
    if (batch.length >= BATCH_SIZE) {
      await insertBatch(batch);
      totalProcessed += batch.length;
      process.stdout.write(`\r✅ Processed ${totalProcessed} records...`);
      batch.length = 0; // Clear memory
    }
  }

  // 3. Insert remaining records
  if (batch.length > 0) {
    await insertBatch(batch);
    totalProcessed += batch.length;
  }

  console.log(`\n\n🎉 Job Complete! Successfully loaded ${totalProcessed} medicines.`);
}

// Helper: Insert a batch safely
async function insertBatch(data: any[]) {
  try {
    await prisma.medicine.createMany({
      data: data,
      skipDuplicates: true, // Prevents crashing if you re-run the script
    });
  } catch (error) {
    console.error('\n❌ Batch insert failed:', error);
  }
}

// Helper: Safely parse JSON strings from CSV
function safeJsonParse(str: string) {
  if (!str) return {};
  try {
    // Handle Python-style single quotes if present
    const cleanStr = str.replace(/'/g, '"').replace(/None/g, 'null').replace(/False/g, 'false').replace(/True/g, 'true');
    return JSON.parse(cleanStr);
  } catch (e) {
    return {}; // Return empty object if parsing fails
  }
}

// Execution
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });