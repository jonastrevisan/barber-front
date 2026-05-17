'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  DollarSign,
  Scissors,
  CreditCard,
} from 'lucide-react';
import { appointmentsApi, Stats } from '@/lib/api/appointments';
import { invoicesApi, Invoice } from '@/lib/api/invoices';
import { usersApi, User as ApiUser } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/AuthContext';

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  credito: 'Cartão de Crédito',
  debito: 'Cartão de Débito',
  transferencia: 'Transferência',
  voucher: 'Voucher',
};

const PAYMENT_COLORS: Record<string, string> = {
  pix: 'bg-emerald-500',
  dinheiro: 'bg-green-400',
  credito: 'bg-blue-500',
  debito: 'bg-violet-500',
  transferencia: 'bg-sky-500',
  voucher: 'bg-amber-500',
};

const statusLabel: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
};

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

function isoToday() {
  return new Date().toISOString().split('T')[0];
}

function firstDayOfMonth() {
  return isoToday().slice(0, 7) + '-01';
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short',
  });
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RankRow({
  rank,
  name,
  revenue,
  count,
}: {
  rank: number;
  name: string;
  revenue: number;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="w-5 text-center text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0">{rank}</span>
      <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{count} agend.</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white shrink-0 w-28 text-right">
        {formatCurrency(revenue)}
      </p>
    </div>
  );
}

function UpcomingCard({ appt }: { appt: Stats['upcoming'][number] }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="text-center shrink-0 w-10">
        <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{appt.start_time.slice(0, 5)}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(appt.date)}</p>
      </div>
      <div className="w-px self-stretch bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{appt.service.name}</p>
        {appt.client && (
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
            <User size={11} />
            {appt.client.name}
          </p>
        )}
        {appt.professional && (
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
            <Scissors size={11} />
            {appt.professional.name}
          </p>
        )}
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor[appt.status] ?? ''}`}>
        {statusLabel[appt.status] ?? appt.status}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { isAdmin, isProfessional } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(firstDayOfMonth);
  const [to, setTo] = useState(isoToday);
  const [professionals, setProfessionals] = useState<ApiUser[]>([]);
  const [filterProfId, setFilterProfId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!isAdmin) return;
    usersApi.professionals().then((r) => setProfessionals(r.data)).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
    const fetchStats = appointmentsApi.stats({ from, to, professional_id: filterProfId });
    const fetchInvoices = (isAdmin || isProfessional)
      ? invoicesApi.list({ from, to })
      : Promise.resolve(null);
    Promise.all([fetchStats, fetchInvoices])
      .then(([sRes, iRes]) => {
        setStats(sRes.data);
        setInvoices(iRes?.data ?? []);
      })
      .catch(() => toast.error('Erro ao carregar dashboard'))
      .finally(() => setLoading(false));
  }, [from, to, filterProfId, isAdmin, isProfessional]);

  const cancellationRate = stats
    ? stats.total_appointments > 0
      ? Math.round((stats.by_status.cancelled / stats.total_appointments) * 100)
      : 0
    : 0;

  const avgTicket =
    stats && stats.by_status.confirmed + stats.by_status.completed > 0
      ? stats.total_revenue / (stats.by_status.confirmed + stats.by_status.completed)
      : 0;

  const paymentBreakdown = (() => {
    const map: Record<string, number> = {};
    for (const inv of invoices) {
      for (const p of inv.payments) {
        map[p.method] = (map[p.method] ?? 0) + Number(p.amount);
      }
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([method, amount]) => ({ method, amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 }));
  })();

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {isProfessional ? 'Resumo da sua agenda' : isAdmin ? 'Visão geral do estabelecimento' : 'Seus agendamentos'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && professionals.length > 0 && (
            <div className="relative">
              <select
                value={filterProfId ?? ''}
                onChange={(e) => setFilterProfId(e.target.value ? Number(e.target.value) : undefined)}
                className="appearance-none border border-gray-300 dark:border-gray-600 rounded-lg pl-3 pr-8 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">Todos os profissionais</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
          <input
            type="date"
            value={from}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <span className="text-gray-400 text-sm">até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => e.target.value && setTo(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 text-gray-400 dark:text-gray-500">Carregando...</div>
      ) : !stats ? null : (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Faturamento"
              value={formatCurrency(stats.total_revenue)}
              sub={`${stats.by_status.confirmed + stats.by_status.completed} confirmados`}
              icon={<TrendingUp size={18} />}
              accent="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Agendamentos"
              value={String(stats.total_appointments)}
              sub={`${stats.by_status.pending} pendente${stats.by_status.pending !== 1 ? 's' : ''}`}
              icon={<Calendar size={18} />}
              accent="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            />
            {!isProfessional && (
              <StatCard
                label="Ticket médio"
                value={formatCurrency(avgTicket)}
                sub="por agendamento"
                icon={<DollarSign size={18} />}
                accent="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
              />
            )}
            <StatCard
              label="Cancelamentos"
              value={`${cancellationRate}%`}
              sub={`${stats.by_status.cancelled} cancelados`}
              icon={<XCircle size={18} />}
              accent="bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400"
            />
          </div>

          {/* Status breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Status dos agendamentos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'pending', label: 'Pendentes', icon: <AlertCircle size={15} />, color: 'text-yellow-600 dark:text-yellow-400' },
                { key: 'confirmed', label: 'Confirmados', icon: <CheckCircle2 size={15} />, color: 'text-green-600 dark:text-green-400' },
                { key: 'completed', label: 'Concluídos', icon: <CheckCircle2 size={15} />, color: 'text-gray-500 dark:text-gray-400' },
                { key: 'cancelled', label: 'Cancelados', icon: <XCircle size={15} />, color: 'text-red-500 dark:text-red-400' },
              ].map(({ key, label, icon, color }) => (
                <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className={color}>{icon}</span>
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                      {stats.by_status[key as keyof typeof stats.by_status]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment methods breakdown */}
          {(isAdmin || isProfessional) && paymentBreakdown.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Formas de pagamento</h2>
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                  {formatCurrency(paymentBreakdown.reduce((s, p) => s + p.amount, 0))} recebido
                </span>
              </div>
              <div className="space-y-3">
                {paymentBreakdown.map(({ method, amount, pct }) => (
                  <div key={method}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {PAYMENT_LABELS[method] ?? method}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">{pct}%</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white w-28 text-right">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${PAYMENT_COLORS[method] ?? 'bg-slate-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By professional — admin only */}
            {isAdmin && stats.by_professional && stats.by_professional.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Por profissional</h2>
                {stats.by_professional.map((p, i) => (
                  <RankRow key={p.id} rank={i + 1} name={p.name} revenue={p.revenue} count={p.count} />
                ))}
              </div>
            )}

            {/* By service */}
            {stats.by_service && stats.by_service.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Por serviço</h2>
                {stats.by_service.map((s, i) => (
                  <RankRow key={s.id} rank={i + 1} name={s.name} revenue={s.revenue} count={s.count} />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          {stats.upcoming.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Próximos agendamentos</h2>
                <Link
                  href="/agendamentos"
                  className="text-xs text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1"
                >
                  Ver todos <Clock size={11} />
                </Link>
              </div>
              {stats.upcoming.map((appt) => (
                <UpcomingCard key={appt.id} appt={appt} />
              ))}
            </div>
          )}

          {stats.total_appointments === 0 && (
            <div className="text-center py-12">
              <Calendar size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Sem dados para o período selecionado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
