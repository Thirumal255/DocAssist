import { api } from './client';
import { Prescription, AISuggestion } from '../types';
import { log } from '../utils/logger';

const MODULE = 'PrescriptionsAPI';

export interface CreatePrescriptionData {
  patientId: string;
  visitId?: string;  // Optional - backend will create visit if not provided
  diagnosis: string;
  items: {
    medicineName: string;
    genericName?: string;
    dose: string;
    frequency: string;
    timing: 'before_food' | 'after_food' | 'with_food' | 'any_time';
    days: number;
    instructions?: string;
  }[];
  aiSuggestionUsed?: boolean;
}

export const prescriptionsApi = {
  // Create new prescription
  create: async (data: CreatePrescriptionData) => {
    log.info(MODULE, 'Creating prescription', {
      patientId: data.patientId,
      itemCount: data.items.length,
      hasVisitId: !!data.visitId
    });
    return api.post<Prescription>('/prescriptions', data);
  },

  // Get prescription by ID
  getById: async (id: string) => {
    log.info(MODULE, `Fetching prescription: ${id}`);
    return api.get<Prescription>(`/prescriptions/${id}`);
  },

  // Get prescriptions by patient
  getByPatient: async (patientId: string) => {
    log.info(MODULE, `Fetching prescriptions for patient: ${patientId}`);
    return api.get<Prescription[]>(`/prescriptions/patient/${patientId}`);
  },

  // Get prescription PDF URL
  getPdf: async (id: string) => {
    log.info(MODULE, `Generating PDF for prescription: ${id}`);
    return api.get<{ url: string }>(`/prescriptions/${id}/pdf`);
  },
};

export const aiApi = {
  // Get AI suggestions for prescription
  getSuggestions: async (diagnosis: string, patientId: string) => {
    log.info(MODULE, 'Requesting AI suggestions', { diagnosisLength: diagnosis.length, patientId });
    return api.post<AISuggestion>('/ai/suggest', { diagnosis, patientId });
  },

  // Check drug interactions
  checkInteractions: async (medicines: string[], patientAllergies: string[]) => {
    log.info(MODULE, 'Checking drug interactions', { medicineCount: medicines.length });
    return api.post<{ warnings: string[] }>('/ai/drug-interaction', {
      medicines,
      patientAllergies,
    });
  },
};
