'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  UserCog,
  Sparkles,
  Lock,
  CheckCircle2,
  Wallet,
  Settings,
  X
} from 'lucide-react';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  // Demographic States
  const [firstName, setFirstName] = useState(user?.profile?.first_name || '');
  const [lastName, setLastName] = useState(user?.profile?.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.profile?.phone_number || '');
  const [currency, setCurrency] = useState(user?.profile?.currency || 'INR');
  const [monthlyIncome, setMonthlyIncome] = useState(user?.profile?.monthly_income?.toString() || '75000');
  const [savingsTarget, setSavingsTarget] = useState(user?.profile?.savings_target?.toString() || '15000');

  // Password reset States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Save profile success state
  const [profileSuccess, setProfileSuccess] = useState(false);

  // 1. Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (profile: any) => apiFetch('/auth/me/profile', { method: 'PUT', json: profile }),
    onSuccess: (updatedUser: any) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['dashboard-health-score'] });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (pwdData: any) => apiFetch('/auth/reset-password', { method: 'POST', json: pwdData }),
    onSuccess: () => {
      setPasswordSuccess(true);
      setPasswordError('');
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    },
    onError: (err: any) => {
      setPasswordError(err.detail || 'Failed to update password');
      setPasswordSuccess(false);
    }
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      currency,
      monthly_income: parseFloat(monthlyIncome),
      savings_target: parseFloat(savingsTarget)
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;
    changePasswordMutation.mutate({
      old_password: oldPassword,
      new_password: newPassword
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Profile & Security</h1>
        <p className="text-slate-400 text-xs md:text-sm">Manage your demographic details, monthly income indices, and accounts security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* PROFILE SETTINGS FORM (COL 2/3) */}
        <div className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-5">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <UserCog className="w-5 h-5 text-violet-400" />
            <h2 className="font-display font-bold text-sm text-white">Demographics & Financial Settings</h2>
          </div>

          {profileSuccess && (
            <div className="bg-emerald-500/5 border border-emerald-500/15 p-3 rounded-xl flex items-center space-x-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Demographic configurations saved successfully.</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs font-semibold">
            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase">First Name</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
                />
              </div>
              {/* Last Name */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Last Name</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Phone Number</label>
                <input 
                  type="text" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
                />
              </div>
              {/* Currency */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Default Currency</label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-4">
              {/* Income */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase flex items-center">
                  <Wallet className="w-3.5 h-3.5 text-slate-500 mr-1" />
                  <span>Monthly Net Income</span>
                </label>
                <input 
                  type="number" 
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
                />
              </div>
              {/* Savings target */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase flex items-center">
                  <Settings className="w-3.5 h-3.5 text-slate-500 mr-1" />
                  <span>Monthly Savings Goal</span>
                </label>
                <input 
                  type="number" 
                  value={savingsTarget}
                  onChange={(e) => setSavingsTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/10 transition"
              >
                {updateProfileMutation.isPending ? 'Saving Settings...' : 'Save Demographics'}
              </button>
            </div>
          </form>
        </div>

        {/* SECURITY & ACCOUNT ACTIONS (COL 1/3) */}
        <div className="glass-panel p-6 rounded-2xl space-y-5 h-fit">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <Lock className="w-5 h-5 text-violet-400" />
            <h2 className="font-display font-bold text-sm text-white">Account Security</h2>
          </div>

          {passwordSuccess && (
            <div className="bg-emerald-500/5 border border-emerald-500/15 p-3 rounded-xl flex items-center space-x-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Password updated.</span>
            </div>
          )}

          {passwordError && (
            <div className="bg-rose-500/5 border border-rose-500/15 p-3 rounded-xl flex items-center space-x-2 text-xs text-rose-400">
              <X className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs font-semibold">
            {/* Old Password */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase">Old Password</label>
              <input 
                type="password" 
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase">New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
              />
            </div>

            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
            >
              <span>{changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
