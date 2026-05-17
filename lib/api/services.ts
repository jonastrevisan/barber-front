import api from './client';

export interface Service {
  id: number;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  tenant_id: number;
  color?: string;
}

export const servicesApi = {
  list: () => api.get<Service[]>('/services'),
  get: (id: number) => api.get<Service>(`/services/${id}`),
  create: (data: Omit<Service, 'id' | 'is_active' | 'tenant_id'>) =>
    api.post<Service>('/services', data),
  update: (id: number, data: Partial<Service>) =>
    api.put<Service>(`/services/${id}`, data),
  toggleActive: (id: number) => api.patch<Service>(`/services/${id}/toggle-active`),
  remove: (id: number) => api.delete(`/services/${id}`),
};
