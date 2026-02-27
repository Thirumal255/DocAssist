import { useAuthStore } from '../store';
import { log } from '../utils/logger';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
      const data = await response.json();

      log.api(method, endpoint, response.status, duration);

      if (!response.ok) {
        log.error('API', `Request failed: ${endpoint}`, { status: response.status, error: data.error });
        
        // Handle 401 - unauthorized (token expired)
        if (response.status === 401) {
          log.warn('API', 'Unauthorized - logging out user');
          useAuthStore.getState().logout();
        }
        
        return { error: data.error || data.details || 'Request failed' };
      }

      log.debug('API', `← Response from ${endpoint}`, { dataKeys: data.data ? Object.keys(data.data) : null });
      return data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      log.error('API', `Network error: ${endpoint}`, error);
      log.api(method, endpoint, 0, duration);
      
      return { error: 'Network error. Please check your connection and ensure backend is running.' };
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    log.info('API', `POST ${endpoint}`, { bodyKeys: Object.keys(body) });
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // PUT request
  async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    log.info('API', `PUT ${endpoint}`, { bodyKeys: Object.keys(body) });
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    log.info('API', `DELETE ${endpoint}`);
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
export { API_URL };
