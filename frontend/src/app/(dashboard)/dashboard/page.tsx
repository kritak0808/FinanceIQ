'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Wallet,
  Calendar,
  Sparkles,
  PiggyBank,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const currencySymbol = user?.profile?.currency === 'INR' ? '₹' : '₹';

  // 1. Fetch transactions history
  const { data: transactions = [], isLoading: txLoading } = useQuery<any[]>({
    queryKey: ['dashboard-transactions'],
    queryFn: () => apiFetch('/transactions')
  });

  // 2. Fetch budget compliance
  const { data: budgets = [], isLoading: budgetsLoading } = useQuery<any[]>({
    queryKey: ['dashboard-budgets'],
    queryFn: () => apiFetch('/budgets')
  });

  // 3. Fetch Financial Health Score
  const { data: healthData, isLoading: healthLoading } = useQuery<any>({
    queryKey: ['dashboard-health-score'],
    queryFn: () => apiFetch('/admin/health-score')
  });

  // 4. Perform Data Aggregation
  const stats = useMemo(() => {
    // Filter last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const last30DaysTx = transactions.filter(tx => new Date(tx.date) >= thirtyDaysAgo);
    
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals: Record<string, number> = {};

    last30DaysTx.forEach(tx => {
      const amt = parseFloat(tx.amount);
      if (tx.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amt;
      }
    });

    // Format category totals for PieChart
    const pieData = Object.keys(categoryTotals).map(cat => ({
      name: cat,
      value: categoryTotals[cat]
    }));

    // Generate daily cash flow data for AreaChart (past 7 dates)
    const dailyDataMap: Record<string, { date: string; Income: number; Expenses: number }> = {};
    // Seed last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      dailyDataMap[label] = { date: label, Income: 0, Expenses: 0 };
    }

    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      if (dailyDataMap[label]) {
        const amt = parseFloat(tx.amount);
        if (tx.type === 'income') {
          dailyDataMap[label].Income += amt;
        } else {
          dailyDataMap[label].Expenses += amt;
        }
      }
    });

    const cashFlowData = Object.values(dailyDataMap);

    const incomeTransactions = transactions.filter(tx => tx.type === 'income');
    const sortedIncome = [...incomeTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestIncome = sortedIncome[0];
    const latestIncomeText = latestIncome 
      ? `+₹${parseFloat(latestIncome.amount).toLocaleString('en-IN')} ${latestIncome.merchant} Deposited`
      : 'No income logged this period';

    return {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      pieData,
      cashFlowData,
      latestIncomeText
    };
  }, [transactions]);

  const aiWarning = useMemo(() => {
    const overspentBudgets = budgets.filter(b => {
      const spent = parseFloat(b.current_spent);
      const limit = parseFloat(b.limit_amount);
      return limit > 0 && (spent / limit) >= 0.8;
    });

    if (overspentBudgets.length > 0) {
      const topIssue = overspentBudgets[0];
      const spent = parseFloat(topIssue.current_spent);
      const limit = parseFloat(topIssue.limit_amount);
      const pct = (spent / limit * 100).toFixed(0);
      return {
        title: spent > limit ? "AI Budget Overrun Warning" : "AI Spending Warning",
        text: spent > limit 
          ? `You have exceeded your ${topIssue.category} budget limit (spent ${pct}%). Please freeze non-essential purchases.`
          : `You have consumed ${pct}% of your limit on ${topIssue.category}. Consider trimming your outflows.`
      };
    }

    return {
      title: "AI Financial Insight",
      text: "Your current spending trajectories are stable and align with your active budgets. Keep up the disciplined tracking!"
    };
  }, [budgets]);

  // Donut chart color palette
  const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#f43f5e', '#06b6d4', '#84cc16'];

  const loading = txLoading || budgetsLoading || healthLoading;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-800 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-28 bg-slate-800 rounded-2xl"></div>
          <div className="h-28 bg-slate-800 rounded-2xl"></div>
          <div className="h-28 bg-slate-800 rounded-2xl"></div>
          <div className="h-28 bg-slate-800 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-800 rounded-2xl"></div>
          <div className="h-96 bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Format currencies
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const recentTx = transactions.slice(0, 5);

  // Health Score Color thresholds
  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 50) return 'text-amber-500 border-amber-500/20 bg-amber-500/5';
    return 'text-rose-500 border-rose-500/20 bg-rose-500/5';
  };

  return (
    <div className="space-y-6">
      {/* Upper header segment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Welcome back, {user?.profile?.first_name || 'Kritak'}!</h1>
          <p className="text-slate-400 text-xs md:text-sm">Here is a summary of your financial intelligence metrics.</p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
          <Calendar className="w-4 h-4 text-violet-500" />
          <span>Last 30 Days Dashboard</span>
        </div>
      </div>

      {/* METRIC GRID CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Income Card */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Monthly Inflow</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-xl md:text-2xl text-white">{formatCurrency(stats.totalIncome)}</h3>
            <span className="text-[10px] text-emerald-500 font-semibold flex items-center mt-1">
              {stats.latestIncomeText}
            </span>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Monthly Expenses</span>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-xl md:text-2xl text-white">{formatCurrency(stats.totalExpense)}</h3>
            <span className="text-[10px] text-slate-400 font-semibold flex items-center mt-1">
              Across {stats.pieData.length} active categories
            </span>
          </div>
        </div>

        {/* Savings Card */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Net Savings</span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-xl md:text-2xl text-white">{formatCurrency(stats.netSavings)}</h3>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center mt-1">
              Saving {(stats.totalIncome > 0 ? (stats.netSavings / stats.totalIncome * 100).toFixed(0) : 0)}% of income
            </span>
          </div>
        </div>

        {/* Financial Health Score Card */}
        <div className={`border p-6 rounded-2xl flex items-center justify-between relative overflow-hidden group ${getHealthScoreColor(healthData?.score || 70)}`}>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Financial Health</span>
            <div className="mt-3 flex items-baseline space-x-1">
              <span className="font-display font-black text-3xl md:text-4xl text-white">{healthData?.score || 70}</span>
              <span className="text-xs text-slate-400 font-medium">/100</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-2 block font-medium truncate max-w-[150px]">
              {healthData?.recommendations?.[0] || 'Emergency fund is stable.'}
            </span>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 flex items-center justify-center font-bold text-sm text-white">
            {healthData?.score || 70}%
          </div>
        </div>
      </div>

      {/* CHARTS GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Line/Area Chart */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display font-bold text-base text-white">Cash Flow Dynamics</h2>
              <p className="text-slate-400 text-xs">Tracking income vs spending over past days</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                <span className="text-slate-400 font-medium">Inflow</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 bg-violet-500 rounded-full"></span>
                <span className="text-slate-400 font-medium">Outflow</span>
              </div>
            </div>
          </div>
          <div className="h-64 md:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#f8fafc' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="Expenses" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Allocation Pie/Donut Chart */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="font-display font-bold text-base text-white">Expense Splits</h2>
            <p className="text-slate-400 text-xs mb-4">Outflow breakdown by category</p>
          </div>
          
          {stats.pieData.length > 0 ? (
            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Outflow</span>
                <span className="text-lg font-bold text-white mt-0.5">{formatCurrency(stats.totalExpense)}</span>
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-500 text-xs">
              No transactions logged this period.
            </div>
          )}

          {/* Legend tags */}
          <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-400 overflow-y-auto max-h-24">
            {stats.pieData.slice(0, 6).map((item, idx) => (
              <div key={item.name} className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="truncate">{item.name} ({((item.value / stats.totalExpense) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM SEGMENT: RECENT ACTIONS & BUDGET LIMITS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent ledger table */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-white">Recent Activity Ledger</h2>
              <p className="text-slate-400 text-xs">Verify your manual logs and scans</p>
            </div>
            <span className="text-xs text-violet-400 hover:text-violet-300 font-medium cursor-pointer">View Ledger</span>
          </div>

          <div className="space-y-3.5">
            {recentTx.map((tx) => {
              const amountVal = parseFloat(tx.amount);
              const isExpense = tx.type === 'expense';
              return (
                <div key={tx.id} className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-slate-800/40 rounded-xl hover:bg-slate-900/80 transition-all">
                  <div className="flex items-center space-x-3.5 overflow-hidden">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      tx.is_anomaly 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                        : isExpense ? 'bg-slate-800 text-slate-300' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {tx.is_anomaly ? <AlertTriangle className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-white truncate flex items-center space-x-2">
                        <span>{tx.merchant}</span>
                        {tx.is_anomaly && (
                          <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center space-x-0.5">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            <span>Suspicious</span>
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {tx.category}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold font-mono ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isExpense ? '-' : '+'}{currencySymbol}{amountVal.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{tx.payment_method}</p>
                  </div>
                </div>
              );
            })}
            
            {recentTx.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                No transactions found. Go to Transactions screen to seed some!
              </div>
            )}
          </div>
        </div>

        {/* Budgets Compliance List */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div>
            <h2 className="font-display font-bold text-base text-white">Category Limits Status</h2>
            <p className="text-slate-400 text-xs">Tracking current spending capacities</p>
          </div>

          <div className="space-y-5 flex-1">
            {budgets.slice(0, 5).map((b) => {
              const spent = parseFloat(b.current_spent);
              const limit = parseFloat(b.limit_amount);
              const pct = limit > 0 ? (spent / limit) * 100 : 0;
              
              // Progress Bar Color checks
              let barColor = 'bg-emerald-500 shadow-emerald-500/10';
              let textClass = 'text-emerald-400';
              let progressLabel = 'On Track';
              
              if (pct >= 100) {
                barColor = 'bg-rose-500 shadow-rose-500/10';
                textClass = 'text-rose-400';
                progressLabel = 'Overspent! ⚠️';
              } else if (pct >= 80) {
                barColor = 'bg-amber-500 shadow-amber-500/10';
                textClass = 'text-amber-400';
                progressLabel = 'Near Limit';
              }

              return (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">{b.category}</span>
                    <span className={`${textClass} text-[10px]`}>{progressLabel} ({pct.toFixed(0)}%)</span>
                  </div>
                  
                  {/* Progress tracker bar */}
                  <div className="w-full h-2 bg-slate-900 border border-slate-800/80 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                      style={{ width: `${Math.min(100, pct)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Spent: {formatCurrency(spent)}</span>
                    <span>Limit: {formatCurrency(limit)}</span>
                  </div>
                </div>
              );
            })}

            {budgets.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                No active budget thresholds set.
              </div>
            )}
          </div>

          {/* AI Optimizer reminder */}
          <div className="bg-violet-950/20 border border-violet-900/30 p-3 rounded-xl flex items-start space-x-3.5 mt-auto">
            <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-400 leading-normal">
              <span className="font-semibold text-violet-300 block mb-0.5">{aiWarning.title}</span>
              {aiWarning.text}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
