import { apiClient } from './client';
import { appointmentsApi } from './appointments';
import { patientsApi } from './patients';
import { usersApi } from './users';
import { availabilityApi } from './availability';
import { log } from '../utils/logger';

const MODULE = 'PrescriptionsAPI';

// Prescriptions API
export const prescriptionsApi = {
  getAll: async (params?: { doctorId?: string; patientId?: string }) => {
    log.info(MODULE, 'Fetching prescriptions', params);
    const queryParams = new URLSearchParams();
    if (params?.doctorId && params.doctorId !== 'all') queryParams.append('doctorId', params.doctorId);
    if (params?.patientId && params.patientId !== 'all') queryParams.append('patientId', params.patientId);
    const query = queryParams.toString();
    return apiClient.get(`/prescriptions${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    log.info(MODULE, `Fetching prescription: ${id}`);
    return apiClient.get(`/prescriptions/${id}`);
  },

  create: async (data: any) => {
    log.info(MODULE, 'Creating prescription');
    return apiClient.post('/prescriptions', data);
  },
};

export {
  apiClient,
  appointmentsApi,
  patientsApi,
  usersApi,
  availabilityApi,
};
