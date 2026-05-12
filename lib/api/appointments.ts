import api from './client';

export interface Appointment {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  service: { id: number; name: string; duration_minutes: number; price: number };
  professional: { id: number; name: string };
  client?: { id: number; name: string; phone?: string };
}

export interface Stats {
  total_revenue: number;
  total_appointments: number;
  by_status: { pending: number; confirmed: number; completed: number; cancelled: number };
  by_professional?: { id: number; name: string; revenue: number; count: number }[];
  by_service?: { id: number; name: string; revenue: number; count: number }[];
  upcoming: Pick<Appointment, 'id' | 'date' | 'start_time' | 'end_time' | 'status' | 'service' | 'professional' | 'client'>[];
}

export const appointmentsApi = {
  stats: (params?: { from?: string; to?: string; professional_id?: number }) =>
    api.get<Stats>('/appointments/stats', { params }),
  list: (params?: { date?: string }) => api.get<Appointment[]>('/appointments', { params }),
  mine: () => api.get<Appointment[]>('/appointments/mine'),
  availableSlots: (params: {
    professional_id: number;
    service_id: number;
    date: string;
  }) => api.get<{ slots: string[]; duration: number }>('/appointments/available-slots', { params }),
  availableDates: (params: {
    professional_id: number;
    service_id: number;
    month: string;
  }) => api.get<string[]>('/appointments/available-dates', { params }),
  create: (data: {
    professional_id: number;
    service_id: number;
    date: string;
    start_time: string;
    notes?: string;
    client_id?: number;
  }) => api.post<Appointment>('/appointments', data),
  cancel: (id: number) => api.patch(`/appointments/${id}/cancel`),
  complete: (id: number) => api.patch(`/appointments/${id}/complete`),
};
