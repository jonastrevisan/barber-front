import api from './client';

export interface Schedule {
  workDays: number[]; // 0=Dom, 1=Seg, ..., 6=Sab
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  blockedDates: string[]; // YYYY-MM-DD
}

export const schedulesApi = {
  mine: () => api.get<Schedule>('/schedules/mine'),
  update: (data: { workDays?: number[]; startTime?: string; endTime?: string }) =>
    api.put<Schedule>('/schedules/mine', data),
  toggleBlockedDate: (date: string) =>
    api.post<{ blocked: boolean; date: string }>('/schedules/mine/blocked-dates', { date }),
  get: (professionalId: string) =>
    api.get<Schedule>(`/schedules/${professionalId}`),
};
