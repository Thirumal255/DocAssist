// mobile/api/client.ts

// FIX: Import directly from the file to break the circular dependency
// DO NOT import from '../store' (the index file)
import { useAuthStore } from '../store/authStore'; 
import { log } from '../utils/logger';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Define the standard response structure
interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private getHeaders(): HeadersInit {
    // Access token directly from the store state
    const token = useAuthStore.getState().token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const method = options.method || 'GET';
    const url = `${API_URL}${endpoint}`;
    
    log.debug('API', `→ ${method} ${endpoint}`, options.body ? JSON.parse(options.body as string) : undefined);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const duration = Date.now() - startTime;
      const rawData = await response.json();

      log.api(method, endpoint, response.status, duration);

      if (!response.ok) {
        log.error('API', `Request failed: ${endpoint}`, { status: response.status, error: rawData.error });
        
        if (response.status === 401) {
          log.warn('API', 'Unauthorized - logging out user');
          useAuthStore.getState().logout();
        }
        
        return { error: rawData.error || rawData.details || 'Request failed' };
      }

      // Normalization: Ensure response always has a 'data' property
      const normalizedResponse: ApiResponse<T> = 
        (rawData && rawData.data !== undefined) 
          ? rawData 
          : { success: true, data: rawData as T };

      // logging response stats for debugging
      log.debug('API', `← Response from ${endpoint}`, { 
        isArray: Array.isArray(normalizedResponse.data),
        dataKeys: (!Array.isArray(normalizedResponse.data) && normalizedResponse.data) ? Object.keys(normalizedResponse.data) : null 
      });

      return normalizedResponse;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      log.error('API', `Network error: ${endpoint}`, error);
      log.api(method, endpoint, 0, duration);
      
      return { error: 'Network error. Please check your connection and ensure backend is running.' };
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    log.info('API', `POST ${endpoint}`, { bodyKeys: Object.keys(body) });
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    log.info('API', `PUT ${endpoint}`, { bodyKeys: Object.keys(body) });
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    log.info('API', `DELETE ${endpoint}`);
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export both names to support all your files
export const apiClient = new ApiClient();
export const api = apiClient;
export { API_URL };