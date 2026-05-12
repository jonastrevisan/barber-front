import api from './client';

export interface Schedule {
  work_days: number[]; // 0=Dom, 1=Seg, ..., 6=Sab
  start_time: string;  // HH:MM
  end_time: string;    // HH:MM
  blocked_dates: string[]; // YYYY-MM-DD
}

export const schedulesApi = {
  mine: () => api.get<Schedule>('/schedules/mine'),
  update: (data: { work_days?: number[]; start_time?: string; end_time?: string }) =>
    api.put<Schedule>('/schedules/mine', data),
  toggleBlockedDate: (date: string) =>
    api.post<{ blocked: boolean; date: string }>('/schedules/mine/blocked-dates', { date }),
  get: (professionalId: string) =>
    api.get<Schedule>(`/schedules/${professionalId}`),
};
