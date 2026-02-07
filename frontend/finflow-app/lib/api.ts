/**
 * API client for FinFlow backend. Uses env or default base URL.
 */

const BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:3000';

export interface ApiError {
  message: string;
  statusCode?: number;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, ...init } = options;
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
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
    api.post<LoginResponse>('/auth/login', { email, password }),

  register: (email: string, password: string) =>
    api.post<RegisterResponse>('/auth/register', { email, password }),
};
