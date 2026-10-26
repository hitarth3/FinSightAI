import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Sparkles, TrendingUp, TrendingDown, Layers } from 'lucide-react';

interface MoversWidgetProps {
  movers: {
    biggestGainerSector: string;
    biggestLosingSector: string;
    advancing: number;
    declining: number;
  } | null;
  isLoading: boolean;
}

export const MoversWidget: React.FC<MoversWidgetProps> = ({ movers, isLoading }) => {
  if (isLoading || !movers) {
    return (
      <GlassCard className="p-6 h-full flex flex-col justify-between animate-pulse">
        <div className="w-32 h-4 bg-[var(--surface-raised)] rounded mb-4" />
        <div className="space-y-3">
          <div className="w-full h-8 bg-[var(--surface-raised)] rounded" />
          <div className="w-full h-8 bg-[var(--surface-raised)] rounded" />
        </div>
      </GlassCard>
    );
  }

  const total = movers.advancing + movers.declining;
  const advancePercent = total > 0 ? (movers.advancing / total) * 100 : 50;

  return (
    <GlassCard className="p-6 h-full flex flex-col justify-between hover:border-[var(--primary-color)]/20 transition-all duration-300">
      <div>
        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--primary-color)]" /> Market Movers & Breath
        </h4>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="p-3.5 rounded-xl bg-success/5 border border-success/10">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 block mb-1">
              Top Gainer Sector
            </span>
            <span className="text-xs font-black text-success flex items-center gap-1.5 truncate">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" /> {movers.biggestGainerSector}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-error/5 border border-error/10">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 block mb-1">
              Top Loser Sector
            </span>
            <span className="text-xs font-black text-error flex items-center gap-1.5 truncate">
              <TrendingDown className="w-3.5 h-3.5 shrink-0" /> {movers.biggestLosingSector}
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-secondary)] mb-2">
          <span className="text-success uppercase tracking-wider flex items-center gap-1">
            Advancing ({movers.advancing})
          </span>
          <span className="text-error uppercase tracking-wider flex items-center gap-1">
            Declining ({movers.declining})
          </span>
        </div>

        {/* Custom Breadth Slider */}
        <div className="w-full h-2.5 bg-error/20 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-success transition-all duration-500 ease-out" 
            style={{ width: `${advancePercent}%` }} 
          />
        </div>

        <div className="mt-3 flex items-center gap-1 text-[9px] text-[var(--text-secondary)]/60 justify-center">
          <Sparkles className="w-3 h-3 text-[var(--primary-color)] animate-pulse" />
          <span>Market Sentiment is {advancePercent > 60 ? 'Highly Bullish' : advancePercent < 40 ? 'Highly Bearish' : 'Neutral'}</span>
        </div>
      </div>
    </GlassCard>
  );
};
export default MoversWidget;
