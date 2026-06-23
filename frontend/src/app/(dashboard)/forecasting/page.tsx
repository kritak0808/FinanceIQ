'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import {
  TrendingUp,
  Brain,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Settings
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

export default function ForecastingPage() {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');

  // 1. Fetch forecasting data
  const { data: forecastData, isLoading } = useQuery<any>({
    queryKey: ['forecasts', period],
    queryFn: () => apiFetch(`/forecasts?period=${period}`)
  });

  // Calculate historical vs future split date for ReferenceLine
  const splitDate = React.useMemo(() => {
    if (!forecastData?.data) return null;
    // Find the first data point with a forecast_value
    const firstForecastPt = forecastData.data.find((pt: any) => pt.forecast_value !== null);
    return firstForecastPt ? firstForecastPt.date : null;
  }, [forecastData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const periodOptions = [
    { value: 'weekly', label: 'Weekly Forecast' },
    { value: 'monthly', label: 'Monthly Forecast' },
    { value: 'quarterly', label: 'Quarterly Forecast' }
  ];

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Expense Forecasting</h1>
          <p className="text-slate-400 text-xs md:text-sm">Predict future liabilities using trend regressions and seasonal models.</p>
        </div>
        
        {/* Toggle buttons */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value as any)}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-semibold transition ${
                period === opt.value
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* FORECAST CHART PANEL */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="font-display font-bold text-base text-white">Projected Expense Trajectory</h2>
            <p className="text-slate-400 text-xs">Linear trend + seasonal projection with 95% confidence bands</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              <span>Historical Aggregations</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 bg-violet-500 border-2 border-dashed border-violet-500 rounded-full"></span>
              <span>Future Forecast</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-4 h-2.5 bg-violet-500/10 border border-violet-500/15 rounded-sm"></span>
              <span>Confidence Interval (95%)</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="h-80 flex items-center justify-center space-y-4 flex-col">
            <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs font-display">Training model parameters...</p>
          </div>
        ) : forecastData?.data ? (
          <div className="h-80 md:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  tickFormatter={(str) => {
                    try {
                      const d = new Date(str);
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    } catch {
                      return str;
                    }
                  }}
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                  labelFormatter={(str) => {
                    try {
                      const d = new Date(str);
                      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                    } catch {
                      return str;
                    }
                  }}
                  formatter={(value: any, name: any) => {
                    if (name === 'lower_bound' || name === 'upper_bound') return [formatCurrency(value), name === 'lower_bound' ? 'Min Bound' : 'Max Bound'];
                    if (name === 'historical_value') return [formatCurrency(value), 'Actual Spent'];
                    return [formatCurrency(value), 'Forecasted'];
                  }}
                />
                {/* Shaded Confidence Band */}
                <Area 
                  type="monotone" 
                  dataKey="upper_bound" 
                  stroke="none" 
                  fill="#8b5cf6" 
                  fillOpacity={0.06} 
                  connectNulls
                />
                <Area 
                  type="monotone" 
                  dataKey="lower_bound" 
                  stroke="none" 
                  fill="#050811" 
                  fillOpacity={0.0} 
                  connectNulls
                />
                {/* Historical Actual Line */}
                <Line 
                  type="monotone" 
                  dataKey="historical_value" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  dot={{ r: 3.5, strokeWidth: 0, fill: '#10b981' }} 
                  activeDot={{ r: 5 }}
                />
                {/* Projected Forecast Line */}
                <Line 
                  type="monotone" 
                  dataKey="forecast_value" 
                  stroke="#8b5cf6" 
                  strokeWidth={2.5} 
                  strokeDasharray="5 5" 
                  dot={{ r: 3, strokeWidth: 0, fill: '#8b5cf6' }}
                  connectNulls
                />
                {/* Split line between actuals and projection */}
                {splitDate && (
                  <ReferenceLine 
                    x={splitDate} 
                    stroke="#475569" 
                    strokeWidth={1} 
                    strokeDasharray="3 3"
                    label={{ value: 'Forecast Start', fill: '#94a3b8', fontSize: 9, position: 'top' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-500 text-xs">
            Unable to compute forecasting graphs.
          </div>
        )}
      </div>

      {/* TREND ANALYSIS REPORT PANEL */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-start gap-4">
        <div className="p-3 bg-violet-600/10 border border-violet-500/20 text-violet-300 rounded-xl shrink-0">
          <Brain className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
            <span>Diagnostic Trend Report</span>
            <Sparkles className="w-3.5 h-3.5 text-violet-400 ml-1.5" />
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed">
            {forecastData?.trend_analysis || 'Hold tight, scanning transaction history vectors...'}
          </p>
        </div>
      </div>

      {/* SYSTEM MODEL INFORMATION GRID */}
      <div>
        <h3 className="font-display font-semibold text-sm text-slate-400 mb-4 uppercase tracking-wider">Forecasting Pipeline Models</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Model 1: Prophet */}
          <div className="glass-panel p-5.5 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-violet-400 shrink-0">
                <Calendar className="w-5.5 h-5.5" />
              </div>
              <h4 className="font-display font-bold text-xs text-white">Prophet (Meta)</h4>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Additive regression model fitting non-linear trends with yearly, weekly, and daily seasonalities. Best suited for high-density transactional ledgers with holiday outliers.
            </p>
          </div>

          {/* Model 2: XGBoost */}
          <div className="glass-panel p-5.5 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-violet-400 shrink-0">
                <Layers className="w-5.5 h-5.5" />
              </div>
              <h4 className="font-display font-bold text-xs text-white">XGBoost Regressor</h4>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Gradient boosting trees that capture multi-variable relationships (e.g. amount shifts relative to payment methods and weekday indices). Excellent alpha accuracy on short-term projections.
            </p>
          </div>

          {/* Model 3: LSTM Networks */}
          <div className="glass-panel p-5.5 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-violet-400 shrink-0">
                <Settings className="w-5.5 h-5.5" />
              </div>
              <h4 className="font-display font-bold text-xs text-white">LSTM Neural Networks</h4>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Recurrent Neural Network mapping long-term sequential dependencies. Ideal for identifying complex, recurring spending patterns (like quarterly tax or semi-annual insurance premiums).
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
