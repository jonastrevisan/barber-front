export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">✂️ Barber App</h1>
          <p className="text-slate-400 mt-1">Sistema de agendamentos</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
