'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api/auth';

type Step = 'email' | 'code' | 'password';

const INPUT =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>('email');
  const [email, setEmail]       = useState('');
  const [code, setCode]         = useState('');
  const [token, setToken]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  /* ── Step 1: enviar código ── */
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return toast.error('Informe o e-mail');
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      toast.success('Código enviado para o e-mail');
      setStep('code');
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch {
      toast.error('Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 2: validar código ── */
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return toast.error('Digite os 6 dígitos do código');
    setLoading(true);
    try {
      const res = await authApi.verifyResetCode({ email, code });
      setToken(res.data.token);
      setStep('password');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? 'Código inválido ou expirado');
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 3: nova senha ── */
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error('Mínimo 6 caracteres');
    if (password !== confirm) return toast.error('As senhas não coincidem');
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      toast.success('Senha alterada com sucesso!');
      router.push('/login');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  }

  /* ── Step indicator ── */
  const steps: Step[] = ['email', 'code', 'password'];
  const stepIdx = steps.indexOf(step);

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Recuperar senha</h2>

      {/* Indicador */}
      <div className="flex items-center gap-1 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
              ${i < stepIdx ? 'bg-emerald-500 text-white' : i === stepIdx ? 'bg-slate-900 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {i < stepIdx ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-8 rounded transition-colors ${i < stepIdx ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Etapa 1: e-mail ── */}
      {step === 'email' && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <p className="text-gray-500 text-sm">Informe seu e-mail e enviaremos um código de 6 dígitos.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoFocus
              required
              className={INPUT}
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
            {loading ? 'Enviando...' : 'Enviar código'}
          </button>
          <p className="text-center text-sm text-gray-500">
            <Link href="/login" className="text-slate-700 font-medium hover:underline">Voltar ao login</Link>
          </p>
        </form>
      )}

      {/* ── Etapa 2: código ── */}
      {step === 'code' && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <p className="text-gray-500 text-sm">
            Código enviado para <span className="font-medium text-gray-700">{email}</span>. Válido por 15 minutos.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código de 6 dígitos</label>
            <input
              ref={codeRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className={`${INPUT} text-center text-2xl tracking-[0.5em] font-mono`}
            />
          </div>
          <button type="submit" disabled={loading || code.length !== 6}
            className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
            {loading ? 'Validando...' : 'Validar código'}
          </button>
          <button type="button" onClick={() => { setCode(''); setStep('email'); }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Reenviar código
          </button>
        </form>
      )}

      {/* ── Etapa 3: nova senha ── */}
      {step === 'password' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-gray-500 text-sm">Código verificado. Defina sua nova senha.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                autoFocus
                required
                className={`${INPUT} pr-10`}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••"
              required
              className={INPUT}
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
            {loading ? 'Salvando...' : 'Alterar senha'}
          </button>
        </form>
      )}
    </>
  );
}
