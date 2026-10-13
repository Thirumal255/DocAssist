import { api } from './client';
import { Medicine } from '../types';

export const medicinesApi = {
  // Search medicines by name (brand or generic)
  search: async (query: string, limit = 10) => {
    if (!query || query.length < 2) {
      return { data: [] };
    }
    return api.get<Medicine[]>(`/medicines/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  // Get medicine by ID
  getById: async (id: string) => {
    return api.get<Medicine>(`/medicines/${id}`);
  },

  // This doctor's usual dose/frequency/timing/days for a medicine
  usualDose: async (medicineId?: string, name?: string) => {
    const params = new URLSearchParams();
    if (medicineId) params.set('medicineId', medicineId);
    if (name) params.set('name', name);
    return api.get<{
      source: string;
      usual: { dose: string; frequency: string; timing: string; days: number; uses: number } | null;
      totalUses: number;
    }>(`/suggestions/medicine-defaults?${params.toString()}`);
  },

  // --- NEW: Create medicine on the fly ---
  create: async (name: string) => {
    return api.post<Medicine>('/medicines', { name });
  }
};
