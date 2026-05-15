"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Clock,
  User,
  Lock,
  Calendar,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { appointmentsApi, Appointment, ScheduleBlock } from "@/lib/api/appointments";
import { schedulesApi, type Schedule } from "@/lib/api/schedules";
import { usersApi, User as ApiUser } from "@/lib/api/users";
import { servicesApi, Service } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/AuthContext";
import { SearchableSelect } from "@/components/SearchableSelect";

/* ── Grid constants ─────────────────────────────────────── */
const START_HOUR = 7;
const END_HOUR = 20;
const HOUR_PX = 64;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
);
const TOTAL_PX = (END_HOUR - START_HOUR) * HOUR_PX;

/* ── Labels ─────────────────────────────────────────────── */
const DAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const MONTH_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

/* ── Color palette ──────────────────────────────────────── */
const PALETTE = [
  {
    bg: "bg-orange-100 dark:bg-orange-900/40",
    border: "border-orange-400",
    text: "text-orange-900 dark:text-orange-100",
  },
  {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    border: "border-blue-400",
    text: "text-blue-900 dark:text-blue-100",
  },
  {
    bg: "bg-violet-100 dark:bg-violet-900/40",
    border: "border-violet-400",
    text: "text-violet-900 dark:text-violet-100",
  },
  {
    bg: "bg-pink-100 dark:bg-pink-900/40",
    border: "border-pink-400",
    text: "text-pink-900 dark:text-pink-100",
  },
  {
    bg: "bg-teal-100 dark:bg-teal-900/40",
    border: "border-teal-400",
    text: "text-teal-900 dark:text-teal-100",
  },
  {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    border: "border-amber-400",
    text: "text-amber-900 dark:text-amber-100",
  },
  {
    bg: "bg-rose-100 dark:bg-rose-900/40",
    border: "border-rose-400",
    text: "text-rose-900 dark:text-rose-100",
  },
] as const;

function svcColor(id: number) {
  return PALETTE[id % PALETTE.length];
}

/* ── Date helpers ───────────────────────────────────────── */
function isoToday() {
  return new Date().toISOString().split("T")[0];
}
function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}
function minToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function normTime(t: string) {
  const [h, m] = t.split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Minutos desde meia-noite (ignora segundos na comparação). Aceita "09:00", "09:00:00", ISO com T… */
function clockMinutes(raw: string | undefined | null): number | null {
  if (raw == null || typeof raw !== "string") return null;
  let s = raw.trim();
  if (!s) return null;
  if (s.includes("T")) {
    const tail = s.split("T").pop() ?? s;
    s = tail.split(/[Z+]/)[0] ?? tail;
  }
  if (s.includes(".")) s = s.split(".")[0] ?? s;
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (!parts.length || !Number.isFinite(parts[0])) return null;
  const h = ((parts[0] % 24) + 24) % 24;
  const m = Number.isFinite(parts[1]) ? ((parts[1] % 60) + 60) % 60 : 0;
  return h * 60 + m;
}

function startTimeForApi(minutes: number): string {
  return `${minToTime(minutes)}:00`;
}

/** Usa o mesmo formato do slot da API quando possível. */
function coerceApiStartTime(
  matched: string | undefined,
  minutes: number,
): string {
  if (matched) {
    const s = String(matched).trim();
    if (/^\d{2}:\d{2}:\d{2}/.test(s)) return s.slice(0, 8);
    if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  }
  return startTimeForApi(minutes);
}

/** Dia útil e fora de datas bloqueadas na agenda do profissional. */
function scheduleAllowsDay(schedule: Schedule, dateIso: string): boolean {
  if (schedule.blocked_dates?.includes(dateIso)) return false;
  const wd = new Date(`${dateIso}T12:00:00`).getDay();
  return (schedule.work_days ?? []).includes(wd);
}

/** Início de um slot (ex.: 30 min) dentro do expediente. */
function scheduleAllowsSlotStart(
  schedule: Schedule,
  dateIso: string,
  slotStart: string,
  slotDurationMin = 30,
): boolean {
  if (!scheduleAllowsDay(schedule, dateIso)) return false;
  const wStart = timeToMin(schedule.start_time ?? "00:00");
  const wEnd = timeToMin(schedule.end_time ?? "23:59");
  const s = timeToMin(normTime(slotStart) || slotStart);
  return s >= wStart && s + slotDurationMin <= wEnd;
}
function isEnded(date: string, end: string) {
  return new Date() >= new Date(`${date}T${end}`);
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function addMonths(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00");
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split("T")[0];
}
function weekSunday(iso: string) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}
function fmtDay(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return {
    abbr: DAY_ABBR[d.getDay()],
    day: d.getDate(),
    month: MONTH_SHORT[d.getMonth()],
    year: d.getFullYear(),
  };
}

/* ── Overlap layout ─────────────────────────────────────── */
interface LayoutAppt {
  appt: Appointment;
  left: number;
  width: number;
}
function layoutDay(appts: Appointment[]): LayoutAppt[] {
  if (!appts.length) return [];
  const sorted = [...appts].sort((a, b) =>
    a.start_time.localeCompare(b.start_time),
  );
  const slotEnds: string[] = [];
  const assigned: { appt: Appointment; slot: number }[] = [];
  for (const appt of sorted) {
    let slot = slotEnds.findIndex((e) => e <= appt.start_time);
    if (slot === -1) {
      slot = slotEnds.length;
      slotEnds.push(appt.end_time);
    } else slotEnds[slot] = appt.end_time;
    assigned.push({ appt, slot });
  }
  const cols = slotEnds.length;
  return assigned.map(({ appt, slot }) => ({
    appt,
    left: slot / cols,
    width: 1 / cols,
  }));
}

/* ── Status styles ──────────────────────────────────────── */
const STATUS: Record<string, { label: string; cls: string }> = {
  pending: {
    label: "Pendente",
    cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  confirmed: {
    label: "Confirmado",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  cancelled: {
    label: "Cancelado",
    cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
  completed: {
    label: "Concluído",
    cls: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  },
};

const INPUT =
  "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500";
const LABEL =
  "block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1";

/* ── View type ──────────────────────────────────────────── */
type ViewMode = "day" | "week" | "month";

/* ── Create modal ───────────────────────────────────────── */
interface CreateProps {
  date: string;
  time: string;
  professionals: ApiUser[];
  clients: ApiUser[];
  services: Service[];
  isAdmin: boolean;
  selfId: number;
  selfRole: string;
  onClose(): void;
  onCreated(): void;
  onBlock(): void;
}
function CreateModal({
  date,
  time,
  professionals,
  clients,
  services,
  isAdmin,
  selfId,
  selfRole,
  onClose,
  onCreated,
  onBlock,
}: CreateProps) {
  const [profId, setProfId] = useState(
    selfRole === "professional" ? selfId : (professionals[0]?.id ?? 0),
  );
  const [clientId, setClientId] = useState(
    selfRole === "client" ? selfId : (clients[0]?.id ?? 0),
  );
  const [svcId, setSvcId] = useState(services[0]?.id ?? 0);
  const [d, setD] = useState(date);
  const [t, setT] = useState(time);
  const [notes, setNotes] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [slotRetry, setSlotRetry] = useState(0);
  const [submitAlert, setSubmitAlert] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const professionalOptions = useMemo(
    () => professionals.map((p) => ({ id: p.id, label: p.name })),
    [professionals],
  );

  const clientOptions = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.name, secondary: c.email })),
    [clients],
  );

  const serviceOptions = useMemo(
    () =>
      services.map((s) => ({
        id: s.id,
        label: s.name,
        secondary: [
          `${s.duration_minutes} min · R$ ${Number(s.price).toFixed(2)}`,
          s.description?.trim(),
        ]
          .filter(Boolean)
          .join(" · "),
      })),
    [services],
  );

  useEffect(() => {
    if (clients.length === 0) return;
    if (!clients.some((c) => c.id === clientId)) setClientId(clients[0].id);
  }, [clients, clientId]);

  useEffect(() => {
    if (services.length === 0) return;
    if (!services.some((s) => s.id === svcId)) setSvcId(services[0].id);
  }, [services, svcId]);

  useEffect(() => {
    if (!profId || !svcId || !d) {
      setAvailableSlots([]);
      setSlotsError(false);
      return;
    }
    setLoadingSlots(true);
    setSlotsError(false);
    appointmentsApi
      .availableSlots({ professional_id: profId, service_id: svcId, date: d })
      .then((res) => setAvailableSlots(res.data.slots ?? []))
      .catch(() => {
        setAvailableSlots([]);
        setSlotsError(true);
      })
      .finally(() => setLoadingSlots(false));
  }, [profId, svcId, d, slotRetry]);

  const pickedMin = clockMinutes(t);
  const matchedSlot = useMemo(() => {
    if (pickedMin === null) return undefined;
    return availableSlots.find((s) => clockMinutes(String(s)) === pickedMin);
  }, [t, availableSlots, pickedMin]);

  const slotValid = pickedMin !== null;

  const slotPickOptions = useMemo(() => {
    const seen = new Set<number>();
    const out: { value: string }[] = [];
    for (const s of availableSlots) {
      const cm = clockMinutes(String(s));
      if (cm === null || seen.has(cm)) continue;
      seen.add(cm);
      out.push({ value: minToTime(cm) });
    }
    out.sort((a, b) => a.value.localeCompare(b.value));
    return out;
  }, [availableSlots]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAlert(null);
    if (!svcId || !clientId || !profId)
      return setSubmitAlert("Preencha todos os campos obrigatórios.");
    if (slotsError)
      return setSubmitAlert("Não foi possível confirmar disponibilidade. Tente novamente ou mude a data.");
    if (!slotValid)
      return setSubmitAlert("Este horário já está ocupado ou fora do expediente. Escolha outro horário.");
    setSaving(true);
    appointmentsApi.create({
      professional_id: profId,
      service_id: svcId,
      date: d,
      start_time: coerceApiStartTime(matchedSlot, pickedMin!),
      notes: notes || undefined,
      client_id: clientId,
    })
      .then(() => { toast.success("Agendamento criado"); onCreated(); onClose(); })
      .catch((err: any) => {
        const msg: string = err?.response?.data?.message ?? "Erro ao criar agendamento";
        const isConflict = err?.response?.status === 409 || msg.toLowerCase().includes("ocupado") || msg.toLowerCase().includes("conflict") || msg.toLowerCase().includes("disponível");
        if (isConflict) {
          setSubmitAlert("Este horário já está ocupado. Escolha outro horário.");
        } else {
          onClose();
          toast.error(msg);
        }
        onCreated();
      })
      .finally(() => setSaving(false));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Novo agendamento
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3.5">
          {selfRole !== "professional" && (
            <div>
              <label className={LABEL}>Profissional</label>
              <SearchableSelect
                options={professionalOptions}
                value={profId}
                onChange={setProfId}
                disabled={professionals.length === 0}
                placeholder="Filtrar por nome…"
                emptyMessage="Nenhum profissional encontrado"
                noOptionsMessage="Nenhum profissional cadastrado"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Data</label>
              <input
                type="date"
                value={d}
                onChange={(e) => { setD(e.target.value); setSubmitAlert(null); }}
                required
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Horário</label>
              <datalist id="create-appt-slot-datalist">
                {slotPickOptions.map((o) => (
                  <option key={o.value} value={o.value} />
                ))}
              </datalist>
              <input
                type="time"
                list="create-appt-slot-datalist"
                step={60}
                value={t}
                onChange={(e) => { setT(e.target.value); setSubmitAlert(null); }}
                required
                className={INPUT}
              />
              {loadingSlots && (
                <p className="text-gray-400 text-xs mt-1">
                  Verificando horários livres…
                </p>
              )}
              {slotsError && (
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <p className="text-red-500 text-xs">
                    Erro ao consultar disponibilidade.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSlotRetry((x) => x + 1)}
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 underline"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
              {!loadingSlots &&
                !slotsError &&
                profId > 0 &&
                svcId > 0 &&
                d &&
                availableSlots.length === 0 && (
                  <p className="text-amber-600 dark:text-amber-500 text-xs mt-1">
                    Nenhum horário livre neste dia para esta combinação.
                  </p>
                )}
              {!loadingSlots &&
                !slotsError &&
                availableSlots.length > 0 &&
                pickedMin !== null &&
                !slotValid && (
                  <p className="text-amber-600 dark:text-amber-500 text-xs mt-1">
                    Escolha um horário entre as opções livres do profissional.
                  </p>
                )}
            </div>
          </div>
          {selfRole !== "client" && (
            <div>
              <label className={LABEL}>Cliente</label>
              <SearchableSelect
                options={clientOptions}
                value={clientId}
                onChange={setClientId}
                disabled={clients.length === 0}
                placeholder="Filtrar por nome ou e-mail…"
                emptyMessage="Nenhum cliente encontrado"
                noOptionsMessage="Nenhum cliente cadastrado"
              />
            </div>
          )}
          <div>
            <label className={LABEL}>Serviço</label>
            <SearchableSelect
              options={serviceOptions}
              value={svcId}
              onChange={setSvcId}
              disabled={services.length === 0}
              placeholder="Filtrar por nome ou descrição…"
              emptyMessage="Nenhum serviço encontrado"
              noOptionsMessage="Nenhum serviço cadastrado"
            />
          </div>
          <div>
            <label className={LABEL}>Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Opcional..."
              className={`${INPUT} resize-none`}
            />
          </div>
          {submitAlert && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3.5 py-3">
              <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400 leading-snug">{submitAlert}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={
              saving ||
              (selfRole !== "client" && clients.length === 0) ||
              services.length === 0 ||
              loadingSlots
            }
            className="w-full bg-slate-900 dark:bg-slate-700 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-60"
          >
            {saving ? "Criando..." : "Criar agendamento"}
          </button>
          <button
            type="button"
            onClick={onBlock}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Lock size={14} />
            Bloqueio de horário
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Block detail modal ─────────────────────────────────── */
interface BlockDetailProps {
  block: ScheduleBlock;
  isAdmin: boolean;
  isProfessional: boolean;
  onClose(): void;
  onDeleted(): void;
}
function BlockDetail({ block, isAdmin, isProfessional, onClose, onDeleted }: BlockDetailProps) {
  /* null = initial, "checking" = fetching similar, ScheduleBlock[] = similar found */
  const [similar, setSimilar] = useState<null | "checking" | ScheduleBlock[]>(null);

  const dateObj = new Date(block.date + "T12:00:00");
  const dateFmt = dateObj.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  async function handleDeleteClick() {
    setSimilar("checking");
    try {
      const res = await appointmentsApi.listBlocks({ professional_id: block.professional_id });
      const found = res.data.filter(
        (b) =>
          b.id !== block.id &&
          b.start_time === block.start_time &&
          b.end_time === block.end_time &&
          (b.description ?? "") === (block.description ?? ""),
      );
      if (found.length === 0) {
        /* no similar — delete directly */
        await doDelete([block.id]);
      } else {
        setSimilar(found);
      }
    } catch {
      toast.error("Erro ao verificar bloqueios semelhantes");
      setSimilar(null);
    }
  }

  function doDelete(ids: number[]) {
    onClose();
    const tid = toast.loading(ids.length > 1 ? `Removendo ${ids.length} bloqueios...` : "Removendo bloqueio...");
    const req = ids.length === 1
      ? appointmentsApi.deleteBlock(ids[0])
      : appointmentsApi.deleteBlockBatch(ids);
    req
      .then(() => { toast.success(ids.length > 1 ? `${ids.length} bloqueios removidos` : "Bloqueio removido", { id: tid }); onDeleted(); })
      .catch(() => { toast.error("Erro ao remover bloqueio", { id: tid }); onDeleted(); });
  }

  const similarList = Array.isArray(similar) ? similar : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 rounded-t-2xl border-l-4 border-l-gray-400 dark:border-l-gray-500">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Lock size={14} className="text-gray-500 dark:text-gray-400 shrink-0" />
              <p className="font-semibold text-gray-900 dark:text-white">Bloqueio de horário</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {block.start_time.slice(0, 5)} – {block.end_time.slice(0, 5)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Calendar size={14} className="text-gray-400 shrink-0" />
            <span className="capitalize">{dateFmt}</span>
          </div>
          {block.professional && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <User size={14} className="text-gray-400 shrink-0" />
              <span>{block.professional.name}</span>
              <span className="text-xs text-gray-400">· profissional</span>
            </div>
          )}
          {block.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              "{block.description}"
            </p>
          )}
        </div>

        {(isAdmin || isProfessional) && (
          <div className="px-5 pb-5 space-y-2">
            {/* similar confirmation panel */}
            {Array.isArray(similar) && similarList.length > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3.5 space-y-2.5">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  Encontrados {similarList.length + 1} bloqueios semelhantes. Remover qual?
                </p>
                <button
                  onClick={() => doDelete([block.id])}
                  disabled={false}
                  className="w-full flex items-center justify-center gap-2 border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
                >
                  Remover apenas este
                </button>
                <button
                  onClick={() => doDelete([block.id, ...similarList.map((b) => b.id)])}
                  disabled={false}
                  className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {`Remover todos (${similarList.length + 1})`}
                </button>
                <button
                  onClick={() => setSimilar(null)}
                  disabled={false}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* initial delete button */}
            {similar === null && (
              <button
                onClick={handleDeleteClick}
                disabled={false}
                className="w-full flex items-center justify-center gap-2 border border-red-200 dark:border-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
              >
                <X size={15} /> Remover bloqueio
              </button>
            )}

            {similar === "checking" && (
              <p className="text-xs text-center text-gray-400 py-2">Verificando bloqueios semelhantes...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Block modal ─────────────────────────────────────────── */
interface BlockProps {
  date: string;
  time: string;
  professionals: ApiUser[];
  selfId: number;
  selfRole: string;
  onClose(): void;
  onCreated(): void;
}
function BlockModal({
  date,
  time,
  professionals,
  selfId,
  selfRole,
  onClose,
  onCreated,
}: BlockProps) {
  const professionalOptions = useMemo(
    () => professionals.map((p) => ({ id: p.id, label: p.name })),
    [professionals],
  );

  const [profId, setProfId] = useState(
    selfRole === "professional" ? selfId : (professionals[0]?.id ?? 0),
  );
  const [d, setD] = useState(date);
  const [startTime, setStartTime] = useState(time);
  const [endTime, setEndTime] = useState(() => {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + 60;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  });
  const [description, setDescription] = useState("");

  /* repeat */
  const [repeat, setRepeat] = useState(false);
  const [repeatEvery, setRepeatEvery] = useState(7);
  const [repeatUnit, setRepeatUnit] = useState<"day" | "week">("day");

  const maxRepeatUntil = useMemo(() => {
    if (!d) return "";
    const base = new Date(d + "T12:00:00");
    base.setFullYear(base.getFullYear() + 1);
    return base.toISOString().split("T")[0];
  }, [d]);

  const [repeatUntil, setRepeatUntil] = useState(maxRepeatUntil);

  /* keep repeatUntil within bounds when base date changes */
  useEffect(() => {
    if (!maxRepeatUntil) return;
    if (!repeatUntil || repeatUntil > maxRepeatUntil) setRepeatUntil(maxRepeatUntil);
  }, [maxRepeatUntil]);

  /* compute all dates to create */
  const repeatDates = useMemo(() => {
    if (!repeat || !d || !repeatUntil) return [];
    const stepDays = repeatUnit === "week" ? repeatEvery * 7 : repeatEvery;
    const dates: string[] = [];
    const until = new Date(repeatUntil + "T12:00:00");
    let cur = new Date(d + "T12:00:00");
    cur.setDate(cur.getDate() + stepDays);
    while (cur <= until) {
      dates.push(cur.toISOString().split("T")[0]);
      cur.setDate(cur.getDate() + stepDays);
    }
    return dates;
  }, [repeat, d, repeatEvery, repeatUnit, repeatUntil]);

  const nextDate = repeatDates[0];
  const nextDateFmt = nextDate
    ? new Date(nextDate + "T12:00:00").toLocaleDateString("pt-BR", {
        weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
      })
    : null;

  /* conflict check state: null = not checked, "checking" = loading, string[] = conflicting dates */
  const [conflictDates, setConflictDates] = useState<null | "checking" | string[]>(null);

  function saveBlocks(datesToSave: string[]) {
    onClose();
    const tid = toast.loading(
      datesToSave.length > 1 ? `Criando ${datesToSave.length} bloqueios...` : "Criando bloqueio...",
    );
    const payload = datesToSave.map((date) => ({
      professional_id: profId,
      date,
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      description: description || undefined,
    }));
    const req = datesToSave.length === 1
      ? appointmentsApi.createBlock(payload[0])
      : appointmentsApi.createBlockBatch(payload);
    req
      .then(() => { toast.success(datesToSave.length > 1 ? `${datesToSave.length} bloqueios criados` : "Bloqueio criado", { id: tid }); onCreated(); })
      .catch((err: any) => { toast.error(err?.response?.data?.message ?? "Erro ao criar bloqueio", { id: tid }); onCreated(); });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profId || !d || !startTime || !endTime)
      return toast.error("Preencha todos os campos");
    if (startTime >= endTime)
      return toast.error("Horário de término deve ser após o início");

    const allDates = [d, ...repeatDates];
    setConflictDates("checking");

    try {
      const from = allDates[0];
      const to = allDates[allDates.length - 1];
      const res = await appointmentsApi.list({ from, to });
      const blockStart = timeToMin(`${startTime}:00`);
      const blockEnd = timeToMin(`${endTime}:00`);

      const conflicts = allDates.filter((date) =>
        res.data.some(
          (appt) =>
            appt.date === date &&
            appt.status !== "cancelled" &&
            (appt.professional?.id === profId) &&
            blockStart < timeToMin(appt.end_time) &&
            blockEnd > timeToMin(appt.start_time),
        ),
      );

      if (conflicts.length === 0) {
        saveBlocks(allDates);
      } else {
        setConflictDates(conflicts);
      }
    } catch {
      /* on fetch error, proceed anyway */
      saveBlocks(allDates);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-gray-500 dark:text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Bloqueio de horário
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3.5">
          {selfRole !== "professional" && (
            <div>
              <label className={LABEL}>Profissional</label>
              <SearchableSelect
                options={professionalOptions}
                value={profId}
                onChange={setProfId}
                disabled={professionals.length === 0}
                placeholder="Filtrar por nome…"
                emptyMessage="Nenhum profissional encontrado"
                noOptionsMessage="Nenhum profissional cadastrado"
              />
            </div>
          )}
          <div>
            <label className={LABEL}>Data</label>
            <input
              type="date"
              value={d}
              onChange={(e) => setD(e.target.value)}
              required
              className={INPUT}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Início</label>
              <input
                type="time"
                step={60}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Término</label>
              <input
                type="time"
                step={60}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className={INPUT}
              />
            </div>
          </div>
          <div>
            <label className={LABEL}>Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Ex: Almoço, Reunião..."
              className={`${INPUT} resize-none`}
            />
          </div>

          {/* Repeat toggle */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setRepeat((v) => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-rose-500 dark:text-rose-400">
                <RefreshCw size={14} />
                Repetir Bloqueio de Horário
              </span>
              {/* toggle pill */}
              <div className={`w-9 h-5 rounded-full transition-colors ${repeat ? "bg-rose-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${repeat ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </button>

            {repeat && (
              <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Repetir a cada:</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={repeatEvery}
                    onChange={(e) => setRepeatEvery(Math.max(1, Number(e.target.value)))}
                    className="w-14 text-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white py-1 px-1"
                  />
                  <select
                    value={repeatUnit}
                    onChange={(e) => setRepeatUnit(e.target.value as "day" | "week")}
                    className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white py-1 px-2"
                  >
                    <option value="day">Dia(s)</option>
                    <option value="week">Semana(s)</option>
                  </select>
                </div>

                {nextDateFmt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Próxima repetição: <span className="font-medium">{nextDateFmt}</span>
                  </p>
                )}

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Repetir até a data:</label>
                  <input
                    type="date"
                    value={repeatUntil}
                    min={d}
                    max={maxRepeatUntil}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                    required={repeat}
                    className={INPUT}
                  />
                </div>

                {repeatDates.length > 0 && (
                  <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">
                    {repeatDates.length + 1} bloqueios serão criados
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Conflict panel */}
          {conflictDates === "checking" && (
            <p className="text-xs text-center text-gray-400 py-1">Verificando conflitos...</p>
          )}
          {Array.isArray(conflictDates) && conflictDates.length > 0 && (() => {
            const allDates = [d, ...repeatDates];
            const safeDates = allDates.filter((dt) => !conflictDates.includes(dt));
            return (
              <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3.5 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {conflictDates.length === 1
                        ? "1 data tem agendamento neste horário"
                        : `${conflictDates.length} datas têm agendamentos neste horário`}
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">
                      {conflictDates
                        .map((dt) =>
                          new Date(dt + "T12:00:00").toLocaleDateString("pt-BR", {
                            day: "2-digit", month: "2-digit",
                          }),
                        )
                        .join(", ")}
                    </p>
                  </div>
                </div>
                {safeDates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => saveBlocks(safeDates)}
                    className="w-full bg-slate-900 dark:bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Salvar apenas sem conflito ({safeDates.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => saveBlocks(allDates)}
                  className="w-full border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-400 rounded-lg py-2 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                >
                  Salvar todos mesmo assim ({allDates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setConflictDates(null)}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            );
          })()}

          {conflictDates === null && (
            <button
              type="submit"
              disabled={!profId || !d || !startTime || !endTime}
              className="w-full bg-slate-900 dark:bg-slate-700 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-60"
            >
              Salvar bloqueio
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

/* ── WhatsApp reminder ──────────────────────────────────── */
/** Remove substitutos inválidos e normaliza texto vindo da API. */
function waSafeClean(s: string | undefined | null): string {
  return (s ?? "")
    .normalize("NFC")
    .replace(/\uFFFD/g, "")
    .trim();
}

interface WaPrompt {
  phone: string;
  clientName: string;
  serviceName: string;
  servicePrice: number;
  date: string;
  startTime: string;
  endTime: string;
}

function buildWaText(p: WaPrompt): string {
  const dateObj = new Date(p.date + "T12:00:00");
  const label = dateObj.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const dayPretty = waSafeClean(label.charAt(0).toUpperCase() + label.slice(1));
  return [
    `Ol\u00E1, ${waSafeClean(p.clientName)}! \u{1F44B}`,
    ``,
    `Seu agendamento foi confirmado:`,
    `\u{1F4C5} ${dayPretty}`,
    `\u{23F0} ${p.startTime} at\u00E9 ${p.endTime}`,
    `\u{2702}\u{FE0F} ${waSafeClean(p.serviceName)}`,
    `\u{1F4B0} R$ ${p.servicePrice.toFixed(2)}`,
    ``,
    `Te esperamos! \u{1F60A}`,
  ].join("\n");
}

function openWhatsApp(phone: string, appt: Appointment) {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("55") ? digits : `55${digits}`;
  const d = new Date(appt.date + "T12:00:00");
  const label = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const dayPretty = waSafeClean(label.charAt(0).toUpperCase() + label.slice(1));
  const clientName = waSafeClean(appt.client?.name);
  const serviceName = waSafeClean(appt.service.name);

  const msgRich = [
    `Olá, ${clientName}! \u{1F44B}`,
    ``,
    `Lembrando do seu agendamento:`,
    `\u{1F4C5} ${dayPretty}`,
    `\u{23F0} ${appt.start_time.slice(0, 5)} até ${appt.end_time.slice(0, 5)}`,
    `\u{2702}\u{FE0F} ${serviceName}`,
    `\u{1F4B0} R$ ${Number(appt.service.price).toFixed(2)}`,
    ``,
    `Te esperamos! \u{1F60A}`,
  ].join("\n");

  // URL + URLSearchParams garante UTF-8 (%XX) no query — texto + emojis vão no parâmetro `text`.
  const url = `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(msgRich)}`;
  const opened = window.open(url, "_blank");
  if (!opened) {
    toast.error(
      "Não foi possível abrir o WhatsApp. Permita pop-ups para este site.",
    );
  }
}

/* ── Appointment detail ─────────────────────────────────── */
interface DetailProps {
  appt: Appointment;
  isAdmin: boolean;
  isProfessional: boolean;
  onClose(): void;
  onCancel(id: number): void;
  onComplete(id: number): void;
}
function ApptDetail({
  appt,
  isAdmin,
  isProfessional,
  onClose,
  onCancel,
  onComplete,
}: DetailProps) {
  const color = svcColor(appt.service.id);
  const st = STATUS[appt.status] ?? STATUS.pending;
  const actionable = ["pending", "confirmed"].includes(appt.status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 rounded-t-2xl border-l-4 ${color.border}`}
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {appt.service.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {appt.start_time.slice(0, 5)} – {appt.end_time.slice(0, 5)} ·{" "}
              {appt.service.duration_minutes} min
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-2.5">
          {appt.client && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <User size={14} className="text-gray-400 shrink-0" />
              <span className="font-medium">{appt.client.name}</span>
              <span className="text-xs text-gray-400">· cliente</span>
            </div>
          )}
          {appt.professional && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <User size={14} className="text-gray-400 shrink-0" />
              <span>{appt.professional.name}</span>
              <span className="text-xs text-gray-400">· profissional</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Clock size={14} className="text-gray-400 shrink-0" />
            <span>R$ {Number(appt.service.price).toFixed(2)}</span>
          </div>
          {appt.notes && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              "{appt.notes}"
            </p>
          )}
          <span
            className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${st.cls}`}
          >
            {st.label}
          </span>
        </div>

        {/* WhatsApp reminder */}
        {appt.client?.phone && (
          <div className="px-5 pb-3">
            <button
              onClick={() => openWhatsApp(appt.client!.phone!, appt)}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
                />
              </svg>
              Enviar lembrete via WhatsApp
            </button>
            <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 mt-2 leading-snug">
              Abre o WhatsApp com o lembrete e os ícones já no campo de
              mensagem.
            </p>
          </div>
        )}

        {actionable && (
          <div className="px-5 pb-5 flex gap-2">
            {(isAdmin || isProfessional) && (
              <button
                onClick={() => {
                  onComplete(appt.id);
                  onClose();
                }}
                disabled={!isEnded(appt.date, appt.end_time)}
                title={
                  isEnded(appt.date, appt.end_time) ? "" : "Aguarde o término"
                }
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check size={15} /> Concluir
              </button>
            )}
            <button
              onClick={() => {
                onCancel(appt.id);
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 border border-red-200 dark:border-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              <X size={15} /> Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Confirm dialog ─────────────────────────────────────── */
interface ConfirmDialogProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm(): void;
  onCancel(): void;
}
function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xs border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center px-6 pt-7 pb-5 text-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
              isDanger
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-amber-100 dark:bg-amber-900/30"
            }`}
          >
            <AlertTriangle
              size={22}
              className={isDanger ? "text-red-500" : "text-amber-500"}
            />
          </div>
          <p className="font-semibold text-gray-900 dark:text-white text-base leading-snug">
            {title}
          </p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-snug">
              {description}
            </p>
          )}
        </div>
        <div className="flex border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-r border-gray-100 dark:border-gray-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              isDanger
                ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────── */
export default function AgendamentosPage() {
  const { isAdmin, isProfessional, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [professionals, setProfessionals] = useState<ApiUser[]>([]);
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filterProfId, setFilterProfId] = useState<number | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(isoToday);
  const [createSlot, setCreateSlot] = useState<{
    date: string;
    time: string;
  } | null>(null);
  const [blockSlot, setBlockSlot] = useState<{
    date: string;
    time: string;
  } | null>(null);
  const [detailBlock, setDetailBlock] = useState<ScheduleBlock | null>(null);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<Omit<ConfirmDialogProps, "onCancel"> | null>(null);
  const [nowPx, setNowPx] = useState(0);

  const today = isoToday();
  const canCreate = true;
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Scroll to current time on mount (day/week views) */
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
    scrollRef.current.scrollTop = Math.max(0, (min / 60) * HOUR_PX - 160);
  }, [view]);

  /* Visible date range — covers all cells shown in any view, including adjacent-month padding */
  const fetchRange = useMemo((): string => {
    if (view === "day") return `${currentDate}:${currentDate}`;
    if (view === "week") {
      const ws = weekSunday(currentDate);
      return `${ws}:${addDays(ws, 6)}`;
    }
    // month view: first and last visible grid cell (may include prev/next month padding)
    const d = new Date(currentDate + "T12:00:00");
    const year = d.getFullYear(), m = d.getMonth();
    const firstWd = new Date(year, m, 1).getDay();
    const daysInM = new Date(year, m + 1, 0).getDate();
    const prevDays = new Date(year, m, 0).getDate();
    const firstIso = firstWd > 0
      ? new Date(year, m - 1, prevDays - firstWd + 1).toISOString().split("T")[0]
      : `${year}-${String(m + 1).padStart(2, "0")}-01`;
    let totalCells = firstWd + daysInM;
    while (totalCells % 7 !== 0 || totalCells < 35) totalCells++;
    const trailingDays = totalCells - firstWd - daysInM;
    const lastIso = trailingDays > 0
      ? new Date(year, m + 1, trailingDays).toISOString().split("T")[0]
      : `${year}-${String(m + 1).padStart(2, "0")}-${String(daysInM).padStart(2, "0")}`;
    return `${firstIso}:${lastIso}`;
  }, [view, currentDate]);

  const fetchKey = `${fetchRange}:${rev}`;
  const loading = loadedKey !== fetchKey;

  /* Fetch appointments */
  useEffect(() => {
    const [from, to] = fetchRange.split(":");
    const key = `${fetchRange}:${rev}`;
    const req =
      isAdmin || isProfessional
        ? appointmentsApi.list({ from, to })
        : appointmentsApi.mine({ from, to });
    req
      .then((r) => { setAppointments(r.data); setLoadedKey(key); })
      .catch(() => { toast.error("Erro ao carregar agendamentos"); setLoadedKey(key); });
  }, [isAdmin, isProfessional, fetchRange, rev]);

  /* Fetch schedule blocks (admin/professional only) */
  useEffect(() => {
    if (!isAdmin && !isProfessional) return;
    const [from, to] = fetchRange.split(":");
    appointmentsApi.listBlocks({ from, to })
      .then((r) => setBlocks(r.data))
      .catch(() => {});
  }, [isAdmin, isProfessional, fetchRange, rev]);

  /* Supporting data for create modal */
  useEffect(() => {
    servicesApi
      .list()
      .then((r) => setServices(r.data))
      .catch(() => {});
    usersApi
      .professionals()
      .then((r) => setProfessionals(r.data))
      .catch(() => {});
    if (isAdmin || isProfessional) {
      usersApi
        .list()
        .then((r) => setAllUsers(r.data))
        .catch(() => {});
    }
  }, [isAdmin, isProfessional]);

  /* Current time indicator */
  useEffect(() => {
    const compute = () => {
      const now = new Date();
      setNowPx(
        ((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / 60) *
          HOUR_PX,
      );
    };
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, []);

  const clients = useMemo(
    () => allUsers.filter((u) => u.role === "client"),
    [allUsers],
  );

  const scheduleProfId = isProfessional ? (user?.id ?? null) : filterProfId;

  const [profScheduleEntry, setProfScheduleEntry] = useState<{ id: number; schedule: Schedule } | null>(null);
  const profSchedule = profScheduleEntry?.id === scheduleProfId ? profScheduleEntry.schedule : null;
  useEffect(() => {
    if (!canCreate || !scheduleProfId) return;
    let cancelled = false;
    schedulesApi
      .get(String(scheduleProfId))
      .then((r) => {
        if (!cancelled) setProfScheduleEntry({ id: scheduleProfId, schedule: r.data });
      })
      .catch(() => {
        if (!cancelled) setProfScheduleEntry(null);
      });
    return () => {
      cancelled = true;
    };
  }, [canCreate, scheduleProfId]);

  const filtered = useMemo(() => {
    if (!filterProfId) return appointments;
    return appointments.filter((a) => a.professional?.id === filterProfId);
  }, [appointments, filterProfId]);

  const byDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of filtered) (map[a.date] ??= []).push(a);
    return map;
  }, [filtered]);

  const filteredBlocks = useMemo(() => {
    if (!filterProfId) return blocks;
    return blocks.filter((b) => b.professional_id === filterProfId);
  }, [blocks, filterProfId]);

  const blocksByDate = useMemo(() => {
    const map: Record<string, ScheduleBlock[]> = {};
    for (const b of filteredBlocks) (map[b.date] ??= []).push(b);
    return map;
  }, [filteredBlocks]);

  const tryOpenCreateSlot = useCallback(
    (dateStr: string, slotTime: string) => {
      if (
        scheduleProfId &&
        profSchedule &&
        !scheduleAllowsSlotStart(profSchedule, dateStr, slotTime, 30)
      ) {
        toast.error(
          "Este horário está fora da disponibilidade ou em dia bloqueado do profissional.",
        );
        return;
      }

      // Se o horário clicado cair dentro de um agendamento existente, avança para o fim dele
      const clickedMin = timeToMin(slotTime);
      const occupied = (byDate[dateStr] ?? []).filter(
        (a) => a.status !== "cancelled",
      );
      let adjustedTime = slotTime;
      for (const appt of occupied) {
        const apptStart = timeToMin(appt.start_time);
        const apptEnd = timeToMin(appt.end_time);
        if (clickedMin >= apptStart && clickedMin < apptEnd) {
          adjustedTime = minToTime(apptEnd);
          break;
        }
      }

      setCreateSlot({ date: dateStr, time: adjustedTime });
    },
    [scheduleProfId, profSchedule, byDate],
  );

  const tryOpenFromMonth = useCallback(
    (iso: string) => {
      if (
        scheduleProfId &&
        profSchedule &&
        !scheduleAllowsDay(profSchedule, iso)
      ) {
        toast.error(
          "Dia bloqueado ou fora dos dias de trabalho deste profissional.",
        );
        return;
      }
      setCreateSlot({ date: iso, time: "09:00" });
    },
    [scheduleProfId, profSchedule],
  );

  const tryOpenDefaultAgendar = useCallback(() => {
    if (
      scheduleProfId &&
      profSchedule &&
      !scheduleAllowsSlotStart(profSchedule, currentDate, "09:00", 30)
    ) {
      toast.error(
        "Este dia/horário não está disponível na agenda do profissional.",
      );
      return;
    }
    setCreateSlot({ date: currentDate, time: "09:00" });
  }, [scheduleProfId, profSchedule, currentDate]);

  /* Days shown in time-grid views */
  const viewDays = useMemo(() => {
    if (view === "day") return [currentDate];
    const ws = weekSunday(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [view, currentDate]);

  /* Navigation */
  const prevPeriod = () => {
    if (view === "day") setCurrentDate((d) => addDays(d, -1));
    else if (view === "week") setCurrentDate((d) => addDays(weekSunday(d), -7));
    else setCurrentDate((d) => addMonths(d, -1));
  };
  const nextPeriod = () => {
    if (view === "day") setCurrentDate((d) => addDays(d, 1));
    else if (view === "week") setCurrentDate((d) => addDays(weekSunday(d), 7));
    else setCurrentDate((d) => addMonths(d, 1));
  };
  const goToday = () => setCurrentDate(isoToday());

  /* Range label */
  const rangeLabel = useMemo(() => {
    if (view === "day") {
      const { abbr, day, month, year } = fmtDay(currentDate);
      return `${abbr}, ${day} de ${month} ${year}`;
    }
    if (view === "week") {
      const s = fmtDay(viewDays[0]),
        e = fmtDay(viewDays[6]);
      return s.month === e.month
        ? `${s.day}–${e.day} de ${s.month} ${s.year}`
        : `${s.day} ${s.month} – ${e.day} ${e.month} ${e.year}`;
    }
    const d = new Date(currentDate + "T12:00:00");
    return `${MONTH_NAMES[d.getMonth()]}/${d.getFullYear()}`;
  }, [view, currentDate, viewDays]);

  const handleCancel = (id: number) => {
    setConfirmDialog({
      title: "Cancelar agendamento?",
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Cancelar agendamento",
      cancelLabel: "Voltar",
      variant: "danger",
      onConfirm: () => {
        setConfirmDialog(null);
        const tid = toast.loading("Cancelando...");
        appointmentsApi.cancel(id)
          .then(() => toast.success("Agendamento cancelado", { id: tid }))
          .catch(() => { toast.error("Erro ao cancelar", { id: tid }); setRev((v) => v + 1); });
      },
    });
  };
  const handleComplete = (id: number) => {
    setConfirmDialog({
      title: "Marcar como concluído?",
      description: "O agendamento será finalizado.",
      confirmLabel: "Concluir",
      cancelLabel: "Voltar",
      variant: "warning",
      onConfirm: () => {
        setConfirmDialog(null);
        const tid = toast.loading("Concluindo...");
        appointmentsApi.complete(id)
          .then(() => toast.success("Concluído", { id: tid }))
          .catch(() => { toast.error("Erro ao concluir", { id: tid }); setRev((v) => v + 1); });
      },
    });
  };

  /* ── Month grid ── */
  const monthGrid = useMemo(() => {
    if (view !== "month") return null;
    const d = new Date(currentDate + "T12:00:00");
    const year = d.getFullYear(),
      m = d.getMonth();
    const firstWd = new Date(year, m, 1).getDay();
    const daysInM = new Date(year, m + 1, 0).getDate();
    const prevDays = new Date(year, m, 0).getDate();
    const cells: { iso: string; current: boolean }[] = [];
    for (let i = firstWd - 1; i >= 0; i--) {
      const pd = new Date(year, m - 1, prevDays - i);
      cells.push({ iso: pd.toISOString().split("T")[0], current: false });
    }
    for (let dd = 1; dd <= daysInM; dd++) {
      cells.push({
        iso: `${String(year)}-${String(m + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
        current: true,
      });
    }
    let nd = 1;
    while (cells.length % 7 !== 0 || cells.length < 35) {
      const nd_ = new Date(year, m + 1, nd++);
      cells.push({ iso: nd_.toISOString().split("T")[0], current: false });
    }
    return cells;
  }, [view, currentDate]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900">
      {/* ── Top bar ── */}
      <div className="border-b border-gray-200 dark:border-gray-700 shrink-0">
        {/* Row 1: navigation + agendar */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5">
          <h1 className="text-base font-bold text-gray-900 dark:text-white mr-1 hidden sm:block">
            Agendamentos
          </h1>

          <button
            onClick={prevPeriod}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center select-none capitalize flex-1 sm:flex-none sm:min-w-45 truncate">
            {rangeLabel}
          </span>
          <button
            onClick={nextPeriod}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors shrink-0"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={goToday}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            Hoje
          </button>

          <div className="flex-1 hidden sm:block" />

          {loading && (
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
              Carregando...
            </span>
          )}

          {/* View toggle — desktop only */}
          <div className="hidden sm:flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors
                  ${
                    view === v
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>

          {/* Professional filter — desktop only */}
          {isAdmin && professionals.length > 0 && (
            <select
              value={filterProfId ?? ""}
              onChange={(e) =>
                setFilterProfId(e.target.value ? Number(e.target.value) : null)
              }
              className="hidden sm:block border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="">Todos</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={tryOpenDefaultAgendar}
            className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-700 text-white rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shrink-0"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Agendar</span>
          </button>
        </div>

        {/* Row 2: view toggle + professional filter — mobile only */}
        <div className="flex items-center gap-2 px-4 pb-2 sm:hidden">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5 flex-1">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors
                  ${
                    view === v
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
              >
                {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
          {isAdmin && professionals.length > 0 && (
            <select
              value={filterProfId ?? ""}
              onChange={(e) =>
                setFilterProfId(e.target.value ? Number(e.target.value) : null)
              }
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 max-w-36"
            >
              <option value="">Todos</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Month view ── */}
      {view === "month" && monthGrid && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 shrink-0">
            {DAY_ABBR.map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 py-2 uppercase tracking-wide"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          <div
            className="grid grid-cols-7 flex-1"
            style={{ gridAutoRows: "1fr" }}
          >
            {monthGrid.map(({ iso, current }, i) => {
              const dd = new Date(iso + "T12:00:00").getDate();
              const isToday = iso === today;
              const appts = (byDate[iso] ?? []).sort((a, b) =>
                a.start_time.localeCompare(b.start_time),
              );
              const blks = (blocksByDate[iso] ?? []).sort((a, b) =>
                a.start_time.localeCompare(b.start_time),
              );

              /* merge appts + blocks sorted by start_time */
              type MonthItem =
                | { kind: "appt"; appt: Appointment }
                | { kind: "block"; blk: ScheduleBlock };
              const items: MonthItem[] = [
                ...appts.map((appt) => ({ kind: "appt" as const, appt, t: appt.start_time })),
                ...blks.map((blk) => ({ kind: "block" as const, blk, t: blk.start_time })),
              ].sort((a, b) => a.t.localeCompare(b.t));

              const MAX = 4;
              const visible = items.slice(0, MAX);
              const extra = items.length - MAX;

              return (
                <div
                  key={i}
                  className={`border-t border-r border-gray-100 dark:border-gray-700/50 p-1.5 min-h-22.5 cursor-pointer group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60
                    ${!current ? "bg-gray-50/60 dark:bg-gray-800/30" : ""}
                    ${isToday ? "bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50/70 dark:hover:bg-blue-900/20" : ""}`}
                  onClick={() => { setCurrentDate(iso); setView("day"); }}
                >
                  <span
                    className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-sm font-medium mb-1 transition-colors
                    ${isToday ? "bg-blue-600 text-white font-bold" : current ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-600"}`}
                  >
                    {dd}
                  </span>

                  {visible.map((item) => {
                    if (item.kind === "appt") {
                      const c = svcColor(item.appt.service.id);
                      return (
                        <div
                          key={`a-${item.appt.id}`}
                          className={`text-[11px] truncate px-1.5 py-0.5 rounded mb-0.5 cursor-pointer
                            ${item.appt.status === "cancelled"
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 line-through"
                              : `${c.bg} ${c.text}`}`}
                          onClick={(e) => { e.stopPropagation(); setDetailAppt(item.appt); }}
                        >
                          {item.appt.start_time.slice(0, 5)}{" "}
                          {item.appt.client?.name ?? item.appt.professional?.name},{" "}
                          {item.appt.service.name}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={`b-${item.blk.id}`}
                        className="text-[11px] truncate px-1.5 py-0.5 rounded mb-0.5 cursor-pointer bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center gap-1"
                        onClick={(e) => { e.stopPropagation(); setDetailBlock(item.blk); }}
                      >
                        <Lock size={9} className="shrink-0" />
                        {item.blk.start_time.slice(0, 5)}{" "}
                        {item.blk.description ?? item.blk.professional?.name ?? "Bloqueado"}
                      </div>
                    );
                  })}
                  {extra > 0 && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 px-1">
                      +{extra} mais
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Day / Week views ── */}
      {view !== "month" && (
        <>
          {/* Day headers */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="w-14 sm:w-16 shrink-0" />
            {viewDays.map((dateStr) => {
              const { abbr, day, month, year } = fmtDay(dateStr);
              const isToday = dateStr === today;
              return (
                <div
                  key={dateStr}
                  className="flex-1 min-w-0 text-center py-2.5 border-l border-gray-100 dark:border-gray-700/50"
                >
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    {year}, {month}
                  </p>
                  <span
                    className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-[15px] font-bold mt-0.5
                    ${isToday ? "bg-blue-600 text-white" : "text-gray-800 dark:text-gray-200"}`}
                  >
                    {day}
                  </span>
                  <p
                    className={`text-[11px] font-medium mt-0.5 ${isToday ? "text-blue-500 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
                  >
                    {abbr}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Scrollable time grid */}
          <div
            className="flex-1 overflow-y-auto overflow-x-auto"
            ref={scrollRef}
          >
            <div
              className="flex min-w-[320px]"
              style={{ height: `${TOTAL_PX}px` }}
            >
              {/* Time labels */}
              <div className="w-14 sm:w-16 shrink-0 relative select-none pointer-events-none">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute right-2 text-[11px] text-gray-400 dark:text-gray-500 leading-none"
                    style={{ top: `${(h - START_HOUR) * HOUR_PX - 7}px` }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {viewDays.map((dateStr) => {
                const isToday = dateStr === today;
                const dayLayout = layoutDay(byDate[dateStr] ?? []);

                return (
                  <div
                    key={dateStr}
                    className={`flex-1 relative border-l border-gray-100 dark:border-gray-700/50 min-w-0
                      ${isToday ? "bg-blue-50/20 dark:bg-blue-900/5" : ""}`}
                  >
                    {/* Hour lines */}
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-700/60 pointer-events-none"
                        style={{ top: `${(h - START_HOUR) * HOUR_PX}px` }}
                      />
                    ))}
                    {/* Half-hour dashed lines */}
                    {HOURS.map((h) => (
                      <div
                        key={`d${h}`}
                        className="absolute inset-x-0 border-t border-dashed border-gray-100 dark:border-gray-700/30 pointer-events-none"
                        style={{
                          top: `${(h - START_HOUR) * HOUR_PX + HOUR_PX / 2}px`,
                        }}
                      />
                    ))}

                    {/* Clickable 30-min slots */}
                    {Array.from(
                      { length: (END_HOUR - START_HOUR) * 2 },
                      (_, i) => {
                        const slotTime = minToTime(START_HOUR * 60 + i * 30);
                        const disabledSlot = Boolean(
                          scheduleProfId &&
                          profSchedule &&
                          !scheduleAllowsSlotStart(
                            profSchedule,
                            dateStr,
                            slotTime,
                            30,
                          ),
                        );
                        return (
                          <div
                            key={i}
                            className={`group absolute inset-x-0 ${disabledSlot ? "cursor-not-allowed opacity-35" : "cursor-pointer"}`}
                            style={{
                              top: `${i * (HOUR_PX / 2)}px`,
                              height: `${HOUR_PX / 2}px`,
                            }}
                            onClick={() => {
                              if (disabledSlot) {
                                toast.error(
                                  "Fora do horário ou dia bloqueado para este profissional.",
                                );
                                return;
                              }
                              tryOpenCreateSlot(dateStr, slotTime);
                            }}
                          >
                            <div
                              className={`hidden group-hover:flex items-center mx-1 mt-1 px-2 rounded border-2 border-dashed text-[11px] font-medium ${
                                disabledSlot
                                  ? "border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/40 text-gray-400"
                                  : "border-rose-300 dark:border-rose-700 bg-rose-50/90 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400"
                              }`}
                              style={{ height: `${HOUR_PX / 2 - 4}px` }}
                            >
                              {slotTime} — Adicionar...
                            </div>
                          </div>
                        );
                      },
                    )}

                    {/* Current time indicator */}
                    {isToday && nowPx >= 0 && nowPx <= TOTAL_PX && (
                      <div
                        className="absolute inset-x-0 flex items-center z-20 pointer-events-none"
                        style={{ top: `${nowPx}px` }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0 shadow" />
                        <div className="flex-1 h-0.5 bg-red-500" />
                      </div>
                    )}

                    {/* Schedule blocks (blocked periods) */}
                    {(blocksByDate[dateStr] ?? []).map((blk) => {
                      const startMin = timeToMin(blk.start_time) - START_HOUR * 60;
                      const endMin = timeToMin(blk.end_time) - START_HOUR * 60;
                      const top = (startMin / 60) * HOUR_PX;
                      const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, HOUR_PX / 2);
                      const compact = height < HOUR_PX * 0.75;
                      return (
                        <div
                          key={`blk-${blk.id}`}
                          style={{ top: `${top + 2}px`, height: `${height - 3}px`, left: "2px", right: "2px" }}
                          className="absolute z-[5] overflow-hidden rounded-md border-l-[3px] border-l-gray-400 dark:border-l-gray-500 px-1.5 py-1 bg-gray-100 dark:bg-gray-700/70 select-none cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setDetailBlock(blk); }}
                        >
                          {compact ? (
                            <p className="text-[11px] font-semibold leading-tight truncate text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Lock size={9} className="shrink-0" />
                              {blk.start_time.slice(0, 5)} · {blk.description ?? blk.professional?.name ?? "Bloqueado"}
                            </p>
                          ) : (
                            <>
                              <p className="text-[11px] font-medium leading-tight opacity-75 text-gray-500 dark:text-gray-400">
                                {blk.start_time.slice(0, 5)} – {blk.end_time.slice(0, 5)}
                              </p>
                              <p className="text-[12px] font-bold leading-tight mt-0.5 truncate text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                <Lock size={10} className="shrink-0" />
                                {blk.professional?.name ?? "Bloqueado"}
                              </p>
                              {blk.description && (
                                <p className="text-[11px] leading-tight opacity-75 truncate text-gray-500 dark:text-gray-400">
                                  {blk.description}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Appointment blocks */}
                    {dayLayout.map(({ appt, left, width }) => {
                      const startMin =
                        timeToMin(appt.start_time) - START_HOUR * 60;
                      const endMin = timeToMin(appt.end_time) - START_HOUR * 60;
                      const top = (startMin / 60) * HOUR_PX;
                      const height = Math.max(
                        ((endMin - startMin) / 60) * HOUR_PX,
                        HOUR_PX / 2,
                      );
                      const color = svcColor(appt.service.id);
                      const compact = height < HOUR_PX * 0.75;

                      return (
                        <div
                          key={appt.id}
                          style={{
                            top: `${top + 2}px`,
                            height: `${height - 3}px`,
                            left: `calc(${left * 100}% + 2px)`,
                            width: `calc(${width * 100}% - 4px)`,
                          }}
                          className={`absolute z-10 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 cursor-pointer select-none transition-opacity hover:opacity-80
                            ${appt.status === "cancelled"
                              ? "bg-gray-100 dark:bg-gray-700/50 border-l-gray-400 dark:border-l-gray-500 text-gray-400 dark:text-gray-500"
                              : `${color.bg} ${color.border} ${color.text}`}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailAppt(appt);
                          }}
                        >
                          {compact ? (
                            <p className={`text-[11px] font-semibold leading-tight truncate ${appt.status === "cancelled" ? "line-through" : ""}`}>
                              {appt.start_time.slice(0, 5)} ·{" "}
                              {appt.client?.name ?? appt.service.name}
                            </p>
                          ) : (
                            <>
                              <p className="text-[11px] font-medium leading-tight opacity-75">
                                {appt.start_time.slice(0, 5)} –{" "}
                                {appt.end_time.slice(0, 5)}
                              </p>
                              <p className={`text-[12px] font-bold leading-tight mt-0.5 truncate ${appt.status === "cancelled" ? "line-through" : ""}`}>
                                {appt.client?.name ?? appt.professional?.name}
                              </p>
                              <p className="text-[11px] leading-tight opacity-75 truncate">
                                {appt.service.name}
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Modals ── */}
      {createSlot && (
        <CreateModal
          date={createSlot.date}
          time={createSlot.time}
          professionals={professionals}
          clients={clients}
          services={services}
          isAdmin={isAdmin}
          selfId={user?.id ?? 0}
          selfRole={user?.role ?? ""}
          onClose={() => setCreateSlot(null)}
          onCreated={() => setRev((v) => v + 1)}
          onBlock={() => {
            const slot = createSlot;
            setCreateSlot(null);
            setBlockSlot(slot);
          }}
        />
      )}
      {blockSlot && (
        <BlockModal
          date={blockSlot.date}
          time={blockSlot.time}
          professionals={professionals}
          selfId={user?.id ?? 0}
          selfRole={user?.role ?? ""}
          onClose={() => setBlockSlot(null)}
          onCreated={() => setRev((v) => v + 1)}
        />
      )}
      {detailAppt && (
        <ApptDetail
          appt={detailAppt}
          isAdmin={isAdmin}
          isProfessional={isProfessional}
          onClose={() => setDetailAppt(null)}
          onCancel={handleCancel}
          onComplete={handleComplete}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          {...confirmDialog}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      {detailBlock && (
        <BlockDetail
          block={detailBlock}
          isAdmin={isAdmin}
          isProfessional={isProfessional}
          onClose={() => setDetailBlock(null)}
          onDeleted={() => setRev((v) => v + 1)}
        />
      )}
    </div>
  );
}
