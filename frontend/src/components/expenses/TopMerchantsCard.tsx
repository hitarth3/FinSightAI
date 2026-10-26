import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenseService';
import { GlassCard } from '../ui/GlassCard';
import { ErrorState } from '../ui/ErrorState';
import { ShoppingBag, TrendingUp } from 'lucide-react';

export const TopMerchantsCard: React.FC = () => {
  const { data: merchants, isLoading, error } = useQuery({
    queryKey: ['topMerchants'],
    queryFn: expenseService.getTopMerchants,
  });

  if (isLoading) {
    return (
      <GlassCard className="flex flex-col gap-4 animate-pulse">
        <div className="h-4 bg-[var(--surface-raised)] rounded w-1/3"></div>
        <div className="space-y-3">
          <div className="h-8 bg-[var(--surface-subtle)] rounded"></div>
          <div className="h-8 bg-[var(--surface-subtle)] rounded"></div>
          <div className="h-8 bg-[var(--surface-subtle)] rounded"></div>
        </div>
      </GlassCard>
    );
  }

  if (error || !merchants) {
    return <ErrorState title="Top Merchants" message="Failed to load top merchants." />;
  }

  return (
    <GlassCard className="flex flex-col h-full justify-between" glow>
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-color)]">
          <h4 className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]/60 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-[var(--primary-color)]" /> Top Merchants
          </h4>
          <TrendingUp className="w-3.5 h-3.5 text-success" />
        </div>

        {merchants.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)]/50 py-8 text-center">No transaction records found.</p>
        ) : (
          <div className="space-y-3.5">
            {merchants.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs border-b border-white/[0.02] pb-2 last:border-0 last:pb-0">
                <div className="flex flex-col">
                  <span className="font-bold text-[var(--text-primary)]">{item.merchant}</span>
                  <span className="text-[10px] text-[var(--text-secondary)]/50">{item.count} transactions</span>
                </div>
                <span className="font-extrabold text-[var(--text-primary)]">₹{item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
export default TopMerchantsCard;
