import { useAuthStore } from '../store/useAuthStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export class APIError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = 'APIError';
  }
}

interface FetchOptions extends RequestInit {
  json?: any;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, logout } = useAuthStore.getState();
  
  const headers = new Headers(options.headers || {});
  
  // Set Authorization Header if token is present
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Set Content-Type to application/json if sending JSON, unless body is FormData
  let body = options.body;
  if (options.json) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.json);
  }
  
  const config: RequestInit = {
    ...options,
    headers,
    body,
  };
  
  const response = await fetch(`${BASE_URL}${path}`, config);
  
  if (response.status === 401) {
    logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new APIError(401, 'Session expired. Please log in again.');
  }
  
  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new APIError(response.status, errorDetail);
  }
  
  // Handled for 204 No Content
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json() as Promise<T>;
}
