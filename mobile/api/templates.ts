import { apiClient } from './client';
import { log } from '../utils/logger';

const MODULE = 'TemplatesAPI';

export interface PrescriptionTemplate {
  id: string;
  name: string;
  brandColor: string;
  headerStyle: string;
  paperSize: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicContact?: string;
  showVitals: boolean;
  showDiagnosis: boolean;
  showPatientDetails: boolean;
  footerText?: string;
  logoUrl?: string;
  digitalSignatureUrl?: string;
}

export const templatesApi = {
  // Get all templates for the dropdown
  getAll: async () => {
    log.info(MODULE, 'Fetching all templates');
    return apiClient.get<PrescriptionTemplate[]>('/templates');
  },

  // Create a new template (Uses FormData because of image uploads)
  create: async (formData: FormData) => {
    log.info(MODULE, 'Creating new template with images');
    return apiClient.post<PrescriptionTemplate>('/templates', formData); 
  },
};