import { api } from './client';
import { Appointment, DashboardStats } from '../types';
import { log } from '../utils/logger';

const MODULE = 'AppointmentsAPI';

export interface CreateAppointmentData {
  patientId: string;
  doctorId: string;  // Required now
  scheduledAt: string;
  type: 'new_visit' | 'follow_up' | 'emergency';
  chiefComplaint?: string;
  notes?: string;
}

export interface UpdateAppointmentData {
  status?: 'scheduled' | 'checked_in' | 'consulting' | 'completed' | 'cancelled' | 'no_show';
  chiefComplaint?: string;
  notes?: string;
}

export const appointmentsApi = {
  // Get all appointments (with optional filters)
  getAll: async (date?: string, doctorId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (doctorId) params.append('doctorId', doctorId);
    if (status) params.append('status', status);
    log.info(MODULE, 'Fetching appointments', { date, doctorId, status });
    return api.get<Appointment[]>(`/appointments?${params.toString()}`);
  },

  // Get today's appointments for current doctor
  getToday: async (doctorId?: string) => {
    const params = doctorId ? `?doctorId=${doctorId}` : '';
    log.info(MODULE, 'Fetching today\'s appointments');
    return api.get<Appointment[]>(`/appointments/today${params}`);
  },

  // Get dashboard stats
  getStats: async () => {
    log.info(MODULE, 'Fetching dashboard stats');
    return api.get<DashboardStats>('/appointments/stats');
  },

  // Get single appointment
  getById: async (id: string) => {
    log.info(MODULE, `Fetching appointment: ${id}`);
    return api.get<Appointment>(`/appointments/${id}`);
  },

  // Create new appointment
  create: async (data: CreateAppointmentData) => {
    log.info(MODULE, 'Creating appointment', { patientId: data.patientId, doctorId: data.doctorId });
    return api.post<Appointment>('/appointments', data);
  },

  // Update appointment
  update: async (id: string, data: UpdateAppointmentData) => {
    log.info(MODULE, `Updating appointment: ${id}`, data);
    return api.put<Appointment>(`/appointments/${id}`, data);
  },

  // Reschedule appointment
  reschedule: async (id: string, newScheduledAt: string, reason?: string) => {
    log.info(MODULE, `Rescheduling appointment: ${id} to ${newScheduledAt}`);
    return api.post<Appointment>(`/appointments/${id}/reschedule`, { newScheduledAt, reason });
  },

  // Cancel appointment
  cancel: async (id: string, reason?: string) => {
    log.info(MODULE, `Cancelling appointment: ${id}`);
    return api.post<Appointment>(`/appointments/${id}/cancel`, { reason });
  },
};
