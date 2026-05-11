'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Suspense } from 'react';
import { authApi } from '@/lib/api/auth';

const schema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'As senhas não coincidem',
    path: ['confirm'],
  });

type FormData = z.infer<typeof schema>;

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.resetPassword({ token, password: data.password });
      toast.success('Senha alterada com sucesso!');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Token inválido ou expirado');
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-500">Link inválido.</p>
        <Link href="/forgot-password" className="text-slate-700 font-medium text-sm hover:underline mt-4 block">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Nova senha</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
          <input
            {...register('confirm')}
            type="password"
            placeholder="••••••"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          {errors.confirm && (
            <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Salvando...' : 'Alterar senha'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ResetForm />
    </Suspense>
  );
}
