'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  PiggyBank,
  Plus,
  Trash2,
  Sparkles,
  AlertTriangle,
  Check,
  TrendingDown,
  X
} from 'lucide-react';

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currencySymbol = user?.profile?.currency === 'INR' ? '₹' : '₹';

  // State
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState('Food & Dining');
  const [limitAmount, setLimitAmount] = useState('');

  // 1. Fetch budgets
  const { data: budgets = [], isLoading: budgetsLoading } = useQuery<any[]>({
    queryKey: ['budgets'],
    queryFn: () => apiFetch('/budgets')
  });

  // 2. Fetch AI Recommendations
  const { data: recommendations = [], isLoading: recsLoading } = useQuery<any[]>({
    queryKey: ['budget-recommendations'],
    queryFn: () => apiFetch('/budgets/recommendations')
  });

  // 3. Mutations
  const createBudgetMutation = useMutation({
    mutationFn: (newBudget: any) => apiFetch('/budgets', { method: 'POST', json: newBudget }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-budgets'] });
      setShowAddModal(false);
      setLimitAmount('');
    },
    onError: (err: any) => {
      alert(err.detail || 'Failed to save budget');
    }
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, json }: { id: number; json: any }) => 
      apiFetch(`/budgets/${id}`, { method: 'PUT', json }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-budgets'] });
    }
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/budgets/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-budgets'] });
    }
  });

  // 4. Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!limitAmount) return;
    createBudgetMutation.mutate({
      category,
      limit_amount: parseFloat(limitAmount),
      period: 'monthly'
    });
  };

  const handleApplyRecommendation = (rec: any) => {
    // Check if budget for this category already exists
    const existingBudget = budgets.find(b => b.category === rec.category);
    if (existingBudget) {
      updateBudgetMutation.mutate({
        id: existingBudget.id,
        json: { limit_amount: rec.recommended_limit }
      });
    } else {
      createBudgetMutation.mutate({
        category: rec.category,
        limit_amount: rec.recommended_limit,
        period: 'monthly'
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Delete this budget limit?')) {
      deleteBudgetMutation.mutate(id);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const categories = ["Food & Dining", "Shopping", "Entertainment", "Transportation", "Utilities", "Travel", "Healthcare", "Education", "Investment", "Miscellaneous"];

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Smart Budget Planner</h1>
          <p className="text-slate-400 text-xs md:text-sm">Establish spending thresholds and apply AI-guided budget optimizations.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="flex items-center space-x-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/15 transition self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Create Budget</span>
        </button>
      </div>

      {/* DYNAMIC SPENDING PREDICTIONS WARNING */}
      {budgets.some(b => parseFloat(b.current_spent) > parseFloat(b.limit_amount)) && (
        <div className="bg-rose-950/20 border border-rose-900/35 p-4 rounded-2xl flex items-start space-x-3.5">
          <AlertTriangle className="w-5.5 h-5.5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-rose-300">Overspending Detected!</h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              Your actual expenses exceed configured limits in one or more categories. 
              Our predictive algorithms suggest adjusting limits down by 15% for secondary categories next cycle to compensate.
            </p>
          </div>
        </div>
      )}

      {/* CORE BUDGET METRIC PROGRESS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {budgetsLoading ? (
          <div className="md:col-span-3 py-16 text-center text-slate-500 text-xs">Loading budgets...</div>
        ) : budgets.length > 0 ? (
          budgets.map((b) => {
            const spent = parseFloat(b.current_spent);
            const limit = parseFloat(b.limit_amount);
            const pct = limit > 0 ? (spent / limit) * 100 : 0;
            
            // Progress Bar Color checks
            let barColor = 'bg-emerald-500';
            let textColor = 'text-emerald-400';
            let bgGlow = 'bg-emerald-500/5';
            let borderColor = 'border-slate-800/80';
            
            if (pct >= 100) {
              barColor = 'bg-rose-500';
              textColor = 'text-rose-400';
              bgGlow = 'bg-rose-500/5';
              borderColor = 'border-rose-900/30';
            } else if (pct >= 80) {
              barColor = 'bg-amber-500';
              textColor = 'text-amber-400';
              bgGlow = 'bg-amber-500/5';
              borderColor = 'border-amber-900/30';
            }

            return (
              <div key={b.id} className={`glass-panel border p-6 rounded-2xl relative overflow-hidden group ${borderColor} ${bgGlow}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-sm text-white">{b.category}</h3>
                  <button 
                    onClick={() => handleDelete(b.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/5 transition opacity-0 group-hover:opacity-100 duration-200"
                    title="Delete Budget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Spent</span>
                      <span className="text-base font-extrabold text-white font-mono mt-0.5">{formatCurrency(spent)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Limit</span>
                      <span className="text-sm font-bold text-slate-300 font-mono mt-0.5">{formatCurrency(limit)}</span>
                    </div>
                  </div>

                  {/* Progress tracker bar */}
                  <div className="w-full h-2 bg-slate-950 border border-slate-800/80 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                      style={{ width: `${Math.min(100, pct)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Utilization Rate</span>
                    <span className={`font-bold ${textColor}`}>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="md:col-span-3 glass-panel p-12 text-center text-slate-500 text-xs rounded-2xl">
            No active budget limits created. Click Create Budget to set up category guidelines!
          </div>
        )}
      </div>

      {/* AI BUDGET OPTIMIZATION RECOMMENDATIONS */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center space-x-2.5">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <div>
            <h2 className="font-display font-bold text-base text-white">AI Budget Optimization Suggestions</h2>
            <p className="text-slate-400 text-xs">Dynamic recommendations computed from your recent spending behaviors.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4.5 mt-6">
          {recsLoading ? (
            <div className="text-center py-12 text-slate-500 text-xs">Analyzing historical logs...</div>
          ) : recommendations.length > 0 ? (
            recommendations.map((rec, idx) => (
              <div 
                key={idx} 
                className="p-4.5 bg-slate-900/30 border border-slate-800/50 hover:border-violet-500/20 hover:bg-slate-900/60 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-200"
              >
                <div className="space-y-1.5 flex-1 max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-violet-600/10 border border-violet-500/20 text-violet-300 rounded-md text-[9px] font-bold">
                      {rec.category}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center">
                      <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                      Potential Savings: {formatCurrency(parseFloat(rec.potential_savings))}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">{rec.reason}</p>
                </div>

                <div className="flex items-center space-x-4 shrink-0 self-end md:self-auto">
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 block uppercase font-semibold">Recommended Limit</span>
                    <span className="text-sm font-bold text-white font-mono mt-0.5">{formatCurrency(parseFloat(rec.recommended_limit))}</span>
                  </div>
                  <button
                    onClick={() => handleApplyRecommendation(rec)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-violet-600/10 hover:bg-violet-600 border border-violet-500/30 hover:border-transparent text-violet-300 hover:text-white rounded-xl text-xs font-semibold transition-all duration-200"
                  >
                    <Check className="w-4 h-4" />
                    <span>Apply Optimization</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              No recommendations available at this time.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD BUDGET DIALOG */}
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
              <h2 className="font-display font-bold text-base text-white">Create Category Limit</h2>
              <p className="text-slate-400 text-xs">Set monthly thresholds for warning triggers.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Category */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Limit Amount */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Limit Amount ({currencySymbol})</label>
                <input 
                  type="number" 
                  placeholder="5000" 
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
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
                  disabled={createBudgetMutation.isPending}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/10 transition flex items-center space-x-1.5"
                >
                  {createBudgetMutation.isPending ? 'Saving...' : 'Set Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
