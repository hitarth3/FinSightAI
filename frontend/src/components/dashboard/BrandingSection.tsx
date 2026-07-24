import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, Cpu, Sparkles, TrendingUp, Compass, Wallet } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassBadge } from '../ui/GlassBadge';
import { FinancialChart } from './FinancialChart';
import { NetWorthCard } from './NetWorthCard';

export const BrandingSection: React.FC = () => {
  const [healthScore, setHealthScore] = useState(0);

  useEffect(() => {
    // Animate financial health score ring
    const timer = setTimeout(() => {
      setHealthScore(88);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col justify-between p-8 md:p-12 lg:p-16 select-none overflow-hidden">
      {/* Decorative Glowing Radial Orbs — fixed brand colors, intentionally
          theme-independent since this whole panel is pre-login marketing. */}
      <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] bg-brand-cyan/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[25%] right-[15%] w-[400px] h-[400px] bg-brand-purple/10 blur-[120px] rounded-full pointer-events-none" />

      {/* 1. Header Area: Large Premium FinSightAI Logo */}
      <div className="z-10 flex items-center gap-3">
        <motion.div
          initial={{ rotate: -15, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] p-[2px]"
        >
          <div className="w-full h-full bg-[var(--bg-color)] rounded-[10px] flex items-center justify-center transition-colors duration-300">
            <Cpu className="w-5.5 h-5.5 text-[var(--primary-color)] animate-pulse" />
          </div>
        </motion.div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            FinSight <span className="text-[var(--primary-color)] font-black">AI</span>
          </h1>
          <p className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">
            Intelligent Financial Platform
          </p>
        </div>
      </div>

      {/* 2. Visual Center: Simulated Live AI Financial Portal Portal & Recharts */}
      <div className="relative z-10 my-10 flex-1 flex items-center justify-center">
        <GlassCard className="w-full max-w-[460px] border border-[var(--border-color)] shadow-glass-light hover:border-[var(--primary-color)]/20 transition-all p-5 relative">
          <div className="flex items-center justify-between mb-4 border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary-color)] animate-ping" />
              <h5 className="text-xs font-bold text-[var(--text-primary)] tracking-tight">Market Intelligence Terminal</h5>
            </div>
            <GlassBadge variant="cyan">AI Active</GlassBadge>
          </div>
          
          {/* Recharts chart component */}
          <div className="h-[180px] w-full mt-2">
            <FinancialChart />
          </div>

          <div className="flex items-center justify-between mt-3 text-[10px] text-[var(--text-secondary)]/60">
            <span>Updating Live in Real-time</span>
            <span className="flex items-center gap-1 font-semibold text-[var(--primary-color)]">
              <Sparkles className="w-3.5 h-3.5" /> 
              Alpha Engine 2.8
            </span>
          </div>
        </GlassCard>

        {/* --- FLOATING CARD 1: Net Worth Card --- */}
        <NetWorthCard />

        {/* --- FLOATING CARD 2: Stock Sentiment (Top Right) --- */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1 right-2 md:right-8 z-20"
        >
          <GlassCard className="p-4 shadow-glass max-w-[200px]">
            <div className="flex items-center gap-2 mb-1.5">
              <Activity className="w-4 h-4 text-[var(--primary-color)] animate-pulse" />
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-[var(--text-secondary)]/60">
                Sentiment Index
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-[var(--text-primary)]">78%</span>
              <span className="text-[9px] font-bold text-success uppercase tracking-wider">Bullish</span>
            </div>
            <div className="w-full bg-[var(--border-color)] h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-[var(--primary-color)] h-full rounded-full" style={{ width: '78%' }} />
            </div>
          </GlassCard>
        </motion.div>

        {/* --- FLOATING CARD 3: Financial Health Score (Bottom Left) --- */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-6 left-2 md:left-6 z-20"
        >
          <GlassCard className="p-4 shadow-glass flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
                <circle 
                  cx="24" 
                  cy="24" 
                  r="20" 
                  stroke="var(--primary-color)" 
                  strokeWidth="4" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - healthScore / 100)}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute text-xs font-bold text-[var(--text-primary)]">{healthScore}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/60 block">Health Score</span>
              <span className="text-xs font-bold text-[var(--text-primary)]">Credit Optimized</span>
            </div>
          </GlassCard>
        </motion.div>

        {/* --- FLOATING CARD 4: AI Expense Analytics (Bottom Right) --- */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute -bottom-10 right-2 md:right-8 z-20"
        >
          <GlassCard className="p-4 shadow-glass max-w-[190px]">
            <div className="flex items-center gap-2 mb-1.5">
              <Wallet className="w-4 h-4 text-[var(--primary-color)]" />
              <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Expense Analysis</span>
            </div>
            <p className="text-xs font-bold text-[var(--text-primary)] mb-1">Savings optimized</p>
            <div className="flex gap-1.5 mt-2">
              <div className="w-5 h-8 bg-brand-cyan/20 rounded-sm relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 bg-brand-cyan h-[80%] rounded-sm" />
              </div>
              <div className="w-5 h-8 bg-brand-purple/20 rounded-sm relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 bg-brand-purple h-[45%] rounded-sm" />
              </div>
              <div className="w-5 h-8 bg-[var(--surface-raised)] rounded-sm relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 bg-[var(--surface-muted)] h-[20%] rounded-sm" />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* 3. Footer Branding Area: Tagline and Highlights */}
      <div className="z-10 mt-auto pt-6 border-t border-[var(--border-color)]">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2 leading-snug">
          Your Personal AI-Powered <br />
          <span className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] bg-clip-text text-transparent">
            Financial Intelligence Assistant
          </span>
        </h2>
        
        {/* Core highlight pillars with beautiful subtle checklist icons */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {[
            { text: "AI Expense Analytics", icon: Wallet },
            { text: "Stock Sentiment Intelligence", icon: TrendingUp },
            { text: "Financial Health Score", icon: Activity },
            { text: "Credit Optimization", icon: Compass }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <item.icon className="w-4 h-4 text-[var(--primary-color)] shrink-0" />
              <span className="truncate">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
