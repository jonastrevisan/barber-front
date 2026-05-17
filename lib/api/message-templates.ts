import api from './client';

export interface MessageTemplate {
  id: number;
  type: string;
  template: string;
}

export interface TemplateMeta {
  type: string;
  label: string;
}

export const messageTemplatesApi = {
  list: () => api.get<MessageTemplate[]>('/message-templates'),
  getMeta: () => api.get<TemplateMeta[]>('/message-templates/meta'),
  upsert: (type: string, template: string) =>
    api.put<MessageTemplate>(`/message-templates/${type}`, { template }),
};
