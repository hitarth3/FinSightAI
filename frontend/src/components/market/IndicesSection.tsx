import React from 'react';
import { MarketIndex } from '../../services/stockService';
import { GlassCard } from '../ui/GlassCard';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface IndicesSectionProps {
  indices: MarketIndex[];
  isLoading: boolean;
}

export const IndicesSection: React.FC<IndicesSectionProps> = ({ indices, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <GlassCard key={i} className="py-4 px-5 flex flex-col justify-between h-24 animate-pulse">
            <div className="w-24 h-3 bg-[var(--surface-raised)] rounded mb-2" />
            <div className="w-16 h-5 bg-[var(--surface-raised)] rounded" />
          </GlassCard>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {indices.map((idx) => {
        const isUp = idx.trend === 'up';
        return (
          <GlassCard 
            key={idx.name} 
            className="py-4 px-5 flex flex-col justify-between h-24 hover:border-[var(--primary-color)]/20 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">
                {idx.name}
              </span>
              <div className={`p-1 rounded ${isUp ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              </div>
            </div>

            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg font-black text-[var(--text-primary)] tracking-tight">
                {idx.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-bold ${isUp ? 'text-success' : 'text-error'}`}>
                {isUp ? '+' : ''}{idx.change.toFixed(2)} ({isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%)
              </span>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};
export default IndicesSection;
