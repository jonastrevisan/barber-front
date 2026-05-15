"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { tenantsApi, Tenant, CreateTenantPayload } from "@/lib/api/tenants";
import { useAuth } from "@/lib/auth/AuthContext";
import { maskBrazilPhoneInput, phoneDigitsOnly } from "@/lib/utils";

interface TenantForm {
  name: string;
  slug: string;
  address: string;
  phone: string;
}

const empty: TenantForm = { name: "", slug: "", address: "", phone: "" };

const inputClass =
  "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}


export default function TenantsPage() {
  const { isSuperAdmin, isLoading } = useAuth();
  const router = useRouter();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState<TenantForm>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) router.replace("/dashboard");
  }, [isLoading, isSuperAdmin, router]);

  const load = async () => {
    try {
      const res = await tenantsApi.list();
      setTenants(res.data);
    } catch {
      toast.error("Erro ao carregar tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      tenantsApi.list()
        .then((res) => setTenants(res.data))
        .catch(() => toast.error("Erro ao carregar tenants"))
        .finally(() => setLoading(false));
    }
  }, [isSuperAdmin]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setShowForm(true);
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setForm({
      name: t.name,
      slug: t.slug,
      address: t.address ?? "",
      phone: t.phone ? maskBrazilPhoneInput(t.phone) : "",
    });
    setShowForm(true);
  };

  const handleNameChange = (value: string) => {
    setForm((f) => ({
      ...f,
      name: value,
      slug: editing ? f.slug : slugify(value),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    if (!form.slug.trim()) return toast.error("Slug obrigatório");
    setSaving(true);
    try {
      const payload: CreateTenantPayload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        address: form.address.trim() || undefined,
        phone: phoneDigitsOnly(form.phone) || undefined,
      };
      if (editing) {
        await tenantsApi.update(editing.id, payload);
        toast.success("Tenant atualizado");
      } else {
        await tenantsApi.create(payload);
        toast.success("Tenant criado");
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Erro ao salvar",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (t: Tenant) => {
    try {
      await tenantsApi.toggleActive(t.id);
      toast.success(t.is_active ? "Tenant desativado" : "Tenant ativado");
      load();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (
      !confirm(`Remover o tenant "${name}"? Esta ação não pode ser desfeita.`)
    )
      return;
    try {
      await tenantsApi.remove(id);
      toast.success("Tenant removido");
      load();
    } catch {
      toast.error("Erro ao remover tenant");
    }
  };

  if (isLoading || !isSuperAdmin) return null;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tenants
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {tenants.length} tenant{tenants.length !== 1 ? "s" : ""} cadastrado
            {tenants.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo tenant</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editing ? "Editar tenant" : "Novo tenant"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Barbearia do João"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug *
                </label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Endereço
                </label>
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Rua das Flores, 123 — São Paulo"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      phone: maskBrazilPhoneInput(e.target.value),
                    }))
                  }
                  placeholder="(00) 00000-0000"
                  className={inputClass}
                />
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
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          Carregando...
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">
            Nenhum tenant cadastrado ainda.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 text-slate-700 dark:text-slate-400 font-medium text-sm hover:underline"
          >
            Criar primeiro tenant
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Nome
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">
                    Slug
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">
                    Endereço
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {tenants.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 shrink-0">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {t.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 hidden sm:table-cell font-mono text-xs">
                      {t.slug}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {t.address ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
                          t.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {t.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(t)}
                          className="text-gray-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors p-1"
                          title={t.is_active ? "Desativar" : "Ativar"}
                        >
                          {t.is_active ? (
                            <ToggleRight size={18} />
                          ) : (
                            <ToggleLeft size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(t)}
                          className="text-gray-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors p-1"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1"
                          title="Remover"
                        >
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
