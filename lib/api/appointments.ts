import api from './client';

export interface ScheduleBlock {
  id: number;
  professional_id: number;
  professional?: { id: number; name: string };
  date: string;
  start_time: string;
  end_time: string;
  description?: string;
}

export interface Appointment {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  service: { id: number; name: string; duration_minutes: number; price: number; color?: string };
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
  list: (params?: { date?: string; from?: string; to?: string }) => api.get<Appointment[]>('/appointments', { params }),
  mine: (params?: { from?: string; to?: string }) => api.get<Appointment[]>('/appointments/mine', { params }),
  busy: (params?: { from?: string; to?: string }) => api.get<{ id: number; date: string; start_time: string; end_time: string; professional_id: number }[]>('/appointments/busy', { params }),
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
  createBatch: (data: {
    professional_id: number;
    service_id: number;
    dates: string[];
    start_time: string;
    notes?: string;
    client_id?: number;
  }) => api.post<{ created: Appointment[]; skipped: string[]; adjusted: { from: string; to: string }[] }>('/appointments/batch', data),
  cancel: (id: number) => api.patch(`/appointments/${id}/cancel`),
  cancelBatch: (ids: number[]) => api.patch('/appointments/batch/cancel', { ids }),
  complete: (id: number) => api.patch(`/appointments/${id}/complete`),
  createBlock: (data: {
    professional_id: number;
    date: string;
    start_time: string;
    end_time: string;
    description?: string;
  }) => api.post<ScheduleBlock>('/schedule-blocks', data),
  createBlockBatch: (blocks: {
    professional_id: number;
    date: string;
    start_time: string;
    end_time: string;
    description?: string;
  }[]) => api.post<ScheduleBlock[]>('/schedule-blocks/batch', { blocks }),
  listBlocks: (params?: { from?: string; to?: string; professional_id?: number }) =>
    api.get<ScheduleBlock[]>('/schedule-blocks', { params }),
  deleteBlock: (id: number) => api.delete(`/schedule-blocks/${id}`),
  deleteBlockBatch: (ids: number[]) => api.delete('/schedule-blocks/batch', { data: { ids } }),
};
