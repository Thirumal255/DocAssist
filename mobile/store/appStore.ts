import { create } from 'zustand';
import { Appointment, Patient, DashboardStats } from '../types';

interface AppState {
  stats: DashboardStats | null;
  setStats: (stats: DashboardStats) => void;
  todayQueue: Appointment[];
  setTodayQueue: (appointments: Appointment[]) => void;
  recentPatients: Patient[];
  setRecentPatients: (patients: Patient[]) => void;
  currentPatient: Patient | null;
  setCurrentPatient: (patient: Patient | null) => void;
  isRefreshing: boolean;
  setRefreshing: (isRefreshing: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  stats: null,
  setStats: (stats) => set({ stats }),
  todayQueue: [],
  setTodayQueue: (appointments) => set({ todayQueue: appointments }),
  recentPatients: [],
  setRecentPatients: (patients) => set({ recentPatients: patients }),
  currentPatient: null,
  setCurrentPatient: (patient) => set({ currentPatient: patient }),
  isRefreshing: false,
  setRefreshing: (isRefreshing) => set({ isRefreshing }),
  reset: () => set({ stats: null, todayQueue: [], recentPatients: [], currentPatient: null, isRefreshing: false }),
}));
