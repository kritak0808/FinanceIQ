'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/useAuthStore';
import { apiFetch } from '../../utils/api';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  MessageSquareCode,
  TrendingUp,
  Target,
  Briefcase,
  ShieldAlert,
  UserCog,
  LogOut,
  Bell,
  Menu,
  X,
  Wallet,
  Sparkles
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, setUser, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsCount, setAlertsCount] = useState(0);

  // 1. Auth check and Profile loading
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Load fresh user data
    apiFetch<any>('/auth/me')
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        logout();
        router.push('/login');
      });
  }, [isAuthenticated, router, setUser, logout]);

  // 2. Fetch notifications/anomalies count
  useEffect(() => {
    if (isAuthenticated) {
      apiFetch<any[]>('/admin/fraud-alerts?status=pending')
        .then((data) => {
          setAlertsCount(data.length);
        })
        .catch(() => {});
    }
  }, [isAuthenticated, pathname]);

  if (!isAuthenticated || !user) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-display text-sm tracking-wide">Syncing FinSense intelligence...</p>
      </div>
    );
  }

  // Sidebar link items
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: Receipt },
    { name: 'Budgets', path: '/budgets', icon: PiggyBank },
    { name: 'AI Coach', path: '/coach', icon: MessageSquareCode },
    { name: 'Forecasting', path: '/forecasting', icon: TrendingUp },
    { name: 'Savings Goals', path: '/goals', icon: Target },
    { name: 'Investments', path: '/investments', icon: Briefcase },
    { name: 'Profile Settings', path: '/profile', icon: UserCog },
  ];

  // If Admin, prepend or append Admin Panel
  if (user.role === 'Admin') {
    menuItems.push({ name: 'Admin Panel', path: '/admin', icon: ShieldAlert });
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const activeAccount = user.accounts?.find(a => a.type === 'checking') || user.accounts?.[0];
  const formattedBalance = activeAccount 
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: user.profile?.currency || 'INR' }).format(parseFloat(activeAccount.balance))
    : '₹0.00';

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden font-sans">
      {/* Background neon blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-900 border-r border-slate-800 shrink-0">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-white leading-none">FinSense AI</h1>
            <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Finance Engine</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-violet-600 text-white font-medium shadow-md shadow-violet-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-sm font-semibold text-violet-400">
              {user.email.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user.profile?.first_name || 'Kritak'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-800 hover:border-rose-900/35 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 text-xs font-medium transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER & DRAWER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-6 backdrop-blur-md shrink-0 z-40">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1 text-slate-400 hover:text-white focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="hidden md:block font-display font-semibold text-lg text-white">
              {menuItems.find((m) => m.path === pathname)?.name || 'FinSense Console'}
            </h2>
          </div>

          {/* Account Balance Widget & Notification bell */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-full">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] text-slate-500 font-semibold uppercase hidden sm:inline">Balance:</span>
              <span className="text-xs font-bold text-white font-mono">{formattedBalance}</span>
            </div>

            {/* Notification Bell */}
            <Link href={user.role === 'Admin' ? '/admin' : '/transactions'} className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              {alertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold border border-slate-900 animate-pulse">
                  {alertsCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* MOBILE MENU DRAWER OVERLAY */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm flex">
            <div className="w-64 bg-slate-900 h-full flex flex-col shadow-2xl relative animate-in slide-in-from-left duration-300">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
                <div className="w-9 h-9 bg-violet-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h1 className="font-display font-bold text-base text-white">FinSense AI</h1>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-violet-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center space-x-3 px-2">
                  <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-xs font-semibold text-violet-400">
                    {user.email.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{user.profile?.first_name || 'Kritak'}</p>
                    <p className="text-[9px] text-slate-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
          </div>
        )}

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950 relative grid-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
