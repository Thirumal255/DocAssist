import { apiClient } from './client';

export const reportsApi = {
  // Pass 'today', 'week', or 'month' as the range
  getDashboardStats: (range: 'today' | 'week' | 'month') => 
    apiClient.get(`/reports?range=${range}`),
};