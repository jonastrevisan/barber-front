'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { appointmentsApi } from '@/lib/api/appointments';
import { servicesApi, Service } from '@/lib/api/services';
import { usersApi, User } from '@/lib/api/users';
import { avatarSrc } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Scissors,
  User as UserIcon,
  CheckCircle2,
  Sunrise,
  Sun,
} from 'lucide-react';
import Link from 'next/link';

const schema = z.object({
  serviceId: z.number({ error: 'Selecione um serviço' }).positive(),
  professionalId: z.number({ error: 'Selecione um profissional' }).positive(),
  date: z.string().min(1, 'Selecione uma data'),
  startTime: z.string().min(1, 'Selecione um horário'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function groupSlots(slots: string[]) {
  const morning = slots.filter((s) => parseInt(s.split(':')[0], 10) < 12);
  const afternoon = slots.filter((s) => parseInt(s.split(':')[0], 10) >= 12);
  return { morning, afternoon };
}

export default function NovoAgendamentoPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [loadingDates, setLoadingDates] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const serviceId = watch('serviceId');
  const professionalId = watch('professionalId');
  const date = watch('date');
  const startTime = watch('startTime');

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedProfessional = professionals.find((p) => p.id === professionalId);

  useEffect(() => {
    Promise.all([
      servicesApi.list().catch(() => { toast.error('Erro ao carregar serviços'); return { data: [] as Service[] }; }),
      usersApi.professionals().catch(() => { toast.error('Erro ao carregar profissionais'); return { data: [] as User[] }; }),
    ]).then(([svcRes, profRes]) => {
      setServices(svcRes.data);
      setProfessionals(profRes.data);
    });
  }, []);

  useEffect(() => {
    if (!serviceId || !professionalId) {
      setAvailableDates(new Set());
      return;
    }
    setLoadingDates(true);
    appointmentsApi
      .availableDates({ service_id: serviceId, professional_id: professionalId, month: calendarMonth })
      .then((r) => setAvailableDates(new Set(r.data)))
      .catch(() => toast.error('Erro ao buscar datas disponíveis'))
      .finally(() => setLoadingDates(false));
  }, [serviceId, professionalId, calendarMonth]);

  useEffect(() => {
    if (!serviceId || !professionalId || !date) return;
    setLoadingSlots(true);
    setValue('startTime', '');
    appointmentsApi
      .availableSlots({ service_id: serviceId, professional_id: professionalId, date })
      .then((r) => setSlots(r.data.slots))
      .catch(() => toast.error('Erro ao buscar horários'))
      .finally(() => setLoadingSlots(false));
  }, [serviceId, professionalId, date]);

  const onSubmit = async (data: FormData) => {
    try {
      await appointmentsApi.create({
        service_id: data.serviceId,
        professional_id: data.professionalId,
        date: data.date,
        start_time: data.startTime,
        notes: data.notes,
      });
      toast.success('Agendamento realizado!');
      router.push('/agendamentos');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao agendar';
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? msg);
    }
  };

  const { morning, afternoon } = groupSlots(slots);

  const formattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      })
    : null;

  const readyToConfirm = serviceId && professionalId && date && startTime;

  return (
    <div>
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link
            href="/agendamentos"
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors shrink-0"
          >
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Novo agendamento</h1>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5 hidden sm:block">Escolha o serviço, profissional, data e horário</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8 lg:flex lg:gap-8 lg:items-start">
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-w-0 space-y-8">

          {/* Serviço */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Serviço</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setValue('serviceId', s.id); setValue('startTime', ''); }}
                  className={`text-left p-4 rounded-2xl border-2 transition-all duration-150 ${
                    serviceId === s.id
                      ? 'border-slate-900 dark:border-slate-500 bg-slate-900 dark:bg-slate-700 text-white shadow-md'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold text-sm leading-snug ${serviceId === s.id ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {s.name}
                    </p>
                    {serviceId === s.id && <CheckCircle2 size={16} className="text-white shrink-0 mt-0.5" />}
                  </div>
                  {s.description && (
                    <p className={`text-xs mt-1 leading-relaxed ${serviceId === s.id ? 'text-slate-300' : 'text-gray-400 dark:text-gray-500'}`}>
                      {s.description}
                    </p>
                  )}
                  <div className={`flex items-center gap-3 mt-3 text-xs font-medium ${serviceId === s.id ? 'text-slate-300' : 'text-gray-500 dark:text-gray-400'}`}>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {s.duration_minutes} min
                    </span>
                    <span className={`${serviceId === s.id ? 'text-white' : 'text-slate-700 dark:text-slate-300'} font-semibold`}>
                      R$ {Number(s.price).toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {errors.serviceId && <p className="text-red-500 text-xs mt-2">{errors.serviceId.message}</p>}
          </section>

          {/* Profissional */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-600 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Profissional</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {professionals.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setValue('professionalId', p.id); setValue('startTime', ''); }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-150 ${
                    professionalId === p.id
                      ? 'border-slate-900 dark:border-slate-500 bg-slate-900 dark:bg-slate-700 text-white shadow-md'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                  }`}
                >
                  {avatarSrc(p.avatar) ? (
                    <img
                      src={avatarSrc(p.avatar)!}
                      alt={p.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      professionalId === p.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left min-w-0">
                    <p className={`font-semibold text-sm truncate ${professionalId === p.id ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {p.name}
                    </p>
                    <p className={`text-xs ${professionalId === p.id ? 'text-slate-300' : 'text-gray-400 dark:text-gray-500'}`}>
                      Profissional
                    </p>
                  </div>
                  {professionalId === p.id && <CheckCircle2 size={16} className="text-white ml-auto shrink-0" />}
                </button>
              ))}
            </div>
            {errors.professionalId && <p className="text-red-500 text-xs mt-2">{errors.professionalId.message}</p>}
          </section>

          {/* Data */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-600 text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Data</h2>
              {(!serviceId || !professionalId) && (
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">Selecione serviço e profissional primeiro</span>
              )}
            </div>
            <MonthCalendar
              value={date}
              availableDates={availableDates}
              loading={loadingDates}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onSelect={(d) => { setValue('date', d); setValue('startTime', ''); setSlots([]); }}
            />
            {errors.date && <p className="text-red-500 text-xs mt-2">{errors.date.message}</p>}
          </section>

          {/* Horários */}
          {serviceId && professionalId && date && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-600 text-white flex items-center justify-center text-xs font-bold shrink-0">4</div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Horário</h2>
                {startTime && (
                  <span className="ml-auto text-xs font-semibold bg-slate-900 dark:bg-slate-700 text-white px-3 py-1 rounded-full">
                    {startTime}
                  </span>
                )}
              </div>

              {loadingSlots ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-slate-900 dark:border-slate-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 dark:text-gray-500 text-sm">Buscando horários disponíveis...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center gap-2">
                  <Calendar size={32} className="text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Nenhum horário disponível</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">Tente outra data ou profissional</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                  {morning.length > 0 && (
                    <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Sunrise size={14} className="text-amber-500" />
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Manhã</span>
                        <span className="text-xs text-gray-300 dark:text-gray-600 ml-1">{morning.length} disponíveis</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {morning.map((slot) => (
                          <SlotButton key={slot} slot={slot} selected={startTime === slot} onSelect={() => setValue('startTime', slot)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {afternoon.length > 0 && (
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Sun size={14} className="text-orange-500" />
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tarde</span>
                        <span className="text-xs text-gray-300 dark:text-gray-600 ml-1">{afternoon.length} disponíveis</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {afternoon.map((slot) => (
                          <SlotButton key={slot} slot={slot} selected={startTime === slot} onSelect={() => setValue('startTime', slot)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {errors.startTime && <p className="text-red-500 text-xs mt-2">{errors.startTime.message}</p>}
            </section>
          )}

          {/* Observações */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${readyToConfirm ? 'bg-slate-900 dark:bg-slate-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>5</div>
              <h2 className={`font-semibold ${readyToConfirm ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                Observações <span className="font-normal text-gray-400 dark:text-gray-500 text-sm">(opcional)</span>
              </h2>
            </div>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Alguma preferência ou informação adicional..."
              className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-500 transition-colors resize-none"
            />
          </section>

          {/* Mobile summary */}
          {readyToConfirm && (
            <div className="lg:hidden bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm min-w-0">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400 truncate">{selectedService?.name}</p>
                <p className="text-emerald-600 dark:text-emerald-500 text-xs mt-0.5">{formattedDate} às {startTime}</p>
                {selectedProfessional && (
                  <p className="text-emerald-600 dark:text-emerald-500 text-xs">{selectedProfessional.name}</p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !readyToConfirm}
            className="w-full bg-slate-900 dark:bg-slate-700 text-white rounded-2xl py-4 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar agendamento'}
          </button>
        </form>

        {/* Painel de resumo — desktop only */}
        <div className="hidden lg:block w-72 shrink-0 sticky top-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="bg-slate-900 dark:bg-slate-800 px-5 py-4">
              <p className="text-white font-semibold text-sm">Resumo</p>
              <p className="text-slate-400 text-xs mt-0.5">do seu agendamento</p>
            </div>
            <div className="p-5 space-y-4">
              <SummaryRow
                icon={<Scissors size={14} />}
                label="Serviço"
                value={selectedService?.name}
                sub={selectedService ? `${selectedService.duration_minutes} min · R$ ${Number(selectedService.price).toFixed(2)}` : undefined}
              />
              <SummaryRow
                icon={<UserIcon size={14} />}
                label="Profissional"
                value={selectedProfessional?.name}
              />
              <SummaryRow
                icon={<Calendar size={14} />}
                label="Data"
                value={formattedDate ?? undefined}
              />
              <SummaryRow
                icon={<Clock size={14} />}
                label="Horário"
                value={startTime || undefined}
                highlight={!!startTime}
              />
            </div>

            {readyToConfirm && (
              <div className="px-5 pb-5">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-emerald-700 dark:text-emerald-400 text-xs font-medium">Pronto para confirmar!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function MonthCalendar({
  value,
  availableDates,
  loading,
  month,
  onMonthChange,
  onSelect,
}: {
  value: string;
  availableDates: Set<string>;
  loading: boolean;
  month: string;
  onMonthChange: (m: string) => void;
  onSelect: (date: string) => void;
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonth = todayStr.slice(0, 7);
  const [year, monthNum] = month.split('-').map(Number);
  const firstWeekday = new Date(year, monthNum - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const prevMonth = () => {
    const d = new Date(year, monthNum - 2, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(year, monthNum, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={prevMonth}
          disabled={month <= currentMonth}
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

      <div className="grid grid-cols-7 px-3 pt-3 pb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500">{d}</div>
        ))}
      </div>

      <div className={`grid grid-cols-7 px-3 pb-4 transition-opacity ${loading ? 'opacity-40' : ''}`}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="h-10" />;
          const dateStr = `${month}-${String(day).padStart(2, '0')}`;
          const isPast = dateStr < todayStr;
          const isAvailable = availableDates.has(dateStr);
          const isSelected = value === dateStr;
          const isDisabled = isPast || (!loading && !isAvailable);

          return (
            <div key={i} className="flex flex-col items-center py-0.5">
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => onSelect(dateStr)}
                className={`w-9 h-9 flex items-center justify-center text-sm rounded-full font-medium transition-all duration-150
                  ${isSelected ? 'bg-slate-900 dark:bg-slate-600 text-white' : ''}
                  ${!isSelected && isAvailable && !isPast ? 'text-gray-900 dark:text-gray-100 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer' : ''}
                  ${isDisabled ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : ''}
                `}
              >
                {day}
              </button>
              <span className={`w-1 h-1 rounded-full mt-0.5 ${isAvailable && !isPast && !isSelected ? 'bg-emerald-500' : 'invisible'}`} />
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center pb-4">
          <div className="w-4 h-4 border-2 border-slate-900 dark:border-slate-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function SlotButton({ slot, selected, onSelect }: { slot: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
        selected
          ? 'bg-slate-900 dark:bg-slate-600 text-white shadow-md scale-105'
          : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-600 hover:text-slate-900 dark:hover:text-white border border-gray-200 dark:border-gray-600 hover:border-slate-300 dark:hover:border-slate-500'
      }`}
    >
      {slot}
    </button>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 shrink-0 ${value ? 'text-slate-600 dark:text-slate-400' : 'text-gray-300 dark:text-gray-600'}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{label}</p>
        {value ? (
          <>
            <p className={`text-sm font-semibold truncate ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
          </>
        ) : (
          <p className="text-sm text-gray-300 dark:text-gray-600 italic">Não selecionado</p>
        )}
      </div>
    </div>
  );
}
