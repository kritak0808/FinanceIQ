'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/useAuthStore';
import { apiFetch } from '../../utils/api';
import { Sparkles, ArrowRight, ShieldAlert, Key, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Authenticate (OAuth2 Request Format: Form URL Encoded)
      const details: Record<string, string> = {
        username: email,
        password: password,
      };
      
      const formBody = Object.keys(details)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(details[key]))
        .join('&');

      const tokens = await apiFetch<any>('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: formBody
      });

      // Temporary token storage to fetch user profile in next step
      useAuthStore.getState().setTokens(tokens.access_token, tokens.refresh_token);

      // 2. Load User profile details
      const userProfile = await apiFetch<any>('/auth/me');

      // 3. Save into Zustand global state
      login(tokens.access_token, tokens.refresh_token, userProfile);
      
      // Redirect
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.detail || 'Incorrect credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Glow blobs */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 z-10">
        
        {/* LOGO */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white">Welcome to FinSense AI</h1>
            <p className="text-slate-400 text-xs mt-1">Sign in to sync your personal finance intelligence engine.</p>
          </div>
        </div>

        {/* LOGIN CARD */}
        <div className="glass-panel p-8 rounded-3xl space-y-5 border border-slate-800/80 shadow-2xl bg-slate-900/15">
          {error && (
            <div className="bg-rose-500/5 border border-rose-500/15 p-3 rounded-xl flex items-center space-x-2 text-xs text-rose-400">
              <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-semibold">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  placeholder="user@finsense.ai" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/70 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-semibold">Password</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/70 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-1.5 px-4 py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/10 transition mt-6"
            >
              <span>{loading ? 'Entering Sandbox...' : 'Authorize Sandbox'}</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </button>
          </form>

          {/* Quick seeded profiles credentials check */}
          <div className="bg-slate-950/80 border border-slate-850 p-3.5 rounded-xl space-y-1 text-[10px] text-slate-500">
            <span className="font-semibold text-slate-400 block mb-1">Local Sandbox Accounts:</span>
            <div className="flex justify-between">
              <span>Standard User:</span>
              <span className="font-mono text-slate-400">user@finsense.ai / user123</span>
            </div>
            <div className="flex justify-between">
              <span>System Admin:</span>
              <span className="font-mono text-slate-400">admin@finsense.ai / admin123</span>
            </div>
          </div>
        </div>

        {/* Link to Register */}
        <p className="text-center text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold underline">
            Register here
          </Link>
        </p>

      </div>
    </div>
  );
}
