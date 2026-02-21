/**
 * API client for FinFlow backend. All requests go through API Gateway.
 * Gateway routes:
 * - /api/auth/* → Auth Service
 * - /api/upload/* → Upload Service
 * - /api/analytics/* → Analytics Service
 * - /api/chatbot/* → Chatbot Service
 */

const GATEWAY_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:3000';

export interface ApiError {
  message: string;
  statusCode?: number;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null; baseUrl?: string } = {}
): Promise<T> {
  const { token, baseUrl, ...init } = options;
  
  // Determine which service route to use based on path
  let gatewayPath = path;
  if (path.startsWith('/auth/')) {
    // Auth endpoints: /auth/login -> /api/auth/login
    gatewayPath = `/api${path}`;
  } else if (path.startsWith('/analytics')) {
    // Analytics endpoints: /analytics/summary -> /api/analytics/summary
    gatewayPath = `/api${path}`;
  } else if (path.startsWith('/chatbot')) {
    // Chatbot endpoints: /chatbot/chat -> /api/chatbot/chat
    gatewayPath = `/api${path}`;
  } else {
    // Upload and other endpoints: /upload -> /api/upload/upload
    gatewayPath = `/api/upload${path}`;
  }
  
  const root = baseUrl ?? GATEWAY_URL;
  const url = gatewayPath.startsWith('http') ? gatewayPath : `${root}${gatewayPath}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: ApiError = {
      message: data?.message ?? data?.error ?? 'Something went wrong',
      statusCode: res.status,
    };
    throw err;
  }

  return data as T;
}

export const api = {
  async post<T>(path: string, body: unknown, token?: string | null): Promise<T> {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body), token });
  },

  async get<T>(path: string, token?: string | null): Promise<T> {
    return request<T>(path, { method: 'GET', token });
  },
};

export interface LoginResponse {
  accessToken: string;
  expiresIn: string;
}

export interface RegisterResponse extends LoginResponse {}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
    }),

  register: (email: string, password: string) =>
    request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
    }),
};
