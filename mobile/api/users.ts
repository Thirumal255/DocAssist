import { api } from './client';
import { log } from '../utils/logger';

const MODULE = 'UsersAPI';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'doctor';
  phone?: string;
  specialty?: string;
  registrationNo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'doctor';
  phone?: string;
  specialty?: string;
  registrationNo?: string;
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  specialty?: string;
  registrationNo?: string;
  isActive?: boolean;
  password?: string;
}

export const usersApi = {
  // Get all users (admin only)
  getAll: async (search?: string, role?: string) => {
    log.info(MODULE, 'Fetching all users', { search, role });
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    return api.get<User[]>(`/users?${params.toString()}`);
  },

  // Get all doctors (for dropdowns)
  getDoctors: async () => {
    log.info(MODULE, 'Fetching doctors list');
    return api.get<User[]>('/users/doctors');
  },

  // Get single user
  getById: async (id: string) => {
    log.info(MODULE, `Fetching user: ${id}`);
    return api.get<User>(`/users/${id}`);
  },

  // Create new user (admin only)
  create: async (data: CreateUserData) => {
    log.info(MODULE, 'Creating user', { email: data.email, role: data.role });
    return api.post<User>('/users', data);
  },

  // Update user
  update: async (id: string, data: UpdateUserData) => {
    log.info(MODULE, `Updating user: ${id}`);
    return api.put<User>(`/users/${id}`, data);
  },

  // Delete (deactivate) user
  delete: async (id: string) => {
    log.info(MODULE, `Deactivating user: ${id}`);
    return api.delete<User>(`/users/${id}`);
  },
};
