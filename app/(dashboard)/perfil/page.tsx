'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Sun, Moon, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { usersApi } from '@/lib/api/users';
import { avatarSrc, maskBrazilPhoneInput } from '@/lib/utils';

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  professional: 'Profissional',
  client: 'Cliente',
};

export default function PerfilPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    usersApi.me().then((r) => {
      if (r.data.phone) setPhone(maskBrazilPhoneInput(r.data.phone));
    }).catch(() => {});
  }, []);
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 2 MB');
      return;
    }
    try {
      const res = await usersApi.uploadAvatar(file);
      setAvatar(res.data.avatar ?? null);
      updateUser({ avatar: res.data.avatar });
      toast.success('Foto atualizada');
    } catch {
      toast.error('Erro ao enviar foto');
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) return toast.error('Nome obrigatório');
    setSavingProfile(true);
    try {
      const res = await usersApi.updateMe({ name, phone: phone || undefined });
      updateUser({ name: res.data.name });
      toast.success('Perfil atualizado');
    } catch {
      toast.error('Erro ao salvar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) return toast.error('Informe a senha atual');
    if (newPassword.length < 6) return toast.error('Nova senha deve ter ao menos 6 caracteres');
    if (newPassword !== confirmPassword) return toast.error('Senhas não coincidem');
    setSavingPassword(true);
    try {
      await usersApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success('Senha alterada com sucesso');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erro ao alterar senha',
      );
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Perfil</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gerencie suas informações pessoais</p>
      </div>

      {/* ── Seção: Informações ── */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Informações pessoais</h2>

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center group relative"
            >
              {avatar
                ? <img src={avatarSrc(avatar)!} alt={user.name} className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-slate-600 dark:text-slate-300">{user.name.charAt(0).toUpperCase()}</span>
              }
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                <Camera size={20} className="text-white" />
              </div>
            </button>
            {avatar && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await usersApi.updateMe({ avatar: null });
                    setAvatar(null);
                    updateUser({ avatar: null });
                  } catch {
                    toast.error('Erro ao remover foto');
                  }
                }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                title="Remover foto"
              >
                ×
              </button>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:underline"
            >
              Alterar foto
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">JPG, PNG ou GIF · máx. 2 MB</p>
            <span className="inline-block mt-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
            <input value={user.email} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(maskBrazilPhoneInput(e.target.value))}
              placeholder="(00) 00000-0000"
              className={inputClass}
            />
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="mt-5 flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
        >
          <Check size={15} />
          {savingProfile ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </section>

      {/* ── Seção: Segurança ── */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Segurança</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha atual</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••"
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova senha</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mín. 6 caracteres"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar senha</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={savingPassword}
          className="mt-5 flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
        >
          <Check size={15} />
          {savingPassword ? 'Alterando...' : 'Alterar senha'}
        </button>
      </section>

      {/* ── Seção: Aparência ── */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Aparência</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Escolha entre o tema claro ou escuro</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-150 ${
              theme === 'light'
                ? 'border-slate-900 bg-slate-50 dark:bg-slate-900'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Sun size={22} className="text-amber-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Claro</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Fundo branco</p>
            </div>
            {theme === 'light' && (
              <span className="text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-2.5 py-0.5 rounded-full">
                Ativo
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-150 ${
              theme === 'dark'
                ? 'border-slate-400 bg-slate-800'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 dark:bg-slate-600 flex items-center justify-center">
              <Moon size={22} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Escuro</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Fundo escuro</p>
            </div>
            {theme === 'dark' && (
              <span className="text-xs font-medium bg-white text-slate-900 px-2.5 py-0.5 rounded-full">
                Ativo
              </span>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
