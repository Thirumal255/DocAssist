import { apiClient } from './client';
import { Prescription, AISuggestion } from '../types';
import { log } from '../utils/logger';

const MODULE = 'PrescriptionsAPI';

export interface CreatePrescriptionData {
  patientId: string;
  visitId?: string;
  diagnosis: string;
  vitals?: {
    bp?: string;
    weight?: number;
    pulse?: number;
    temperature?: number;
  };
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
  // --- ADDED THIS METHOD TO FIX CRASH ---
  getAll: async (params?: { doctorId?: string; patientId?: string }) => {
    log.info(MODULE, 'Fetching all prescriptions', params);
    const queryParams = new URLSearchParams();
    if (params?.doctorId && params.doctorId !== 'all') queryParams.append('doctorId', params.doctorId);
    if (params?.patientId && params.patientId !== 'all') queryParams.append('patientId', params.patientId);
    
    const query = queryParams.toString();
    return apiClient.get<Prescription[]>(`/prescriptions${query ? `?${query}` : ''}`);
  },

  create: async (data: CreatePrescriptionData) => {
    log.info(MODULE, 'Creating prescription', {
      patientId: data.patientId,
      itemCount: data.items.length,
    });
    return apiClient.post<Prescription>('/prescriptions', data);
  },

  getById: async (id: string) => {
    log.info(MODULE, `Fetching prescription: ${id}`);
    return apiClient.get<Prescription>(`/prescriptions/${id}`);
  },

  getByPatient: async (patientId: string) => {
    log.info(MODULE, `Fetching prescriptions for patient: ${patientId}`);
    return apiClient.get<Prescription[]>(`/prescriptions/patient/${patientId}`);
  },

  getPdf: async (id: string) => {
    log.info(MODULE, `Generating PDF for prescription: ${id}`);
    return apiClient.get<{ url: string }>(`/prescriptions/${id}/pdf`);
  },
};

export const aiApi = {
  getSuggestions: async (diagnosis: string, patientId: string) => {
    log.info(MODULE, 'Requesting AI suggestions');
    return apiClient.post<AISuggestion>('/ai/suggest', { diagnosis, patientId });
  },

  checkInteractions: async (medicines: string[], patientAllergies: string[]) => {
    log.info(MODULE, 'Checking drug interactions');
    return apiClient.post<{ warnings: string[] }>('/ai/drug-interaction', {
      medicines,
      patientAllergies,
    });
  },
};