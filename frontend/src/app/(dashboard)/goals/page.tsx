'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  Target,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  TrendingUp,
  Coins,
  X,
  PlusCircle
} from 'lucide-react';

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currencySymbol = user?.profile?.currency === 'INR' ? '₹' : '₹';

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState(() => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));

  // Contribution inputs
  const [contributionInputs, setContributionInputs] = useState<Record<number, string>>({});

  // 1. Fetch Goals
  const { data: goals = [], isLoading } = useQuery<any[]>({
    queryKey: ['goals'],
    queryFn: () => apiFetch('/goals')
  });

  // 2. Mutations
  const createGoalMutation = useMutation({
    mutationFn: (newGoal: any) => apiFetch('/goals', { method: 'POST', json: newGoal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-health-score'] });
      setShowAddModal(false);
      setName('');
      setTargetAmount('');
      setCurrentAmount('');
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, json }: { id: number; json: any }) => 
      apiFetch(`/goals/${id}`, { method: 'PUT', json }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-health-score'] });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-health-score'] });
    }
  });

  // 3. Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;
    createGoalMutation.mutate({
      name,
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount || '0'),
      target_date: new Date(targetDate).toISOString()
    });
  };

  const handleAddContribution = (goal: any) => {
    const inputVal = contributionInputs[goal.id];
    if (!inputVal || isNaN(parseFloat(inputVal))) return;
    
    const increment = parseFloat(inputVal);
    const newSaved = parseFloat(goal.current_amount) + increment;

    updateGoalMutation.mutate({
      id: goal.id,
      json: { current_amount: newSaved }
    });

    // Clear contribution input
    setContributionInputs(prev => ({ ...prev, [goal.id]: '' }));
  };

  const handleDelete = (id: number) => {
    if (confirm('Delete this savings goal?')) {
      deleteGoalMutation.mutate(id);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Savings Planner</h1>
          <p className="text-slate-400 text-xs md:text-sm">Define milestones, track progression timelines and calculate required monthly deposits.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="flex items-center space-x-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/15 transition self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Target</span>
        </button>
      </div>

      {/* GOAL GRID CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="md:col-span-2 py-16 text-center text-slate-500 text-xs">Loading savings milestones...</div>
        ) : goals.length > 0 ? (
          goals.map((g) => {
            const current = parseFloat(g.current_amount);
            const target = parseFloat(g.target_amount);
            const progress = g.progress_percentage;
            const remaining = Math.max(0, target - current);
            
            // Format dates
            const formattedDate = new Date(g.target_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

            return (
              <div key={g.id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-6 group">
                
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2 bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded-xl shrink-0">
                      <Target className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm text-white">{g.name}</h3>
                      <span className="text-[10px] text-slate-500 font-semibold flex items-center mt-0.5">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Target Date: {formattedDate}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(g.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/5 transition opacity-0 group-hover:opacity-100 duration-200"
                    title="Remove Goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">Pacing Progress</span>
                    <span className="text-violet-400 font-bold">{progress.toFixed(0)}%</span>
                  </div>
                  {/* Outer bar */}
                  <div className="w-full h-2 bg-slate-950 border border-slate-800/80 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Saved: {formatCurrency(current)}</span>
                    <span>Target: {formatCurrency(target)}</span>
                  </div>
                </div>

                {/* Calculations & Quick top up */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/40 border border-slate-800/50 rounded-xl items-center">
                  
                  {/* Monthly savings requirement */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-500 uppercase font-semibold block">Required/Month</span>
                    {remaining > 0 ? (
                      <span className="text-xs font-bold text-white font-mono block">
                        {formatCurrency(parseFloat(g.required_monthly_savings))}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400 flex items-center">
                        <Sparkles className="w-3.5 h-3.5 mr-0.5" /> Achieved!
                      </span>
                    )}
                  </div>

                  {/* Add contributions form */}
                  {remaining > 0 && (
                    <div className="flex items-center space-x-1.5 justify-end">
                      <input 
                        type="number" 
                        placeholder="₹2500" 
                        value={contributionInputs[g.id] || ''}
                        onChange={(e) => setContributionInputs(prev => ({ ...prev, [g.id]: e.target.value }))}
                        className="w-16 bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-[10px] text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleAddContribution(g)}
                        disabled={updateGoalMutation.isPending}
                        className="p-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition"
                        title="Add Contribution"
                      >
                        <PlusCircle className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  )}

                </div>
              </div>
            );
          })
        ) : (
          <div className="md:col-span-2 glass-panel p-12 text-center text-slate-500 text-xs rounded-2xl">
            No savings goals set. Tap New Target to define your milestones!
          </div>
        )}
      </div>

      {/* MODAL: NEW SAVINGS TARGET */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAddModal(false)} 
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 border-b border-slate-800 bg-slate-900/20">
              <h2 className="font-display font-bold text-base text-white">Create Savings Target</h2>
              <p className="text-slate-400 text-xs">Establish savings milestones with timelines.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Goal Name */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Goal Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. MacBook Air, Emergency Fund" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Target Amount */}
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Target Amount ({currencySymbol})</label>
                  <input 
                    type="number" 
                    placeholder="95000" 
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
                  />
                </div>
                {/* Initial saved */}
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Already Saved</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Target Date */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Target Date</label>
                <input 
                  type="date" 
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800/80">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createGoalMutation.isPending}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/10 transition flex items-center space-x-1.5"
                >
                  {createGoalMutation.isPending ? 'Saving...' : 'Set Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
