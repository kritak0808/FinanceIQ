'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  Briefcase,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Percent,
  TrendingUp,
  Brain,
  Info
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function InvestmentsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currencySymbol = user?.profile?.currency === 'INR' ? '₹' : '₹';

  // State
  const [age, setAge] = useState('30');
  const [monthlyIncome, setMonthlyIncome] = useState(user?.profile?.monthly_income?.toString() || '75000');
  const [currentSavings, setCurrentSavings] = useState('50000');
  const [riskTolerance, setRiskTolerance] = useState('Moderate');
  const [profileExists, setProfileExists] = useState(false);

  // 1. Fetch Investment Profile (to see if exists)
  const { data: investProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['investment-profile'],
    queryFn: async () => {
      try {
        const data = await apiFetch<any>('/investments/profile');
        setAge(data.age.toString());
        setMonthlyIncome(parseFloat(data.monthly_income).toString());
        setCurrentSavings(parseFloat(data.current_savings).toString());
        setRiskTolerance(data.risk_tolerance);
        setProfileExists(true);
        return data;
      } catch (err: any) {
        if (err.status === 404) {
          // If no investment profile exists yet, fallback cleanly
          setProfileExists(false);
          return null;
        }
        throw err;
      }
    }
  });

  // 2. Fetch recommendations
  const { data: recommendationsData, isLoading: recsLoading } = useQuery<any>({
    queryKey: ['investment-recommendations'],
    queryFn: () => apiFetch('/investments/recommendations'),
    // Only query automatically if user has profile or fallback can execute
  });

  // 3. Mutation
  const saveProfileMutation = useMutation({
    mutationFn: (profile: any) => apiFetch('/investments/profile', { method: 'POST', json: profile }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-profile'] });
      queryClient.invalidateQueries({ queryKey: ['investment-recommendations'] });
      setProfileExists(true);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!age || !monthlyIncome || !currentSavings) return;
    saveProfileMutation.mutate({
      age: parseInt(age),
      monthly_income: parseFloat(monthlyIncome),
      current_savings: parseFloat(currentSavings),
      risk_tolerance: riskTolerance
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

  const chartData = React.useMemo(() => {
    if (!recommendationsData?.recommendations) return [];
    return recommendationsData.recommendations.map((rec: any) => ({
      name: rec.asset_class,
      value: rec.recommended_percentage
    }));
  }, [recommendationsData]);

  const loading = profileLoading || recsLoading;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Investment Recommendation Engine</h1>
        <p className="text-slate-400 text-xs md:text-sm">Configure your demographic risk parameters to generate optimized portfolios.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RISK PROFILE PROFILE FORM (LEFT) */}
        <div className="glass-panel p-6 rounded-2xl h-fit">
          <div className="flex items-center space-x-2.5 mb-5 border-b border-slate-800 pb-3">
            <Briefcase className="w-5 h-5 text-violet-400" />
            <h2 className="font-display font-bold text-sm text-white">Risk Tolerance Profiler</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Age */}
            <div>
              <label className="text-[10px] text-slate-400 font-semibold uppercase">Your Age (Years)</label>
              <input 
                type="number" 
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="18"
                max="120"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Income */}
            <div>
              <label className="text-[10px] text-slate-400 font-semibold uppercase">Monthly Net Income (₹)</label>
              <input 
                type="number" 
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Investible Savings */}
            <div>
              <label className="text-[10px] text-slate-400 font-semibold uppercase">Liquid Investible Savings (₹)</label>
              <input 
                type="number" 
                value={currentSavings}
                onChange={(e) => setCurrentSavings(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Risk Preference Option buttons */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-semibold uppercase">Risk Appetite</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {['Conservative', 'Moderate', 'Aggressive'].map((level) => {
                  const isSel = riskTolerance === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setRiskTolerance(level)}
                      className={`py-2 rounded-xl text-[10px] font-semibold border transition ${
                        isSel 
                          ? 'bg-violet-600/15 border-violet-500/35 text-violet-300' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={saveProfileMutation.isPending}
              className="w-full mt-4 flex items-center justify-center space-x-1.5 px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/10 transition"
            >
              <span>{saveProfileMutation.isPending ? 'Recalculating...' : 'Optimize Allocation'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* RECOMMENDATIONS SPLITS VIEW (RIGHT) */}
        <div className="lg:col-span-2 space-y-6">
          
          {loading ? (
            <div className="glass-panel p-24 rounded-2xl text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Formulating risk-efficient asset metrics...</span>
            </div>
          ) : recommendationsData ? (
            <div className="space-y-6">
              
              {/* Output splits panel */}
              <div className="glass-panel p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Pie chart */}
                <div className="h-56 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                        formatter={(value: any) => `${value}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-[9px] text-slate-500 font-semibold uppercase">Risk Profile</span>
                    <span className="text-sm font-extrabold text-white mt-0.5">{recommendationsData.risk_tolerance}</span>
                  </div>
                </div>

                {/* Split list labels */}
                <div className="space-y-3.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                    <Percent className="w-4 h-4 text-violet-400 mr-1.5" />
                    <span>Portfolio Weightages</span>
                  </h3>
                  
                  <div className="space-y-2.5">
                    {recommendationsData.recommendations.map((rec: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                          <span className="text-slate-300 truncate font-medium">{rec.asset_class}</span>
                        </div>
                        <span className="font-bold text-white font-mono">{rec.recommended_percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Explanation card */}
              <div className="glass-panel p-6 rounded-2xl flex items-start space-x-4">
                <div className="p-3 bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded-xl shrink-0 mt-0.5 animate-pulse">
                  <Brain className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <span>AI Allocation Rationale</span>
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  </h3>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {recommendationsData.ai_explanation}
                  </p>
                </div>
              </div>

              {/* Detailed asset list */}
              <div className="space-y-3.5">
                <h3 className="font-display font-semibold text-sm text-slate-400 uppercase tracking-wider">Asset Class Specifications</h3>
                <div className="grid grid-cols-1 gap-4">
                  {recommendationsData.recommendations.map((rec: any, idx: number) => (
                    <div key={idx} className="p-4 bg-slate-900/30 border border-slate-800/50 rounded-xl flex items-start space-x-3.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                        {idx + 1}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-white">{rec.asset_class} • {rec.recommended_percentage}% Allocation</h4>
                        <p className="text-[10px] text-slate-500 leading-normal">{rec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-16 rounded-2xl text-center text-slate-500 text-xs">
              Configure your Profile settings on the left and optimize to fetch advice splits!
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
