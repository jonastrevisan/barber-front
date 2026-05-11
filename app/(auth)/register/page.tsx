'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/AuthContext';

const schema = z
  .object({
    name: z.string().min(2, 'Seu nome é obrigatório'),
    email: z.email('E-mail inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'As senhas não coincidem',
    path: ['confirm'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const { name, email, password } = data;
      const res = await authApi.register({ name, email, password });
      login(res.data);
      toast.success('Conta criada com sucesso!');
      router.push('/agendamentos');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao criar conta');
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Criar conta</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            {...register('name')}
            placeholder="João Silva"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
          )}
        </div>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
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
          {isSubmitting ? 'Criando...' : 'Criar conta'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Já tem conta?{' '}
        <Link href="/login" className="text-slate-700 font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
