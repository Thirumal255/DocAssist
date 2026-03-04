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

  // --- NEW: Create medicine on the fly ---
  create: async (name: string) => {
    return api.post<Medicine>('/medicines', { name });
  }
};
