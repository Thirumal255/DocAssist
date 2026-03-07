import { apiClient } from './client';

export const invoicesApi = {
  // Fetch all invoices
  getAll: () => apiClient.get('/invoices'),
  
  // Collect a payment
  pay: (id: string, paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'OTHER') => 
    apiClient.put(`/invoices/${id}/pay`, { paymentMethod }),
};