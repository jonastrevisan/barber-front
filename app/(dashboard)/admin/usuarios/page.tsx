'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { usersApi, User } from '@/lib/api/users';

type UserRole = 'professional' | 'client';

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
}

const empty: UserForm = { name: '', email: '', password: '', role: 'professional', phone: '' };

const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  professional: 'Profissional',
  client: 'Cliente',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  professional: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  client: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export default function UsuariosAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await usersApi.list();
      setUsers(res.data);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true); };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role === 'admin' ? 'professional' : (u.role as UserRole),
      phone: u.phone || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Nome obrigatório');
    if (!form.email.trim()) return toast.error('E-mail obrigatório');
    if (!editing && !form.password) return toast.error('Senha obrigatória');
    setSaving(true);
    try {
      if (editing) {
        const payload: Partial<User> & { password?: string } = {
          name: form.name, email: form.email, role: form.role,
          phone: form.phone || undefined,
        };
        if (form.password) payload.password = form.password;
        await usersApi.update(editing.id, payload);
        toast.success('Usuário atualizado');
      } else {
        await usersApi.create({ name: form.name, email: form.email, password: form.password, role: form.role, phone: form.phone || undefined });
        toast.success('Usuário criado');
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}"?`)) return;
    try {
      await usersApi.remove(id);
      toast.success('Usuário removido');
      load();
    } catch {
      toast.error('Erro ao remover usuário');
    }
  };

  const professionals = users.filter((u) => u.role === 'professional');
  const others = users.filter((u) => u.role !== 'professional');

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuários</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {professionals.length} profissional{professionals.length !== 1 ? 'is' : ''} · {others.length} outro{others.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo usuário</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editing ? 'Editar usuário' : 'Novo usuário'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nome completo" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {editing ? 'Nova senha' : 'Senha *'}
                  </label>
                  <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editing ? 'Deixe em branco' : 'Mínimo 6 chars'} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cargo *</label>
                  <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))} className={inputClass}>
                    <option value="professional">Profissional</option>
                    <option value="client">Cliente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" className={inputClass} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-slate-900 dark:bg-slate-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
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
      ) : users.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">Nenhum usuário cadastrado ainda.</p>
          <button onClick={openCreate} className="mt-4 text-slate-700 dark:text-slate-400 font-medium text-sm hover:underline">
            Criar primeiro usuário
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">E-mail</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Telefone</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cargo</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{u.email}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 hidden md:table-cell">{u.phone || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[u.role] ?? ROLE_COLORS.client}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(u)} className="text-gray-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors p-1" title="Editar">
                          <Pencil size={16} />
                        </button>
                        {u.role !== 'admin' && (
                          <button onClick={() => handleDelete(u.id, u.name)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1" title="Remover">
                            <Trash2 size={16} />
                          </button>
                        )}
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
