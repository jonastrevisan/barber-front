import api from './client';

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  tenantId: string;
}

export const servicesApi = {
  list: () => api.get<Service[]>('/services'),
  get: (id: string) => api.get<Service>(`/services/${id}`),
  create: (data: Omit<Service, 'id' | 'isActive' | 'tenantId'>) =>
    api.post<Service>('/services', data),
  update: (id: string, data: Partial<Service>) =>
    api.put<Service>(`/services/${id}`, data),
  remove: (id: string) => api.delete(`/services/${id}`),
};
