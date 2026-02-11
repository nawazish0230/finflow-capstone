/**
 * API client for FinFlow backend. Uses env or default base URL.
 * Auth (login/register) uses auth-service; other endpoints use upload-service.
 * Upload-service requires Authorization: Bearer <token> only.
 */

const BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:3000';

/** Auth service base URL (register, login). Defaults to BASE_URL if not set. */
const AUTH_BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_AUTH_API_URL) ||
  BASE_URL;

/** Analytics service base URL. Defaults to BASE_URL if not set. */
const ANALYTICS_BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ANALYTICS_API_URL) ||
  BASE_URL;

export interface ApiError {
  message: string;
  statusCode?: number;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null; baseUrl?: string } = {}
): Promise<T> {
  const { token, baseUrl, ...init } = options;
  const root =
    baseUrl ??
    (path.startsWith('/analytics') ? ANALYTICS_BASE_URL : BASE_URL);
  const url = path.startsWith('http') ? path : `${root}${path}`;
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
      baseUrl: AUTH_BASE_URL,
    }),

  register: (email: string, password: string) =>
    request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
      baseUrl: AUTH_BASE_URL,
    }),
};
