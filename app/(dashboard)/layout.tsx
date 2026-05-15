"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { avatarSrc } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  Calendar,
  Scissors,
  Users,
  LogOut,
  CalendarClock,
  Menu,
  X,
  Sun,
  Moon,
  UserCircle,
  LayoutDashboard,
  Building2,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size: number }>;
}

interface SidebarContentProps {
  user: { name: string; role: string; avatar?: string | null };
  navItems: NavItem[];
  pathname: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogout: () => void;
  onNavClick: () => void;
}

function SidebarContent({
  user,
  navItems,
  pathname,
  theme,
  onToggleTheme,
  onLogout,
  onNavClick,
}: SidebarContentProps) {
  return (
    <>
      <div className="p-5 border-b border-slate-700">
        <p className="text-sm font-bold text-white mb-3">✂️ ReservaFlex</p>
        <Link
          href="/perfil"
          onClick={onNavClick}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-slate-600 flex items-center justify-center">
            {user.avatar ? (
              <img
                src={avatarSrc(user.avatar)!}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate group-hover:underline">
              {user.name}
            </p>
            <span className="text-xs bg-slate-700 rounded-full px-2 py-0.5 text-slate-300">
              {{
                admin: "Administrador",
                professional: "Profissional",
                client: "Cliente",
                superadmin: "Super Admin",
              }[user.role] ?? user.role}
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              pathname.startsWith(href)
                ? "bg-slate-700 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-1">
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white w-full transition-colors"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white w-full transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAdmin, isProfessional, isSuperAdmin, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agendamentos", label: "Agendamentos", icon: Calendar },
    { href: "/perfil", label: "Perfil", icon: UserCircle },
    ...(isProfessional
      ? [
          {
            href: "/disponibilidade",
            label: "Disponibilidade",
            icon: CalendarClock,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          { href: "/admin/servicos", label: "Serviços", icon: Scissors },
          { href: "/admin/usuarios", label: "Usuários", icon: Users },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          { href: "/superadmin/tenants", label: "Tenants", icon: Building2 },
        ]
      : []),
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const sidebarProps: SidebarContentProps = {
    user,
    navItems,
    pathname,
    theme,
    onToggleTheme: toggle,
    onLogout: handleLogout,
    onNavClick: () => setSidebarOpen(false),
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-slate-900 flex-col">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900 flex flex-col z-50 transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Page content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Menu size={22} />
          </button>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            ✂️ ReservaFlex
          </span>
          <button
            onClick={toggle}
            className="ml-auto p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
