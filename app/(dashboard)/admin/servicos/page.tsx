'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { servicesApi, Service } from '@/lib/api/services';

function ServiceColorPicker({ value, onChange }: { value: string; onChange(v: string): void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-9 h-9 rounded-lg border-2 border-gray-300 dark:border-gray-600 overflow-hidden shrink-0 hover:border-gray-400 transition-colors"
        style={value ? { backgroundColor: value, borderColor: value } : {}}
        title="Escolher cor"
      >
        {!value && <span className="text-gray-300 text-xl leading-none flex items-center justify-center h-full">+</span>}
      </button>
      <input
        ref={inputRef}
        type="color"
        value={value || '#6366f1'}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
      {value ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">{value}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Remover cor"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <span className="text-sm text-gray-400">Clique no quadrado para escolher</span>
      )}
    </div>
  );
}

interface ServiceForm {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  color: string;
}

const DEFAULT_COLOR = '#6366f1';
const empty: ServiceForm = { name: '', description: '', durationMinutes: 30, price: 0, color: DEFAULT_COLOR };

function toApiPayload(form: ServiceForm) {
  return { name: form.name, description: form.description, duration_minutes: form.durationMinutes, price: form.price, color: form.color || undefined };
}

const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500';

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ServicosAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(empty);
  const [priceDisplay, setPriceDisplay] = useState('0,00');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await servicesApi.list();
      setServices(res.data);
    } catch {
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setPriceDisplay('0,00');
    setShowForm(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    const price = Number(s.price);
    setForm({ name: s.name, description: s.description || '', durationMinutes: s.duration_minutes, price, color: s.color || DEFAULT_COLOR });
    setPriceDisplay(formatBRL(Math.round(price * 100)));
    setShowForm(true);
  };

  const handlePriceChange = (raw: string) => {
    const cents = parseInt(raw.replace(/\D/g, '') || '0', 10);
    setPriceDisplay(formatBRL(cents));
    setForm((f) => ({ ...f, price: cents / 100 }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Nome obrigatório');
    if (form.durationMinutes < 1) return toast.error('Duração inválida');
    if (form.price < 0) return toast.error('Preço inválido');
    setSaving(true);
    try {
      if (editing) {
        await servicesApi.update(editing.id, toApiPayload(form));
        toast.success('Serviço atualizado');
      } else {
        await servicesApi.create(toApiPayload(form));
        toast.success('Serviço criado');
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await servicesApi.toggleActive(id);
      toast.success(isActive ? 'Serviço desativado' : 'Serviço ativado');
      load();
    } catch {
      toast.error('Erro ao alterar serviço');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remover "${name}"?`)) return;
    try {
      await servicesApi.remove(id);
      toast.success('Serviço removido');
      load();
    } catch {
      toast.error('Erro ao remover serviço');
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Serviços</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {services.length} serviço{services.length !== 1 ? 's' : ''} cadastrado{services.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo serviço</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editing ? 'Editar serviço' : 'Novo serviço'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Extensão de cílios"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Descrição do serviço (opcional)"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duração (min) *</label>
                  <input
                    type="number"
                    min={1}
                    value={form.durationMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, durationMinutes: +e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500 pointer-events-none">R$</span>
                    <input
                      inputMode="numeric"
                      value={priceDisplay}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className={`${inputClass} pl-9 text-right`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor no calendário</label>
                <ServiceColorPicker value={form.color} onChange={(v) => setForm((f) => ({ ...f, color: v }))} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-slate-900 dark:bg-slate-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                <Check size={16} />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">Carregando...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">Nenhum serviço cadastrado ainda.</p>
          <button onClick={openCreate} className="mt-4 text-slate-700 dark:text-slate-400 font-medium text-sm hover:underline">
            Criar primeiro serviço
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Descrição</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duração</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Preço</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {services.map((s) => (
                  <tr key={s.id} className={`transition-colors ${s.is_active ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : 'opacity-50 bg-gray-50 dark:bg-gray-900/50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {s.color && (
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>
                        {!s.is_active && (
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">Inativo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate hidden sm:table-cell">{s.description || '—'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{s.duration_minutes} min</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">R$ {Number(s.price).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors p-1" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(s.id, s.is_active)}
                          className={`transition-colors p-1 ${s.is_active ? 'text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400' : 'text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                          title={s.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {s.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                        <button onClick={() => handleDelete(s.id, s.name)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1" title="Remover">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
