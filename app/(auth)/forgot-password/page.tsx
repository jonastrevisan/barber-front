'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api/auth';

const schema = z.object({
  email: z.email('E-mail inválido'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.forgotPassword(data);
      setSent(true);
    } catch {
      toast.error('Erro ao processar solicitação');
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h2>
        <p className="text-gray-500 text-sm">
          Se o e-mail existir no sistema, você receberá as instruções de recuperação em breve.
        </p>
        <Link
          href="/login"
          className="inline-block mt-6 text-slate-700 font-medium text-sm hover:underline"
        >
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Recuperar senha</h2>
      <p className="text-gray-500 text-sm mb-6">
        Informe seu e-mail e enviaremos as instruções de recuperação.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input
            {...register('email')}
            type="email"
            placeholder="voce@email.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar instruções'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        <Link href="/login" className="text-slate-700 font-medium hover:underline">
          Voltar ao login
        </Link>
      </p>
    </>
  );
}
