import { apiClient } from './client';

export interface ClinicSettings {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoBase64?: string;
  brandColor: string;
  taxId?: string;
  footerText?: string;
}

export const clinicApi = {
  getSettings: () => apiClient.get('/clinic'),
  updateSettings: (data: Partial<ClinicSettings>) => apiClient.put('/clinic', data),
};