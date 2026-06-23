'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ScanLine,
  TrendingUp,
  Brain,
  ShieldCheck,
  Percent,
  CheckCircle,
  Code2,
  Lock,
  ChevronRight
} from 'lucide-react';

export default function LandingPage() {
  // Calculator States for interactive widget
  const [income, setIncome] = useState(75000);
  const [savingsPct, setSavingsPct] = useState(20);
  const [years, setYears] = useState(5);
  
  const estimatedSavings = React.useMemo(() => {
    const monthlySaved = income * (savingsPct / 100);
    const totalMonths = years * 12;
    // Assume 7% compounding interest rate annual, compiled monthly
    const monthlyRate = 0.07 / 12;
    let balance = 0;
    for (let i = 0; i < totalMonths; i++) {
      balance = (balance + monthlySaved) * (1 + monthlyRate);
    }
    return Math.round(balance);
  }, [income, savingsPct, years]);

  const features = [
    {
      title: 'AI Expense Categorization',
      desc: 'Automatic text vectorization maps descriptors like "Uber" or "Swiggy" to Transportation or Food & Dining categories with high confidence ratings.',
      icon: Brain,
      color: 'text-violet-400 bg-violet-500/5 border-violet-500/10'
    },
    {
      title: 'OCR Receipt Scanner',
      desc: 'Upload invoices (PNG/JPG/PDF). OpenCV image cleaning feeds Tesseract/EasyOCR pipelines to extract dates, total amounts, and merchant headers.',
      icon: ScanLine,
      color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10'
    },
    {
      title: 'Time-Series Forecasting',
      desc: 'Predict weekly and monthly liabilities using mathematical regressions loaded with day-of-week and month cyclical indicators.',
      icon: TrendingUp,
      color: 'text-blue-400 bg-blue-500/5 border-blue-500/10'
    },
    {
      title: 'Isolation Forest Anomaly Check',
      desc: 'Flag suspicious outflows that represent statistical deviations compared to your normal spending histories, protecting you from billing fraud.',
      icon: ShieldCheck,
      color: 'text-rose-400 bg-rose-500/5 border-rose-500/10'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans relative">
      
      {/* Background gradients */}
      <div className="absolute top-[-100px] left-[-100px] w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute top-[400px] right-[-100px] w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* NAVBAR */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-black text-base tracking-wide text-white">FinSense AI</span>
        </div>

        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-xs font-semibold text-slate-400 hover:text-white transition">
            Sign In
          </Link>
          <Link 
            href="/register" 
            className="flex items-center space-x-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/15 transition"
          >
            <span>Get Started</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="px-6 py-16 md:py-24 text-center max-w-4xl mx-auto space-y-8 z-10 relative">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-violet-600/10 border border-violet-500/20 text-violet-300 rounded-full text-[10px] font-bold tracking-wide uppercase">
          <Brain className="w-3.5 h-3.5" />
          <span>Next-Generation FinTech Engine</span>
        </div>

        <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-white leading-tight">
          Empower Your Finances with{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-300 to-emerald-300">
            AI Intelligence
          </span>
        </h1>

        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          FinSense AI wraps receipt scans, spend classification models, budget optimizers, and anomalous transaction detectors inside a unified command center.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/register" 
            className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-6 py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/15 transition-all duration-200"
          >
            <span>Launch Sandbox Account</span>
            <ArrowRight className="w-4.5 h-4.5" />
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto px-6 py-3.5 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-all duration-200"
          >
            Access Console
          </Link>
        </div>
      </section>

      {/* FEATURES GRIDS */}
      <section className="px-6 py-12 max-w-6xl mx-auto space-y-12 z-10">
        <div className="text-center space-y-2">
          <h2 className="font-display font-bold text-xl md:text-2xl text-white">Advanced Core Pipeline Modules</h2>
          <p className="text-slate-500 text-xs md:text-sm">Powering full-stack fintech operations with machine learning logic.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, idx) => (
            <div key={idx} className="glass-panel p-6 rounded-2xl border flex items-start space-x-4 bg-slate-900/10">
              <div className={`p-3 border rounded-xl shrink-0 ${f.color}`}>
                <f.icon className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display font-bold text-sm text-white">{f.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* INTERACTIVE savings CALCULATOR SEGMENT */}
      <section className="px-6 py-12 max-w-4xl mx-auto z-10 w-full">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 bg-slate-900/15 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Percent className="w-5 h-5 text-violet-400" />
              <h2 className="font-display font-bold text-base text-white">Savings Compounding Calculator</h2>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Slide parameters to preview estimated asset compounding. FinSense automatically syncs similar pacing rules to your active Savings Goals.
            </p>

            <div className="space-y-4 text-xs font-semibold text-slate-300">
              {/* Income slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span>Monthly Net Income</span>
                  <span className="font-bold text-white font-mono">₹{income.toLocaleString('en-IN')}</span>
                </div>
                <input 
                  type="range" 
                  min="20000" 
                  max="300000" 
                  step="5000"
                  value={income}
                  onChange={(e) => setIncome(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Savings rate slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span>Savings Target Rate</span>
                  <span className="font-bold text-white font-mono">{savingsPct}% (₹{(income * (savingsPct / 100)).toLocaleString('en-IN')}/mo)</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="60" 
                  step="5"
                  value={savingsPct}
                  onChange={(e) => setSavingsPct(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Years slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span>Duration Term</span>
                  <span className="font-bold text-white font-mono">{years} Years</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  step="1"
                  value={years}
                  onChange={(e) => setYears(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Results panel */}
          <div className="p-6 bg-slate-950 border border-slate-850 rounded-2xl text-center space-y-3.5">
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Estimated Compound Wealth</span>
            <h3 className="font-display font-black text-3xl text-emerald-400 font-mono">
              ₹{estimatedSavings.toLocaleString('en-IN')}
            </h3>
            <span className="text-[9px] text-slate-500 block leading-normal">
              Assuming 7.0% annual yield compounded monthly.
            </span>
            <div className="pt-2">
              <Link 
                href="/register" 
                className="inline-flex items-center space-x-1.5 text-xs text-violet-400 hover:text-violet-300 font-semibold underline"
              >
                <span>Automate Savings inside console</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING PANEL */}
      <section className="px-6 py-12 max-w-4xl mx-auto space-y-8 z-10 w-full">
        <div className="text-center space-y-2">
          <h2 className="font-display font-bold text-xl md:text-2xl text-white">Transparent Subscription Models</h2>
          <p className="text-slate-500 text-xs md:text-sm">Start testing in the local sandbox today.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Sandbox Plan */}
          <div className="glass-panel p-6.5 rounded-3xl border border-slate-800 space-y-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 block uppercase">Sandbox Tier</span>
              <span className="font-display font-bold text-2xl text-white mt-1">Free Sandbox</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-400 font-semibold">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Unlimited Manual Entries</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>AI Receipt OCR Simulator</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Basic Forecast Regressions</span>
              </li>
            </ul>
            <Link 
              href="/register" 
              className="w-full flex items-center justify-center py-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
            >
              Sign Up
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="glass-panel p-6.5 rounded-3xl border border-violet-500/20 bg-violet-600/5 space-y-4 relative">
            <span className="absolute top-3.5 right-3.5 bg-violet-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Popular</span>
            <div>
              <span className="text-xs font-semibold text-violet-300 block uppercase font-bold">Premium Tier</span>
              <span className="font-display font-bold text-2xl text-white mt-1">₹499/month</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-400 font-semibold">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>LangChain AI Financial Coach</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Prophet Time Series Pipeline</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Isolation Forest Alert Triggers</span>
              </li>
            </ul>
            <Link 
              href="/register" 
              className="w-full flex items-center justify-center py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/10 transition"
            >
              Subscribe Now
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-6 text-center text-[10px] text-slate-500 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-1">
            <Code2 className="w-4 h-4 text-slate-600" />
            <span>FinSense AI SaaS Sandbox Platform</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>Local security encryption enabled.</span>
          </div>
          <div>
            <span>© 2026 FinSense. All rights reserved.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
