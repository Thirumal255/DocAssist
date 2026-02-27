import { api } from './client';
import { log } from '../utils/logger';

const MODULE = 'AvailabilityAPI';

export interface DoctorAvailability {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  dayName?: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  slotDuration?: number;
}

export interface AvailableSlotsResponse {
  available: boolean;
  date: string;
  dayName: string;
  isToday?: boolean;
  periods?: { startTime: string; endTime: string; slotDuration: number }[];
  slots: TimeSlot[];
  totalSlots?: number;
  availableSlots?: number;
  bookedSlots?: number;
  message?: string;
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration?: number;
}

export interface DoctorWithAvailability {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  availability: DoctorAvailability[];
}

export const availabilityApi = {
  // Get all doctors with their availability
  getAllDoctors: async () => {
    log.info(MODULE, 'Fetching all doctors with availability');
    return api.get<DoctorWithAvailability[]>('/availability/doctors');
  },

  // Get doctor's availability schedule (all slots)
  getByDoctor: async (doctorId: string) => {
    log.info(MODULE, `Fetching availability for doctor: ${doctorId}`);
    return api.get<DoctorAvailability[]>(`/availability/${doctorId}`);
  },

  // Get available slots for a specific date
  // excludeAppointmentId: When rescheduling, exclude current appointment from booked list
  getSlots: async (doctorId: string, date: string, excludeAppointmentId?: string) => {
    log.info(MODULE, `Fetching slots for doctor ${doctorId} on ${date}`);
    let url = `/availability/${doctorId}/slots?date=${date}`;
    if (excludeAppointmentId) {
      url += `&excludeAppointmentId=${excludeAppointmentId}`;
    }
    return api.get<AvailableSlotsResponse>(url);
  },

  // Add new availability slot(s)
  addSlots: async (doctorId: string, slots: AvailabilitySlot[]) => {
    log.info(MODULE, `Adding ${slots.length} slots for doctor: ${doctorId}`);
    return api.post<DoctorAvailability[]>(`/availability/${doctorId}`, { slots });
  },

  // Replace all availability (bulk update)
  replaceAll: async (doctorId: string, slots: AvailabilitySlot[]) => {
    log.info(MODULE, `Replacing all availability for doctor: ${doctorId}`);
    return api.put<DoctorAvailability[]>(`/availability/${doctorId}/replace`, { slots });
  },

  // Update single slot
  updateSlot: async (slotId: string, data: Partial<AvailabilitySlot & { isActive?: boolean }>) => {
    log.info(MODULE, `Updating slot: ${slotId}`);
    return api.put<DoctorAvailability>(`/availability/slot/${slotId}`, data);
  },

  // Delete single slot
  deleteSlot: async (slotId: string) => {
    log.info(MODULE, `Deleting slot: ${slotId}`);
    return api.delete(`/availability/slot/${slotId}`);
  },
};
