import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { creditCardService } from '../../services/creditCardService';
import { GlassCard } from '../ui/GlassCard';
import { ErrorState } from '../ui/ErrorState';
import { Brain, AlertCircle, CheckCircle2, Info, AlertTriangle, Sparkles } from 'lucide-react';

export const InsightsSection: React.FC = () => {
  const { data: insights, isLoading, error } = useQuery({
    queryKey: ['creditInsights'],
    queryFn: creditCardService.getInsights,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'hover:border-red-500/30 border-red-500/10 bg-red-500/[0.02]';
      case 'warning':
        return 'hover:border-yellow-500/30 border-yellow-500/10 bg-yellow-500/[0.02]';
      case 'success':
        return 'hover:border-emerald-500/30 border-emerald-500/10 bg-emerald-500/[0.02]';
      case 'info':
      default:
        return 'hover:border-blue-500/30 border-blue-500/10 bg-blue-500/[0.02]';
    }
  };

  if (isLoading) {
    return (
      <GlassCard className="flex flex-col gap-4 animate-pulse h-full">
        <div className="h-4 bg-[var(--surface-raised)] rounded w-1/3"></div>
        <div className="space-y-3">
          <div className="h-10 bg-[var(--surface-subtle)] rounded"></div>
          <div className="h-10 bg-[var(--surface-subtle)] rounded"></div>
          <div className="h-10 bg-[var(--surface-subtle)] rounded"></div>
        </div>
      </GlassCard>
    );
  }

  if (error || !insights) {
    return <ErrorState title="Insights Unavailable" message="Failed to load optimization insights." />;
  }

  return (
    <GlassCard className="flex flex-col h-full justify-between" glow>
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-color)]">
          <h4 className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]/60 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-[var(--primary-color)]" /> Credit Insights & Optimization
          </h4>
          <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-[var(--primary-color)] font-mono">
            <Sparkles className="w-2.5 h-2.5" /> AI Engine Active
          </span>
        </div>

        <div className="space-y-3.5">
          {insights.length === 0 ? (
            <div className="text-center p-8 text-xs text-[var(--text-secondary)]/40">
              No recommendations generated. Add a credit card to initialize analyzer.
            </div>
          ) : (
            insights.map((item, idx) => (
              <div 
                key={idx} 
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 ${getBorderColor(item.type)}`}
              >
                <div className="p-1.5 rounded-lg bg-[var(--surface-subtle)] shrink-0">
                  {getIcon(item.type)}
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-0.5 font-medium">
                  {item.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </GlassCard>
  );
};
export default InsightsSection;
