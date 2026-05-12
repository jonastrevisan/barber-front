import api from './client';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatar?: string | null;
  tenant_id: number;
}

export const usersApi = {
  me: () => api.get<User>('/users/me'),
  professionals: () => api.get<User[]>('/users/professionals'),
  list: () => api.get<User[]>('/users'),
  create: (data: Partial<User> & { password: string }) =>
    api.post<User>('/users', data),
  update: (id: number, data: Partial<User> & { password?: string }) =>
    api.put<User>(`/users/${id}`, data),
  remove: (id: number) => api.delete(`/users/${id}`),
  updateMe: (data: { name?: string; phone?: string; avatar?: null }) =>
    api.patch<User>('/users/me', data),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post<User>('/users/me/avatar', form);
  },
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.patch('/users/me/password', data),
};
