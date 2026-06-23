'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  ScanLine,
  Trash2,
  AlertTriangle,
  Upload,
  X,
  FileText,
  CheckCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currencySymbol = user?.profile?.currency === 'INR' ? '₹' : '₹';

  // 1. Core States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);

  // Manual transaction inputs
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('auto');
  const [type, setType] = useState('expense');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState('');

  // CSV file input
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImportResult, setCsvImportResult] = useState<any | null>(null);

  // OCR file input
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrScanningStatus, setOcrScanningStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [ocrResult, setOcrResult] = useState<any | null>(null);

  // 2. Fetch data
  const { data: transactions = [], isLoading } = useQuery<any[]>({
    queryKey: ['transactions'],
    queryFn: () => apiFetch('/transactions')
  });

  // 3. Mutations
  const createTxMutation = useMutation({
    mutationFn: (newTx: any) => apiFetch('/transactions', { method: 'POST', json: newTx }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-health-score'] });
      setShowManualModal(false);
      resetManualForm();
    }
  });

  const deleteTxMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-health-score'] });
    }
  });

  const uploadCSVMutation = useMutation({
    mutationFn: (formData: FormData) => apiFetch<any>('/transactions/import-csv', { method: 'POST', body: formData }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-transactions'] });
      setCsvImportResult(data);
    }
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: (formData: FormData) => apiFetch<any>('/transactions/upload-receipt', { method: 'POST', body: formData }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-transactions'] });
      setOcrScanningStatus('completed');
      setOcrResult(data);
    },
    onError: () => {
      setOcrScanningStatus('failed');
    }
  });

  // 4. Reset helpers
  const resetManualForm = () => {
    setAmount('');
    setMerchant('');
    setCategory('auto');
    setType('expense');
    setPaymentMethod('UPI');
    setDate(new Date().toISOString().substring(0, 10));
    setDescription('');
  };

  const resetCSVForm = () => {
    setCsvFile(null);
    setCsvImportResult(null);
  };

  const resetOCRForm = () => {
    setOcrFile(null);
    setOcrScanningStatus('idle');
    setOcrResult(null);
  };

  // 5. Submit handlers
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !merchant) return;
    createTxMutation.mutate({
      amount: parseFloat(amount),
      type,
      merchant,
      category,
      date: new Date(date).toISOString(),
      payment_method: paymentMethod,
      description,
      account_id: null
    });
  };

  const handleCSVSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    const formData = new FormData();
    formData.append('file', csvFile);
    uploadCSVMutation.mutate(formData);
  };

  const handleOCRSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocrFile) return;
    setOcrScanningStatus('uploading');
    const formData = new FormData();
    formData.append('file', ocrFile);
    
    // Simulate OCR processing steps text
    setTimeout(() => {
      setOcrScanningStatus('processing');
    }, 1200);

    uploadReceiptMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      deleteTxMutation.mutate(id);
    }
  };

  // 6. Filtering & Searching in Client
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchSearch = 
        tx.merchant.toLowerCase().includes(search.toLowerCase()) || 
        (tx.description && tx.description.toLowerCase().includes(search.toLowerCase())) ||
        tx.category.toLowerCase().includes(search.toLowerCase());
      
      const matchCategory = selectedCategory === 'All' || tx.category === selectedCategory;
      
      return matchSearch && matchCategory;
    });
  }, [transactions, search, selectedCategory]);

  const categoriesList = ['All', 'Food & Dining', 'Shopping', 'Transportation', 'Utilities', 'Healthcare', 'Education', 'Entertainment', 'Travel', 'Investment', 'Miscellaneous'];

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Transactions Manager</h1>
          <p className="text-slate-400 text-xs md:text-sm">Log your outflow manually, upload statement files or run receipt scans.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowCSVModal(true)} 
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Import CSV</span>
          </button>
          <button 
            onClick={() => { resetOCRForm(); setShowOCRModal(true); }} 
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
          >
            <ScanLine className="w-4 h-4 text-violet-400" />
            <span>Scan Receipt</span>
          </button>
          <button 
            onClick={() => setShowManualModal(true)} 
            className="flex items-center space-x-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/15 transition"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH PANEL */}
      <div className="glass-panel p-4.5 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search merchant, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-violet-500/70 transition"
          />
        </div>

        {/* Category list filters */}
        <div className="flex items-center space-x-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4.5 h-4.5 text-slate-500 shrink-0" />
          <div className="flex space-x-1.5 shrink-0">
            {categoriesList.slice(0, 5).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-violet-600/15 border border-violet-500/35 text-violet-300'
                    : 'bg-slate-900 border border-slate-800/40 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
            {categoriesList.length > 5 && (
              <select
                value={categoriesList.includes(selectedCategory) && categoriesList.indexOf(selectedCategory) >= 5 ? selectedCategory : 'More'}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-900 border border-slate-800/40 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-slate-400 focus:outline-none cursor-pointer"
              >
                <option value="More" disabled>More Categories</option>
                {categoriesList.slice(5).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* LEDGER TABLE GRID */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-24 flex items-center justify-center space-y-4 flex-col">
              <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-xs font-display">Loading transaction records...</p>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-900/30">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Merchant & Info</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Payment Method</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300 text-xs">
                {filteredTransactions.map((tx) => {
                  const isExpense = tx.type === 'expense';
                  const amountVal = parseFloat(tx.amount);
                  return (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-slate-900/40 transition-colors ${
                        tx.is_anomaly ? 'bg-rose-950/5 hover:bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-4.5 px-6 font-mono text-[10px] text-slate-400">
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      
                      {/* Merchant & Info */}
                      <td className="py-4.5 px-6">
                        <div className="flex items-center space-x-2.5">
                          <div>
                            <span className="font-semibold text-white block">{tx.merchant}</span>
                            {tx.description && <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">{tx.description}</span>}
                          </div>
                          {tx.is_anomaly && (
                            <div className="group relative">
                              <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black px-2 py-0.5 rounded-full flex items-center space-x-0.5 cursor-help">
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                <span>Outlier</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Category Badge */}
                      <td className="py-4.5 px-6">
                        <span className="px-2.5 py-1 bg-slate-800 text-[10px] font-semibold text-slate-300 rounded-lg">
                          {tx.category}
                        </span>
                      </td>
                      
                      {/* Method */}
                      <td className="py-4.5 px-6 text-slate-400 font-medium">
                        {tx.payment_method}
                      </td>
                      
                      {/* Amount */}
                      <td className="py-4.5 px-6 text-right font-bold font-mono">
                        <span className={isExpense ? 'text-rose-400' : 'text-emerald-400'}>
                          {isExpense ? '-' : '+'}{currencySymbol}{amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      
                      {/* Delete Action */}
                      <td className="py-4.5 px-6 text-center">
                        <button 
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/5 transition"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-24 text-center text-slate-500 text-xs">
              No transactions match the search filters. Try logging some!
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: MANUAL TRANSACTION ENTRY */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowManualModal(false)} 
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 border-b border-slate-800 bg-slate-900/20">
              <h2 className="font-display font-bold text-base text-white">Log Manual Transaction</h2>
              <p className="text-slate-400 text-xs">Instantly add cash flow records to the ledger.</p>
            </div>
            
            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Type Selection */}
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Flow Type</label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none"
                  >
                    <option value="expense">Expense (-)</option>
                    <option value="income">Income (+)</option>
                  </select>
                </div>
                {/* Amount */}
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Amount ({currencySymbol})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="250.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Merchant */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Merchant Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Swiggy, Uber, Netflix" 
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category selection */}
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Category</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none"
                  >
                    <option value="auto">🪄 AI Auto-Categorize</option>
                    {categoriesList.slice(1).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                {/* Payment Method */}
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Payment Method</label>
                  <select 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="NetBanking">NetBanking</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Date */}
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Transaction Date</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Description (Optional)</label>
                <textarea 
                  rows={2}
                  placeholder="Additional expense parameters..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white mt-1.5 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800/80">
                <button 
                  type="button" 
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createTxMutation.isPending}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/10 transition flex items-center space-x-1.5"
                >
                  {createTxMutation.isPending ? 'Saving...' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CSV IMPORT STATEMENT */}
      {showCSVModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setShowCSVModal(false); resetCSVForm(); }} 
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 border-b border-slate-800 bg-slate-900/20">
              <h2 className="font-display font-bold text-base text-white">Import Statement CSV</h2>
              <p className="text-slate-400 text-xs">Upload transaction spreadsheets directly into the ledger.</p>
            </div>
            
            <div className="p-6">
              {!csvImportResult ? (
                <form onSubmit={handleCSVSubmit} className="space-y-4">
                  {/* File Upload Drop Zone */}
                  <div className="border-2 border-dashed border-slate-800 hover:border-violet-500/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition cursor-pointer relative bg-slate-950/20">
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <FileSpreadsheet className="w-10 h-10 text-emerald-500 mb-3" />
                    {csvFile ? (
                      <div>
                        <span className="text-xs font-semibold text-white block">{csvFile.name}</span>
                        <span className="text-[10px] text-slate-500 block mt-1">{(csvFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-semibold text-slate-300 block">Drag & drop CSV file or click to browse</span>
                        <span className="text-[9px] text-slate-500 block mt-1">Supports standard CSV headers (Amount, Merchant, Date, Method)</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                    <button 
                      type="button" 
                      onClick={() => { setShowCSVModal(false); resetCSVForm(); }}
                      className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
                    >
                      Close
                    </button>
                    <button 
                      type="submit"
                      disabled={!csvFile || uploadCSVMutation.isPending}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadCSVMutation.isPending ? 'Processing...' : 'Upload Statement'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 py-3 text-center">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-sm text-white">{csvImportResult.message}</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 border border-slate-800 rounded-xl text-left max-w-xs mx-auto">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Imported</span>
                      <span className="text-sm font-bold text-white font-mono mt-0.5">{csvImportResult.imported_count} records</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Anomalies</span>
                      <span className="text-sm font-bold text-rose-400 font-mono mt-0.5">{csvImportResult.anomalies_detected} flagged</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-800 flex justify-center">
                    <button
                      onClick={() => { setShowCSVModal(false); resetCSVForm(); }}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: OCR RECEIPT SCANNER */}
      {showOCRModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setShowOCRModal(false); resetOCRForm(); }} 
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 border-b border-slate-800 bg-slate-900/20">
              <h2 className="font-display font-bold text-base text-white flex items-center space-x-2">
                <ScanLine className="w-5 h-5 text-violet-400" />
                <span>AI Receipt OCR Scanner</span>
              </h2>
              <p className="text-slate-400 text-xs">Extract fields and categorize invoices instantly via machine learning.</p>
            </div>
            
            <div className="p-6">
              {ocrScanningStatus === 'idle' && (
                <form onSubmit={handleOCRSubmit} className="space-y-4">
                  <div className="border-2 border-dashed border-slate-800 hover:border-violet-500/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition cursor-pointer relative bg-slate-950/20">
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, application/pdf"
                      onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-10 h-10 text-violet-400 mb-3" />
                    {ocrFile ? (
                      <div>
                        <span className="text-xs font-semibold text-white block">{ocrFile.name}</span>
                        <span className="text-[10px] text-slate-500 block mt-1">{(ocrFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-semibold text-slate-300 block">Drag & drop receipt or click to browse</span>
                        <span className="text-[9px] text-slate-500 block mt-1">Supports PNG, JPG, JPEG, and PDF invoice statements</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                    <button 
                      type="button" 
                      onClick={() => { setShowOCRModal(false); resetOCRForm(); }}
                      className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
                    >
                      Close
                    </button>
                    <button 
                      type="submit"
                      disabled={!ocrFile}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Start Scan
                    </button>
                  </div>
                </form>
              )}

              {/* Scanning status loading page */}
              {(ocrScanningStatus === 'uploading' || ocrScanningStatus === 'processing') && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                    <ScanLine className="w-6 h-6 text-violet-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-white">
                      {ocrScanningStatus === 'uploading' ? 'Uploading files...' : 'AI Processing Receipt...'}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 animate-pulse max-w-xs">
                      {ocrScanningStatus === 'uploading' 
                        ? 'Transferring securely to cloud sandbox...' 
                        : 'Reading total sums, merchant text strings, and aligning categories...'}
                    </p>
                  </div>
                </div>
              )}

              {/* OCR Scanning Finished Screen */}
              {ocrScanningStatus === 'completed' && ocrResult && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Extraction Succeeded!</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">Linked transaction details saved under ledger logs.</p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-950 border border-slate-800 p-4.5 rounded-xl text-xs font-medium">
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-500">Merchant</span>
                      <span className="font-bold text-white">{ocrResult.receipt.extracted_merchant}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-500">Total Amount</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {currencySymbol}{parseFloat(ocrResult.receipt.extracted_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-500">Category Mapped</span>
                      <span className="font-semibold text-violet-300">{ocrResult.transaction.category}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-500">OCR Confidence</span>
                      <span className="font-bold text-white">{(ocrResult.receipt.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Anomaly Check</span>
                      <span className={`font-bold ${ocrResult.transaction.is_anomaly ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {ocrResult.transaction.is_anomaly ? '⚠️ Suspicious Outlier' : '✅ Standard Transaction'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => { setShowOCRModal(false); resetOCRForm(); }}
                      className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-500/10 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Failed OCR screen */}
              {ocrScanningStatus === 'failed' && (
                <div className="py-8 text-center space-y-4">
                  <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-white">Scanning Failed</h3>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                      There was a problem reading the text formatting. Check that the image is clear and contains a visible total sum.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 flex justify-center">
                    <button
                      onClick={resetOCRForm}
                      className="px-5 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
