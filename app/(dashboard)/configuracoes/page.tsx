"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { MessageSquare, CreditCard, ChevronRight, Info, Check } from "lucide-react";
import { messageTemplatesApi, MessageTemplate, TemplateMeta } from "@/lib/api/message-templates";
import { tenantsApi } from "@/lib/api/tenants";

/* ── Section nav ─────────────────────────────────────────── */
type Section = "mensagens" | "pagamentos";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: "mensagens",
    label: "Mensagens de envio",
    icon: <MessageSquare size={16} />,
    description: "Modelos enviados por WhatsApp",
  },
  {
    id: "pagamentos",
    label: "Formas de pagamento",
    icon: <CreditCard size={16} />,
    description: "Métodos aceitos pelo estabelecimento",
  },
];

/* ── Payment methods ─────────────────────────────────────── */
const PAYMENT_OPTIONS = [
  { id: "pix",           label: "PIX",                  emoji: "⚡" },
  { id: "dinheiro",      label: "Dinheiro",              emoji: "💵" },
  { id: "credito",       label: "Cartão de Crédito",     emoji: "💳" },
  { id: "debito",        label: "Cartão de Débito",      emoji: "💳" },
  { id: "transferencia", label: "Transferência Bancária", emoji: "🏦" },
  { id: "voucher",       label: "Voucher / Vale",         emoji: "🎟️" },
];

function PaymentSection() {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    tenantsApi.me()
      .then((r) => setEnabled(new Set(r.data.payment_methods ?? [])))
      .catch(() => toast.error("Erro ao carregar formas de pagamento"))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      await tenantsApi.updateMe({ payment_methods: [...enabled] });
      toast.success("Formas de pagamento salvas");
      setDirty(false);
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-sm text-gray-400">Carregando…</p></div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
          <CreditCard size={18} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">Formas de pagamento</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Selecione os métodos aceitos pelo estabelecimento</p>
        </div>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="shrink-0 bg-slate-900 dark:bg-slate-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        )}
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PAYMENT_OPTIONS.map((opt) => {
          const on = enabled.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all
                ${on
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
            >
              <span className="text-xl leading-none">{opt.emoji}</span>
              <span className={`flex-1 text-sm font-medium ${on ? "text-emerald-700 dark:text-emerald-300" : "text-gray-700 dark:text-gray-300"}`}>
                {opt.label}
              </span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                ${on ? "border-emerald-500 bg-emerald-500" : "border-gray-300 dark:border-gray-500"}`}>
                {on && <Check size={11} className="text-white" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Message template params ─────────────────────────────── */
const PARAMS = [
  { key: "[nome-cliente]",      label: "Nome do cliente",        description: "Ex: João Silva" },
  { key: "[data-agendamento]",  label: "Data do agendamento",    description: "Ex: 20/05/2025" },
  { key: "[horario]",           label: "Horário",                description: "Ex: 14:30 até 15:00" },
  { key: "[servicos]",          label: "Serviço",                description: "Ex: Corte de cabelo" },
  { key: "[profissional]",      label: "Profissional",           description: "Ex: Ana" },
  { key: "[valor]",             label: "Valor",                  description: "Ex: R$ 50,00" },
];

function TemplateEditor({ template, meta, onSaved }: {
  template: MessageTemplate;
  meta: TemplateMeta;
  onSaved(updated: MessageTemplate): void;
}) {
  const [value, setValue] = useState(template.template);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertParam(param: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    setValue(value.slice(0, start) + param + value.slice(end));
    setDirty(true);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + param.length, start + param.length); }, 0);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await messageTemplatesApi.upsert(template.type, value);
      toast.success("Modelo salvo");
      setDirty(false);
      onSaved(res.data);
    } catch {
      toast.error("Erro ao salvar modelo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
          <MessageSquare size={18} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{meta.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Enviado via WhatsApp ao confirmar agendamento</p>
        </div>
        {dirty && (
          <button onClick={save} disabled={saving}
            className="shrink-0 bg-slate-900 dark:bg-slate-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        )}
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Info size={12} /> Clique em um parâmetro para inserir no modelo
          </p>
          <div className="flex flex-wrap gap-2">
            {PARAMS.map((p) => (
              <button key={p.key} type="button" onClick={() => insertParam(p.key)}
                title={`${p.description} — insere ${p.key}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                <span className="font-mono">{p.key}</span>
                <span className="text-blue-500 dark:text-blue-400 font-normal">· {p.label}</span>
              </button>
            ))}
          </div>
        </div>
        <textarea ref={textareaRef} value={value}
          onChange={(e) => { setValue(e.target.value); setDirty(true); }}
          rows={9} spellCheck={false}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono leading-relaxed"
        />
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Pré-visualização</p>
          <div className="rounded-xl bg-[#e7ffd9] dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
            <div className="inline-block bg-white dark:bg-gray-800 rounded-xl rounded-tl-none shadow-sm px-3.5 py-2.5 max-w-xs">
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed wrap-break-word">
                {value
                  .replace(/\[nome-cliente\]/g, "João Silva")
                  .replace(/\[data-agendamento\]/g, "20/05/2025")
                  .replace(/\[horario\]/g, "14:30 até 15:00")
                  .replace(/\[servicos\]/g, "Corte de cabelo")
                  .replace(/\[profissional\]/g, "Ana")
                  .replace(/\[valor\]/g, "R$ 50,00")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagesSection() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [meta, setMeta] = useState<TemplateMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([messageTemplatesApi.list(), messageTemplatesApi.getMeta()])
      .then(([tRes, mRes]) => {
        setTemplates(tRes.data);
        setMeta(mRes.data);
        if (tRes.data.length > 0) setSelected(tRes.data[0].type);
      })
      .catch(() => toast.error("Erro ao carregar modelos de mensagem"))
      .finally(() => setLoading(false));
  }, []);

  const selectedTemplate = templates.find((t) => t.type === selected);
  const selectedMeta = meta.find((m) => m.type === selected);

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-sm text-gray-400">Carregando…</p></div>;

  return (
    <div className="space-y-4">
      {/* template type tabs (when there's more than one) */}
      {templates.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {templates.map((t) => {
            const m = meta.find((x) => x.type === t.type);
            return (
              <button key={t.type} onClick={() => setSelected(t.type)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors border
                  ${selected === t.type
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }`}>
                <MessageSquare size={14} />
                {m?.label ?? t.type}
              </button>
            );
          })}
        </div>
      )}

      {selectedTemplate && selectedMeta ? (
        <TemplateEditor
          key={selectedTemplate.type}
          template={selectedTemplate}
          meta={selectedMeta}
          onSaved={(updated) => setTemplates((prev) => prev.map((t) => t.type === updated.type ? updated : t))}
        />
      ) : (
        <div className="flex items-center justify-center h-48 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-400">Nenhum modelo disponível</p>
        </div>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function ConfiguracoesPage() {
  const [section, setSection] = useState<Section>("mensagens");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Personalize as configurações do seu estabelecimento.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 items-start">
        {/* sidebar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Menu</p>
          </div>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`w-full flex items-center justify-between gap-2 px-4 py-3.5 text-left text-sm transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0
                ${section === s.id
                  ? "bg-slate-900 dark:bg-slate-700 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
            >
              <span className="flex items-center gap-2.5">
                {s.icon}
                <span>
                  <span className="block font-medium">{s.label}</span>
                  <span className={`block text-[11px] mt-0.5 ${section === s.id ? "text-gray-300" : "text-gray-400 dark:text-gray-500"}`}>
                    {s.description}
                  </span>
                </span>
              </span>
              <ChevronRight size={14} className={section === s.id ? "text-gray-300" : "text-gray-400"} />
            </button>
          ))}
        </div>

        {/* content */}
        <div>
          {section === "mensagens" && <MessagesSection />}
          {section === "pagamentos" && <PaymentSection />}
        </div>
      </div>
    </div>
  );
}
