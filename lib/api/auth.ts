import api from './client';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

export const authApi = {
  // tenantSlug vai no header x-tenant-slug automaticamente (via interceptor)
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot-password', data),

  resetPassword: (data: { token: string; password: string }) =>
    api.post('/auth/reset-password', data),

  // tenantSlug vai no header x-tenant-slug automaticamente (via interceptor)
  register: (data: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data),
};
