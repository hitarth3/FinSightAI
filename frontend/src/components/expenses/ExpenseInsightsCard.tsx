import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenseService';
import { GlassCard } from '../ui/GlassCard';
import { ErrorState } from '../ui/ErrorState';
import { Brain, AlertCircle, TrendingUp, TrendingDown, RefreshCw, Zap } from 'lucide-react';

export const ExpenseInsightsCard: React.FC = () => {
  const { data: insights, isLoading, error } = useQuery({
    queryKey: ['expenseInsights'],
    queryFn: expenseService.getInsights,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'SPENDING_INCREASE':
        return <TrendingUp className="w-4 h-4 text-red-400 shrink-0" />;
      case 'SPENDING_DECREASE':
        return <TrendingDown className="w-4 h-4 text-success shrink-0" />;
      case 'CATEGORY_ALERT':
        return <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />;
      case 'RECURRING_EXPENSE':
        return <RefreshCw className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'UNUSUAL_EXPENSE':
        return <Zap className="w-4 h-4 text-orange-400 shrink-0" />;
      default:
        return <Brain className="w-4 h-4 text-[var(--primary-color)] shrink-0" />;
    }
  };

  if (isLoading) {
    return (
      <GlassCard className="flex flex-col gap-4 animate-pulse">
        <div className="h-4 bg-[var(--surface-raised)] rounded w-1/3"></div>
        <div className="space-y-3">
          <div className="h-8 bg-[var(--surface-subtle)] rounded"></div>
          <div className="h-8 bg-[var(--surface-subtle)] rounded"></div>
        </div>
      </GlassCard>
    );
  }

  if (error || !insights) {
    return <ErrorState title="AI Expense Insights" message="Failed to load expense insights." />;
  }

  return (
    <GlassCard className="flex flex-col h-full justify-between" glow>
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-color)]">
          <h4 className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]/60 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-[var(--primary-color)]" /> AI Expense Insights
          </h4>
        </div>

        <div className="space-y-3.5">
          {insights.map((item: any, idx: number) => (
            <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-color)] hover:border-[var(--primary-color)]/20 transition-all duration-300">
              <div className="p-1.5 rounded-lg bg-[var(--surface-subtle)]">
                {getIcon(item.type)}
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-0.5">
                {item.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};
export default ExpenseInsightsCard;
