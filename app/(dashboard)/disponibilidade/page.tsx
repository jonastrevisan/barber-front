'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { schedulesApi } from '@/lib/api/schedules';

const WEEK_DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function DisponibilidadePage() {
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingDays, setSavingDays] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [togglingDate, setTogglingDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );

  useEffect(() => {
    schedulesApi.mine()
      .then((r) => {
        setWorkDays(r.data.work_days);
        setStartTime(r.data.start_time ?? '08:00');
        setEndTime(r.data.end_time ?? '18:00');
        setBlockedDates(new Set(r.data.blocked_dates));
      })
      .catch(() => toast.error('Erro ao carregar disponibilidade'))
      .finally(() => setLoading(false));
  }, []);

  const toggleWorkDay = async (day: number) => {
    const next = workDays.includes(day)
      ? workDays.filter((d) => d !== day)
      : [...workDays, day].sort((a, b) => a - b);
    setWorkDays(next);
    setSavingDays(true);
    try {
      await schedulesApi.update({ work_days: next });
      toast.success('Dias de trabalho atualizados');
    } catch {
      setWorkDays(workDays);
      toast.error('Erro ao salvar');
    } finally {
      setSavingDays(false);
    }
  };

  const handleSaveHours = async () => {
    if (startTime >= endTime) {
      return toast.error('O horário de início deve ser anterior ao de fim');
    }
    setSavingHours(true);
    try {
      await schedulesApi.update({ start_time: startTime, end_time: endTime });
      toast.success('Horários atualizados');
    } catch {
      toast.error('Erro ao salvar horários');
    } finally {
      setSavingHours(false);
    }
  };

  const toggleDate = async (dateStr: string) => {
    if (togglingDate) return;
    setTogglingDate(dateStr);
    try {
      const res = await schedulesApi.toggleBlockedDate(dateStr);
      setBlockedDates((prev) => {
        const next = new Set(prev);
        res.data.blocked ? next.add(dateStr) : next.delete(dateStr);
        return next;
      });
    } catch {
      toast.error('Erro ao atualizar data');
    } finally {
      setTogglingDate(null);
    }
  };

  const [year, monthNum] = calendarMonth.split('-').map(Number);
  const firstWeekday = new Date(year, monthNum - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonth = todayStr.slice(0, 7);

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    const d = new Date(year, monthNum - 2, 1);
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(year, monthNum, 1);
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400 dark:text-gray-500">Carregando...</div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Disponibilidade</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gerencie seus dias de trabalho e horários</p>
      </div>

      {/* ── Dias da semana ── */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Dias da semana</h2>
          {savingDays && <span className="text-xs text-gray-400 dark:text-gray-500">Salvando...</span>}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_DAYS.map(({ label, value }) => {
            const active = workDays.includes(value);
            return (
              <button
                key={value}
                onClick={() => toggleWorkDay(value)}
                disabled={savingDays}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 disabled:opacity-60
                  ${active
                    ? 'bg-slate-900 dark:bg-slate-600 text-white shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          {workDays.length === 0
            ? 'Nenhum dia selecionado'
            : `${workDays.length} dia${workDays.length !== 1 ? 's' : ''} por semana`}
        </p>
      </section>

      {/* ── Horário de trabalho ── */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Horário de trabalho</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Intervalo de horários disponíveis para agendamento
        </p>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Início
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Fim
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
            />
          </div>
        </div>

        {startTime && endTime && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            {startTime >= endTime
              ? <span className="text-red-500 dark:text-red-400">Horário de fim deve ser após o início</span>
              : `Disponível das ${startTime} às ${endTime}`
            }
          </p>
        )}

        <button
          onClick={handleSaveHours}
          disabled={savingHours || startTime >= endTime}
          className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
        >
          <Check size={15} />
          {savingHours ? 'Salvando...' : 'Salvar horário'}
        </button>
      </section>

      {/* ── Datas bloqueadas ── */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Datas bloqueadas</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Clique em um dia para bloquear ou desbloquear
          </p>
        </div>

        {/* Header do calendário */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={prevMonth}
            disabled={calendarMonth <= currentMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-600 dark:text-gray-400"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {MONTH_NAMES[monthNum - 1]} {year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Labels */}
        <div className="grid grid-cols-7 px-3 pb-1">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 px-3 pb-5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="h-10" />;

            const dateStr = `${calendarMonth}-${String(day).padStart(2, '0')}`;
            const isPast = dateStr < todayStr;
            const isBlocked = blockedDates.has(dateStr);
            const isToggling = togglingDate === dateStr;
            const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
            const isWorkDay = workDays.includes(dayOfWeek);

            return (
              <div key={i} className="flex flex-col items-center py-0.5">
                <button
                  type="button"
                  disabled={isPast || isToggling}
                  onClick={() => toggleDate(dateStr)}
                  title={isBlocked ? 'Clique para desbloquear' : isWorkDay ? 'Clique para bloquear' : 'Dia sem expediente'}
                  className={`w-9 h-9 flex items-center justify-center text-sm rounded-full font-medium transition-all duration-150
                    ${isToggling ? 'opacity-50' : ''}
                    ${isPast ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed' : ''}
                    ${!isPast && isBlocked ? 'bg-red-500 text-white' : ''}
                    ${!isPast && !isBlocked && isWorkDay ? 'text-gray-900 dark:text-gray-100 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer' : ''}
                    ${!isPast && !isBlocked && !isWorkDay ? 'text-gray-300 dark:text-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''}
                  `}
                >
                  {day}
                </button>
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isBlocked && !isPast ? 'bg-red-400' : 'invisible'}`} />
              </div>
            );
          })}
        </div>

        {blockedDates.size > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 px-6 pb-5">
            {blockedDates.size} data{blockedDates.size !== 1 ? 's' : ''} bloqueada{blockedDates.size !== 1 ? 's' : ''}
          </p>
        )}
      </section>
    </div>
  );
}
