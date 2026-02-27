import { apiClient } from './client';
import { Patient, CreatePatientInput, UpdatePatientInput } from '../types';
import { log } from '../utils/logger';

const MODULE = 'PatientsAPI';

export const patientsApi = {
  getAll: async (search?: string, doctorId?: string) => {
    log.info(MODULE, 'Fetching patients list', { search, doctorId });
    const params = new URLSearchParams();
    params.append('page', '1');
    params.append('limit', '100');
    if (search) params.append('search', search);
    if (doctorId) params.append('doctorId', doctorId);
    return apiClient.get<Patient[]>(`/patients?${params.toString()}`);
  },

  getById: async (id: string) => {
    log.info(MODULE, `Fetching patient: ${id}`);
    return apiClient.get<Patient>(`/patients/${id}`);
  },

  getHistory: async (patientId: string) => {
    log.info(MODULE, `Fetching history for patient: ${patientId}`);
    return apiClient.get(`/patients/${patientId}/history`);
  },

  create: async (data: CreatePatientInput) => {
    log.info(MODULE, 'Creating patient', { name: data.name });
    return apiClient.post<Patient>('/patients', data);
  },

  update: async (id: string, data: UpdatePatientInput) => {
    log.info(MODULE, `Updating patient: ${id}`);
    return apiClient.put<Patient>(`/patients/${id}`, data);
  },

  delete: async (id: string) => {
    log.info(MODULE, `Deleting patient: ${id}`);
    return apiClient.delete(`/patients/${id}`);
  },
};
