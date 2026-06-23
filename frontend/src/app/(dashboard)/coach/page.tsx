'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import {
  MessageSquareCode,
  Send,
  Plus,
  Bot,
  User,
  Sparkles,
  HelpCircle,
  TrendingDown,
  Activity,
  PiggyBank
} from 'lucide-react';

export default function CoachPage() {
  const queryClient = useQueryClient();
  
  // States
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch all chat sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ['chat-sessions'],
    queryFn: () => apiFetch('/coach/sessions')
  });

  // Resolve active session ID dynamically during render to avoid useEffect state triggers
  const activeSessionId = selectedSessionId ?? (sessions.length > 0 ? sessions[0].id : null);

  // 2. Fetch messages of the active session
  const { data: activeSession, isLoading: messagesLoading } = useQuery<any>({
    queryKey: ['chat-session', activeSessionId],
    queryFn: () => apiFetch(`/coach/sessions/${activeSessionId}`),
    enabled: activeSessionId !== null
  });

  // Scroll to bottom on message load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession]);

  // 3. Mutations
  const createSessionMutation = useMutation({
    mutationFn: () => apiFetch('/coach/sessions', { method: 'POST', json: { title: 'New Chat Session' } }),
    onSuccess: (newSession: any) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      setSelectedSessionId(newSession.id);
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => 
      apiFetch(`/coach/sessions/${activeSessionId}/message`, { 
        method: 'POST', 
        json: { content } 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', activeSessionId] });
      setInputMessage('');
    }
  });

  // 4. Send Message Handler
  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || activeSessionId === null || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Predefined shortcuts
  const suggestions = [
    { text: "How can I save more money? 📉", label: "Save Money", icon: TrendingDown },
    { text: "Check my budget compliance status. 📋", label: "Budget Check", icon: PiggyBank },
    { text: "Explain my financial health score. 🩺", label: "Health Diagnostic", icon: Activity },
  ];

  return (
    <div className="h-[calc(100vh-130px)] flex bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      
      {/* SESSIONS SIDE PANEL (LEFT) */}
      <div className="w-60 md:w-64 border-r border-slate-800 flex flex-col bg-slate-950/20 shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Coach Chats</span>
          <button 
            onClick={() => createSessionMutation.mutate()}
            className="p-1.5 bg-violet-600/10 hover:bg-violet-600 border border-violet-500/20 hover:border-transparent text-violet-300 hover:text-white rounded-lg transition"
            title="Start new chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5">
          {sessionsLoading ? (
            <div className="text-center py-8 text-slate-500 text-xs">Loading sessions...</div>
          ) : sessions.length > 0 ? (
            sessions.map((s) => {
              const isSelected = s.id === activeSessionId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl transition flex items-start space-x-3 group ${
                    isSelected 
                      ? 'bg-violet-600/10 border border-violet-500/35 text-violet-300 font-semibold' 
                      : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <MessageSquareCode className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-xs truncate">{s.title}</span>
                </button>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-600 text-xs">
              No sessions. Click + to begin chat!
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONVERSATION VIEW (RIGHT) */}
      <div className="flex-1 flex flex-col bg-slate-950/10 justify-between overflow-hidden">
        
        {/* Session header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center space-x-3 bg-slate-950/10 shrink-0">
          <div className="w-7 h-7 bg-violet-600/15 border border-violet-500/20 text-violet-300 rounded-lg flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-xs font-bold text-white truncate">
              {activeSession ? activeSession.title : 'FinSense Financial Coach'}
            </h2>
            <span className="text-[9px] text-slate-500 font-semibold">Active AI Consultations</span>
          </div>
        </div>

        {/* Message board */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeSessionId === null ? (
            <div className="h-full flex items-center justify-center flex-col text-center p-6 space-y-3">
              <Bot className="w-12 h-12 text-violet-400 animate-pulse" />
              <h3 className="font-display font-bold text-sm text-slate-300">Start a Coaching Conversation</h3>
              <p className="text-[10px] text-slate-500 max-w-xs leading-normal">
                Ask me to audit your budgets, evaluate your Financial Health Score recommendations, or optimize savings habits.
              </p>
            </div>
          ) : messagesLoading ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Loading chat history...
            </div>
          ) : activeSession?.messages?.length > 0 ? (
            activeSession.messages.map((msg: any) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div 
                  key={msg.id}
                  className={`flex items-start space-x-3.5 max-w-[85%] ${
                    isAssistant ? 'self-start' : 'self-end flex-row-reverse space-x-reverse ml-auto'
                  }`}
                >
                  {/* Avatar bubble */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    isAssistant 
                      ? 'bg-slate-900 border-slate-800 text-violet-400' 
                      : 'bg-violet-600/10 border-violet-500/20 text-violet-300'
                  }`}>
                    {isAssistant ? <Bot className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
                  </div>

                  {/* Message body */}
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    isAssistant 
                      ? 'glass-panel border-slate-800/80 text-slate-200' 
                      : 'bg-slate-800 text-white'
                  }`}>
                    {/* Render markdown spacing stubs */}
                    <div className="space-y-2 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <Bot className="w-10 h-10 text-violet-400" />
              <div>
                <h3 className="text-xs font-bold text-slate-300">Your AI Financial Coach is online!</h3>
                <p className="text-[9px] text-slate-500 mt-1 max-w-xs leading-normal">
                  Ask details about your monthly spending limits, saving trends, or risk profiles.
                </p>
              </div>
            </div>
          )}
          
          {/* Send loader */}
          {sendMessageMutation.isPending && (
            <div className="flex items-start space-x-3.5 max-w-[85%] self-start animate-pulse">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-900 border border-slate-800 text-violet-400">
                <Bot className="w-4.5 h-4.5 animate-spin" />
              </div>
              <div className="glass-panel border-slate-800/80 p-4 rounded-2xl text-xs text-slate-400 flex items-center space-x-2">
                <span>AI Coach is compiling financials...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Suggestion prompts & Message input container */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/20 shrink-0 space-y-3.5 z-10">
          
          {/* Quick chip suggestion prompts */}
          {(!activeSession?.messages || activeSession.messages.length === 0) && (
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s.text)}
                  disabled={activeSessionId === null || sendMessageMutation.isPending}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/60 rounded-full text-[10px] font-semibold text-slate-400 hover:text-white transition shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <s.icon className="w-3.5 h-3.5 text-violet-400" />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Text input area */}
          <div className="relative flex items-center">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={activeSessionId === null || sendMessageMutation.isPending}
              placeholder={activeSessionId === null ? 'Create or select a session to chat...' : 'Ask your coach e.g., "Analyze my food spending"'}
              rows={1}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/70 transition resize-none disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputMessage.trim() || activeSessionId === null || sendMessageMutation.isPending}
              className="absolute right-3.5 p-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
