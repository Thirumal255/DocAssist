import { api } from './client';
import { Visit, Vitals } from '../types';

export interface CreateVisitData {
  patientId: string;
  appointmentId?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  notes?: string;
  vitals?: {
    bp?: string;
    weight?: number;
    height?: number;
    temperature?: number;
    spo2?: number;
    pulse?: number;
  };
}

export const visitsApi = {
  // Create new visit
  create: async (data: CreateVisitData) => {
    return api.post<Visit>('/visits', data);
  },

  // Get visit by ID
  getById: async (id: string) => {
    return api.get<Visit>(`/visits/${id}`);
  },

  // Update visit
  update: async (id: string, data: Partial<CreateVisitData>) => {
    return api.put<Visit>(`/visits/${id}`, data);
  },

  // Add/Update vitals for a visit
  updateVitals: async (visitId: string, vitals: Partial<Vitals>) => {
    return api.put<Vitals>(`/visits/${visitId}/vitals`, vitals);
  },
};
