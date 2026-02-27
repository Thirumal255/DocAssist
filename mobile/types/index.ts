export interface User {
  id: string;
  email: string;
  name: string;
  role: 'doctor' | 'admin';
  specialty?: string;
  hospitalId?: string;
  registrationNumber?: string;
  phone?: string;
  avatarUrl?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  bloodGroup?: string;
  allergies: string[];
  chronicConditions: string[];
  address?: string;
  emergencyContact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vitals {
  id: string;
  visitId: string;
  bp?: string;
  weight?: number;
  height?: number;
  temperature?: number;
  spo2?: number;
  pulse?: number;
  recordedAt: string;
}

export type AppointmentStatus = 'scheduled' | 'checked_in' | 'consulting' | 'completed' | 'cancelled';
export type AppointmentType = 'new' | 'follow_up' | 'emergency';

export interface Appointment {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: User;
  scheduledAt: string;
  status: AppointmentStatus;
  type: AppointmentType;
  chiefComplaint?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Visit {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: User;
  appointmentId?: string;
  visitedAt: string;
  chiefComplaint?: string;
  diagnosis?: string;
  notes?: string;
  vitals?: Vitals;
  prescription?: Prescription;
  createdAt: string;
}

export interface Medicine {
  id: string;
  brandName: string;
  genericName: string;
  strength: string;
  form: string;
  manufacturer?: string;
  mrp?: number;
  category?: string;
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicineId?: string;
  medicineName: string;
  genericName?: string;
  dose: string;
  frequency: string;
  timing: 'before_food' | 'after_food' | 'with_food' | 'any_time';
  days: number;
  instructions?: string;
}

export interface Prescription {
  id: string;
  visitId: string;
  visit?: Visit;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  items: PrescriptionItem[];
  pdfUrl?: string;
  aiSuggestionUsed: boolean;
  createdAt: string;
}

export interface AISuggestion {
  medicines: {
    name: string;
    genericName: string;
    dose: string;
    reason: string;
  }[];
  warnings: string[];
  interactions: string[];
  notes: string;
}

export interface DashboardStats {
  todayAppointments: number;
  pendingAppointments: number;
  totalPatients: number;
  completedToday: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
