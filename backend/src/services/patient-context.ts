import { prisma } from '../lib/prisma';
import type { PatientContext } from './openai.service';

/** Age in whole years on the given date. */
export function ageOn(dob: Date, on = new Date()): number {
  let age = on.getFullYear() - dob.getFullYear();
  const beforeBirthday = on.getMonth() < dob.getMonth() || (on.getMonth() === dob.getMonth() && on.getDate() < dob.getDate());
  if (beforeBirthday) age--;
  return Math.max(age, 0);
}

/**
 * De-identified clinical context sent to the AI: no name, phone, address
 * or exact date of birth.
 */
export async function getPatientContext(patientId: string): Promise<PatientContext> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      visits: {
        take: 3,
        orderBy: { visitedAt: 'desc' },
        include: { prescription: { include: { items: true } } },
      },
    },
  });
  if (!patient) throw new Error('Patient not found');

  return {
    age: ageOn(patient.dob),
    gender: patient.gender,
    chronicConditions: patient.chronicConditions ?? [],
    allergies: patient.allergies ?? [],
    recentPrescriptions: patient.visits
      .filter((v) => v.prescription)
      .map((v) => ({
        diagnosis: v.prescription!.diagnosis,
        medicines: v.prescription!.items.map((i) => i.medicineName),
        date: v.visitedAt.toISOString().slice(0, 10),
      })),
  };
}
