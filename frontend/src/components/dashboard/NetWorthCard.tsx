import React, { useEffect, useState } from 'react';
import { TrendingUp, Landmark } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

export const NetWorthCard: React.FC = () => {
  const [amount, setAmount] = useState(0.0);

  useEffect(() => {
    // Elegant number rolling animation
    const target = 12.4;
    const duration = 1500; // 1.5s
    const stepTime = 30;
    const steps = duration / stepTime;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAmount(target);
        clearInterval(timer);
      } else {
        setAmount(Number(current.toFixed(1)));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  return (
    <GlassCard 
      className="max-w-[240px] absolute top-12 left-10 md:left-14 shadow-glass z-20 hover:border-[var(--primary-color)]/30 transition-all select-none animate-float"
      glow
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-[var(--accent-glow)] border border-[var(--primary-color)]/20 text-[var(--primary-color)]">
          <Landmark className="w-4 h-4" />
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/70">
          Net Worth
        </span>
      </div>

      <div className="mb-2">
        <h4 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-baseline">
          ₹{amount.toFixed(1)}L
        </h4>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5 text-xs text-success font-semibold">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+8.2%</span>
        </div>
        <span className="text-[9px] text-[var(--text-secondary)]/50 font-medium">
          This Month
        </span>
      </div>
    </GlassCard>
  );
};
