import api from './client';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    tenant_id: number;
    avatar: string | null;
  };
}

export const authApi = {
  // tenantSlug vai no header x-tenant-slug automaticamente (via interceptor)
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot-password', data),

  verifyResetCode: (data: { email: string; code: string }) =>
    api.post<{ token: string }>('/auth/verify-reset-code', data),

  resetPassword: (data: { token: string; password: string }) =>
    api.post('/auth/reset-password', data),

  // tenantSlug vai no header x-tenant-slug automaticamente (via interceptor)
  register: (data: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data),
};
