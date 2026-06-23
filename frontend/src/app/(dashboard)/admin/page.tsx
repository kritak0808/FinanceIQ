'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import {
  ShieldAlert,
  Settings,
  Cpu,
  Database,
  Users,
  Activity,
  History,
  Check,
  X,
  AlertOctagon,
  Sparkles,
  Info,
  Clock
} from 'lucide-react';

export default function AdminPage() {
  const queryClient = useQueryClient();

  // 1. Fetch system health stats
  const { data: health, isLoading: healthLoading } = useQuery<any>({
    queryKey: ['admin-health'],
    queryFn: () => apiFetch('/admin/system-health'),
    refetchInterval: 10000 // auto-poll diagnostic stats every 10s
  });

  // 2. Fetch AI usage metrics
  const { data: aiMetrics, isLoading: aiLoading } = useQuery<any>({
    queryKey: ['admin-ai-metrics'],
    queryFn: () => apiFetch('/admin/ai-metrics')
  });

  // 3. Fetch Fraud alerts list
  const { data: alerts = [], isLoading: alertsLoading } = useQuery<any[]>({
    queryKey: ['admin-alerts'],
    queryFn: () => apiFetch('/admin/fraud-alerts')
  });

  // 4. Fetch audit logs
  const { data: logs = [], isLoading: logsLoading } = useQuery<any[]>({
    queryKey: ['admin-logs'],
    queryFn: () => apiFetch('/admin/audit-logs')
  });

  // 5. Resolution Mutation
  const resolveAlertMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'resolve' | 'dismiss' }) => 
      apiFetch(`/admin/fraud-alerts/${id}/resolve?action=${action}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-health'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-logs'] });
    }
  });

  const handleResolve = (id: number, action: 'resolve' | 'dismiss') => {
    resolveAlertMutation.mutate({ id, action });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const loading = healthLoading || aiLoading || alertsLoading || logsLoading;

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center flex-col space-y-4">
        <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-xs font-display">Initializing security console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white">System Administration Panel</h1>
        <p className="text-slate-400 text-xs md:text-sm">Monitor core CPU performance, AI classifiers, fraud warnings and audit logs.</p>
      </div>

      {/* SYSTEM HARDWARE & DATABASE LATENCY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* CPU utilization */}
        <div className="glass-panel p-5.5 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-semibold">CPU Utilization</span>
            <Cpu className="w-4.5 h-4.5 text-violet-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-white">{(health?.cpu_usage_percentage || 0).toFixed(1)}%</span>
              <span className="text-[10px] text-slate-500 font-semibold">Active</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 border border-slate-800/80 rounded-full overflow-hidden">
              <div 
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${health?.cpu_usage_percentage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Memory allocation */}
        <div className="glass-panel p-5.5 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-semibold">RAM Allocation</span>
            <Activity className="w-4.5 h-4.5 text-indigo-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-white">{(health?.memory_usage_percentage || 0).toFixed(1)}%</span>
              <span className="text-[10px] text-slate-500 font-semibold">In Use</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 border border-slate-800/80 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${health?.memory_usage_percentage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Database connectivity */}
        <div className="glass-panel p-5.5 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-semibold">Database Response</span>
            <Database className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div className="space-y-1.5">
            <span className="text-xl font-bold font-mono text-white">{(health?.database_latency_ms || 0).toFixed(2)} ms</span>
            <span className="text-[9px] text-emerald-400 font-bold flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse"></span>
              Postgres Connected
            </span>
          </div>
        </div>

        {/* Active Accounts/Users */}
        <div className="glass-panel p-5.5 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-semibold">Global Register</span>
            <Users className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <div className="space-y-1">
            <span className="text-xl font-bold font-mono text-white">{health?.metrics?.total_registered_users || 0}</span>
            <span className="text-[9px] text-slate-500 block font-semibold uppercase">Registered Users</span>
          </div>
        </div>

      </div>

      {/* MAIN FRAUD ALERTS PANEL */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-5.5 h-5.5 text-rose-500" />
            <div>
              <h2 className="font-display font-bold text-base text-white">Active Fraud & Anomaly Alerts</h2>
              <p className="text-slate-400 text-xs">Verify transactions flagged by the Isolation Forest outlier detector.</p>
            </div>
          </div>
          <span className="bg-rose-500/15 border border-rose-500/20 text-rose-400 text-[10px] font-bold px-3 py-1 rounded-full font-mono">
            {alerts.filter(a => a.status === 'pending').length} Triggered
          </span>
        </div>

        <div className="overflow-x-auto">
          {alerts.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-900/20">
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Flag Reason</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Resolve Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300 text-xs font-medium">
                {alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/30">
                    <td className="py-4 px-4">
                      <span className="font-bold text-white block">{a.merchant}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5 block">{a.category}</span>
                    </td>
                    <td className="py-4 px-4 text-right font-bold font-mono text-rose-400">
                      {formatCurrency(parseFloat(a.amount))}
                    </td>
                    <td className="py-4 px-4 text-slate-400 max-w-sm leading-normal text-[11px]">
                      {a.reason}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold capitalize ${
                        a.status === 'pending'
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse'
                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {a.status === 'pending' ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleResolve(a.id, 'resolve')}
                            className="p-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-transparent rounded-lg transition"
                            title="Confirm/Resolve Alert"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResolve(a.id, 'dismiss')}
                            className="p-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent rounded-lg transition"
                            title="Dismiss Alert"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">No Action Required</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-600 text-xs">
              No active fraud alerts detected. System is secure.
            </div>
          )}
        </div>
      </div>

      {/* TWO COLUMN SEGMENT: AI ACCURACY METRICS & SYSTEM AUDIT LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* AI metrics summary */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4 h-fit">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h3 className="font-display font-bold text-sm text-white">AI NLP & OCR Performance</h3>
          </div>

          <div className="space-y-4.5 flex-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Advisory Prompts</span>
              <span className="font-bold text-white font-mono">{aiMetrics?.total_ai_coach_prompts || 0}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">AI Auto-categorized</span>
              <span className="font-bold text-white font-mono">{aiMetrics?.total_ai_categorized_transactions || 0} txs</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-slate-400">Auto-Categorization Confidence</span>
                <span className="text-violet-400">{(aiMetrics?.average_categorization_confidence * 100 || 95).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-violet-500 rounded-full"
                  style={{ width: `${(aiMetrics?.average_categorization_confidence * 100) || 95}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-slate-400">Receipt OCR Confidence</span>
                <span className="text-emerald-400">{(aiMetrics?.average_ocr_confidence * 100 || 85).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(aiMetrics?.average_ocr_confidence * 100) || 85}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Audit logging system */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <History className="w-5 h-5 text-indigo-400" />
            <h3 className="font-display font-bold text-sm text-white">System Security Audit Log</h3>
          </div>

          <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-start justify-between p-3 bg-slate-900/30 border border-slate-800/40 rounded-xl text-[11px] leading-relaxed">
                <div className="space-y-0.5">
                  <span className="px-1.5 py-0.5 bg-slate-950 text-slate-400 text-[8px] font-bold uppercase rounded-md inline-block">
                    {log.action}
                  </span>
                  <p className="text-slate-300 font-medium mt-1">{log.details}</p>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-500 font-mono text-[9px] shrink-0 mt-0.5 ml-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(log.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
            
            {logs.length === 0 && (
              <div className="text-center py-12 text-slate-600 text-xs">
                No audit logs compiled yet.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
