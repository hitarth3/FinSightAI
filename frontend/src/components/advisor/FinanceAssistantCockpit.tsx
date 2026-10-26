import { API_BASE, apiFetch } from '../../services/apiClient';
import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Brain, Send, User, Sparkles, RotateCcw, Zap } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const TypingDots: React.FC = () => (
  <span className="flex items-center gap-1 h-4">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-[var(--primary-color)]/60 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
      />
    ))}
  </span>
);

export const FinanceAssistantCockpit: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const getHeaders = () => {
    const token = localStorage.getItem('finsight_access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  const callFinanceChat = async (message: string, isAnalyze: boolean) => {
    setIsLoading(true);
    try {
      const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await apiFetch(`${API_BASE}/api/advisor/finance-chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          message,
          history: historyPayload,
          is_analyze: isAnalyze,
        }),
      });

      if (!res.ok) throw new Error('API communication error');
      const json = await res.json();
      const reply = json.data.reply;

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue connecting to the financial intelligence engine. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    await callFinanceChat(text, false);
  };

  const handleAnalyze = async () => {
    if (isLoading) return;
    setMessages(prev => [...prev, { role: 'user', content: 'Generate comprehensive financial analysis' }]);
    await callFinanceChat('Generate comprehensive financial analysis', true);
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
  };

  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs text-[var(--text-secondary)]/90">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-2 leading-relaxed">
                <span className="text-[var(--primary-color)] mt-1 shrink-0">•</span>
                <span>{trimmed.substring(1).trim()}</span>
              </div>
            );
          }
          if (trimmed.startsWith('###')) {
            return (
              <h4 key={idx} className="text-sm font-black text-[var(--text-primary)] mt-3 mb-1 tracking-tight">
                {trimmed.replace('###', '').trim()}
              </h4>
            );
          }
          if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            return (
              <h5 key={idx} className="text-xs font-bold text-[var(--text-primary)] mt-2 mb-0.5 uppercase tracking-wider">
                {trimmed.replace(/\*\*/g, '').trim()}
              </h5>
            );
          }
          if (trimmed.includes('**')) {
            const parts = trimmed.split('**');
            return (
              <p key={idx} className="leading-relaxed">
                {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-bold text-[var(--text-primary)]">{part}</strong> : part)}
              </p>
            );
          }
          if (!trimmed) return <div key={idx} className="h-1.5" />;
          return <p key={idx} className="leading-relaxed">{trimmed}</p>;
        })}
      </div>
    );
  };

  return (
    <GlassCard className="lg:col-span-2 p-6 flex flex-col justify-between min-h-[420px]" glow>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center shadow-md shadow-[var(--primary-color)]/20">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[var(--text-primary)] tracking-tight flex items-center gap-1.5">
              AI Financial Assistant Cockpit
            </h4>
            <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">
              ● Online · Live Data grounded
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-[9px] font-bold text-[var(--text-secondary)]/60 hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider px-2 py-1 rounded-lg hover:bg-[var(--surface-subtle)]"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Clear
          </button>
        )}
      </div>

      {/* Message List area */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-1 scrollbar-thin max-h-[280px] min-h-[180px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Zap className="w-8 h-8 text-[var(--primary-color)] mb-2.5 animate-pulse" />
            <p className="text-xs text-[var(--text-primary)] font-bold mb-1">
              Centralized Intelligence Cockpit Active
            </p>
            <p className="text-[10px] text-[var(--text-secondary)]/50 max-w-sm leading-relaxed">
              Ask about monthly spending, investment performance, credit card utilization limits, loan EMIs, or generate a full portfolio audit.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)]'
                  : 'bg-[var(--surface-raised)] border border-[var(--border-color)]'
              }`}>
                {msg.role === 'assistant' ? (
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                ) : (
                  <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                )}
              </div>

              <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs ${
                msg.role === 'assistant'
                  ? 'bg-[var(--surface-muted)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-tl-sm'
                  : 'bg-gradient-to-tr from-[var(--primary-color)]/20 to-[var(--secondary-color)]/20 border border-[var(--primary-color)]/25 text-[var(--text-primary)] rounded-tr-sm'
              }`}>
                {msg.role === 'assistant' ? renderMessageContent(msg.content) : msg.content}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 bg-[var(--surface-muted)] border border-[var(--border-color)]">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input controls */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask FinSightAI (e.g., How much did I spend this month?)"
          disabled={isLoading}
          className="flex-1 bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors placeholder:text-[var(--text-secondary)]/40 disabled:opacity-50"
        />

        <div className="flex items-center gap-1.5 shrink-0">
          <GlassButton
            type="submit"
            disabled={!input.trim() || isLoading}
            className="py-2.5 px-3.5 text-[10px] font-bold flex items-center gap-1 bg-gradient-to-tr from-[var(--primary-color)]/20 to-[var(--secondary-color)]/20 hover:from-[var(--primary-color)]/30 hover:to-[var(--secondary-color)]/30 border-[var(--primary-color)]/30"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Query</span>
          </GlassButton>

          <GlassButton
            type="button"
            onClick={handleAnalyze}
            disabled={isLoading}
            className="py-2.5 px-3.5 text-[10px] font-bold flex items-center gap-1 border-[var(--border-color)] hover:bg-[var(--surface-raised)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Analyze</span>
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  );
};
