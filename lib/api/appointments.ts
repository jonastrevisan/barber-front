import api from './client';

export interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  service: { id: string; name: string; durationMinutes: number; price: number };
  professional: { id: string; name: string };
  client?: { id: string; name: string };
}

export const appointmentsApi = {
  list: () => api.get<Appointment[]>('/appointments'),
  mine: () => api.get<Appointment[]>('/appointments/mine'),
  availableSlots: (params: {
    professionalId: string;
    serviceId: string;
    date: string;
  }) => api.get<{ slots: string[]; duration: number }>('/appointments/available-slots', { params }),
  availableDates: (params: {
    professionalId: string;
    serviceId: string;
    month: string;
  }) => api.get<string[]>('/appointments/available-dates', { params }),
  create: (data: {
    professionalId: string;
    serviceId: string;
    date: string;
    startTime: string;
    notes?: string;
  }) => api.post<Appointment>('/appointments', data),
  cancel: (id: string) => api.patch(`/appointments/${id}/cancel`),
};
