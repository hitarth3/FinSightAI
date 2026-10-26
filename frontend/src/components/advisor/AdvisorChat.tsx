import React, { useState, useRef, useEffect } from 'react';
import { advisorService, ChatMessage } from '../../services/advisorService';
import { GlassCard } from '../ui/GlassCard';
import { Brain, Send, User, Sparkles, RotateCcw } from 'lucide-react';

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

const STARTER_PROMPTS = [
  'Which card should I use for groceries?',
  'How can I maximize my cashback this month?',
  'What is the best card for online shopping?',
  'Am I missing rewards on any spends?',
];

export const AdvisorChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your Smart Card Advisor 🤖. Ask me anything about your credit cards, rewards, or how to optimize your spending for maximum cashback."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const userMessage = text.trim();
    if (!userMessage || isLoading) return;

    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await advisorService.chatAdvisor(userMessage, messages);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an issue processing your request. Please try again in a moment.'
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleReset = () => {
    setMessages([{
      role: 'assistant',
      content: "Hi! I'm your Smart Card Advisor 🤖. Ask me anything about your credit cards, rewards, or how to optimize your spending for maximum cashback."
    }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full min-h-[550px]">
      {/* Chat Header */}
      <GlassCard className="p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[var(--bg-color)]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)]">Smart Card Advisor</p>
            <p className="text-[9px] text-emerald-400 font-semibold">● Online · RAG-Powered</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-subtle)]"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </GlassCard>

      {/* Messages Area */}
      <GlassCard className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 mb-4" style={{ maxHeight: '400px' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
              msg.role === 'assistant'
                ? 'bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)]'
                : 'bg-[var(--surface-raised)] border border-[var(--border-color)]'
            }`}>
              {msg.role === 'assistant'
                ? <Sparkles className="w-3.5 h-3.5 text-white" />
                : <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              }
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === 'assistant'
                  ? 'bg-[var(--surface-raised)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-tl-sm'
                  : 'bg-gradient-to-tr from-[var(--primary-color)]/20 to-[var(--secondary-color)]/20 border border-[var(--primary-color)]/25 text-[var(--text-primary)] rounded-tr-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 bg-[var(--surface-raised)] border border-[var(--border-color)]">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </GlassCard>

      {/* Starter Prompts - only visible when no user messages yet */}
      {messages.length === 1 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-left px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200 font-medium"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask about rewards, card optimization, cashback tips..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors placeholder:text-[var(--text-secondary)]/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="shrink-0 p-3 rounded-xl bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] text-white hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default AdvisorChat;
