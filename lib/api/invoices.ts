import api from './client';

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  appointment_id?: number;
  service_id?: number;
}

export interface InvoicePayment {
  id: number;
  invoice_id: number;
  method: string;
  amount: number;
  paid_at: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  tenant_id: number;
  client_id: number;
  client: { id: number; name: string; phone?: string };
  date: string;
  status: 'open' | 'closed' | 'cancelled';
  notes?: string;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  created_at: string;
  updated_at: string;
}

export interface CreateInvoicePayload {
  client_id: number;
  date: string;
  notes?: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    discount: number;
    appointment_id?: number;
    service_id?: number;
  }[];
  payment?: {
    method: string;
    amount: number;
    paid_at: string;
  };
}

export const invoicesApi = {
  create: (data: CreateInvoicePayload) => api.post<Invoice>('/invoices', data),
  list: (params?: { client_id?: number; from?: string; to?: string }) => api.get<Invoice[]>('/invoices', { params }),
  get: (id: number) => api.get<Invoice>(`/invoices/${id}`),
  addPayment: (id: number, data: { method: string; amount: number; paid_at: string }) =>
    api.post<Invoice>(`/invoices/${id}/payments`, data),
  updateStatus: (id: number, status: Invoice['status']) =>
    api.patch<Invoice>(`/invoices/${id}/status`, { status }),
  remove: (id: number) => api.delete(`/invoices/${id}`),
};
