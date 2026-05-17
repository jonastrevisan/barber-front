import api from './client';

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  phone?: string;
  address?: string;
  payment_methods?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
  phone?: string;
  address?: string;
}

export const tenantsApi = {
  me: () => api.get<Tenant>('/tenants/me'),
  updateMe: (data: Partial<CreateTenantPayload> & { payment_methods?: string[] }) =>
    api.patch<Tenant>('/tenants/me', data),
  list: () => api.get<Tenant[]>('/tenants'),
  create: (data: CreateTenantPayload) => api.post<Tenant>('/tenants', data),
  update: (id: number, data: Partial<CreateTenantPayload>) =>
    api.patch<Tenant>(`/tenants/${id}`, data),
  remove: (id: number) => api.delete(`/tenants/${id}`),
  toggleActive: (id: number) =>
    api.patch<Tenant>(`/tenants/${id}/toggle-active`),
};
