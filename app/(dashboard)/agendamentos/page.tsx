'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, Calendar, Clock, User, X, Scissors } from 'lucide-react';
import { appointmentsApi, Appointment } from '@/lib/api/appointments';
import { useAuth } from '@/lib/auth/AuthContext';

const statusLabel: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  confirmed: { label: 'Confirmado', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  completed: { label: 'Concluído', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
};

export default function AgendamentosPage() {
  const { isAdmin } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = isAdmin ? await appointmentsApi.list() : await appointmentsApi.mine();
      setAppointments(res.data);
    } catch {
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isAdmin]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
      await appointmentsApi.cancel(id);
      toast.success('Agendamento cancelado');
      load();
    } catch {
      toast.error('Erro ao cancelar');
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agendamentos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/agendamentos/novo"
          className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo agendamento</span>
          <span className="sm:hidden">Novo</span>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">Carregando...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nenhum agendamento ainda.</p>
          <Link
            href="/agendamentos/novo"
            className="inline-block mt-4 text-slate-700 dark:text-slate-400 font-medium text-sm hover:underline"
          >
            Criar primeiro agendamento
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const st = statusLabel[appt.status] || statusLabel.pending;
            return (
              <div
                key={appt.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2.5 sm:p-3 shrink-0">
                    <Scissors size={18} className="text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{appt.service.name}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {appt.startTime} - {appt.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {appt.professional.name}
                      </span>
                    </div>
                    {isAdmin && appt.client && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Cliente: {appt.client.name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                    {st.label}
                  </span>
                  {['pending', 'confirmed'].includes(appt.status) && (
                    <button
                      onClick={() => handleCancel(appt.id)}
                      className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Cancelar"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
