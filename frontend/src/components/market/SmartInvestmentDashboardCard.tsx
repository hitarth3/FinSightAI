import React from 'react';
import { useWatchlist } from '../../hooks/useWatchlist';
import { GlassCard } from '../ui/GlassCard';
import { GlassBadge } from '../ui/GlassBadge';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { TrendingUp, FolderHeart } from 'lucide-react';

interface SmartInvestmentDashboardCardProps {
  onClick: () => void;
}

export const SmartInvestmentDashboardCard: React.FC<SmartInvestmentDashboardCardProps> = ({ onClick }) => {
  const { data: watchlist, isLoading, isError } = useWatchlist();

  if (isLoading) {
    return <LoadingSkeleton minHeight={220} className="min-h-[220px]" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Smart Investments"
        message="Unable to retrieve portfolio structure. Portfolio sync failed."
      />
    );
  }

  if (!watchlist || watchlist.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No Assets Tracked"
        description="Your stock intelligence dashboard is active. Start tracking assets to view portfolio composition."
        action={{ label: 'Start Tracking', onClick }}
      />
    );
  }

  // Calculate portfolio composition percentages by cost basis
  const totalCost = watchlist.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0);
  
  // Sort watchlist by cost allocation
  const sortedHoldings = [...watchlist]
    .filter(item => item.quantity > 0)
    .sort((a, b) => (b.quantity * b.purchase_price) - (a.quantity * a.purchase_price));

  return (
    <GlassCard 
      onClick={onClick}
      className="flex flex-col justify-between h-full p-5 cursor-pointer hover:border-[var(--primary-color)]/25 hover:shadow-[0_0_15px_rgba(0,212,255,0.08)] transition-all duration-300 min-h-[220px] select-none group"
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-black tracking-widest text-[var(--text-secondary)]/60 group-hover:text-[var(--primary-color)] transition-colors">
              Smart Investments
            </span>
            <GlassBadge variant="neutral">
              Structure: Equity
            </GlassBadge>
          </div>
          <div className="p-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-color)] group-hover:border-[var(--primary-color)]/30 group-hover:bg-[var(--primary-color)]/5 transition-all duration-300 text-secondary">
            <FolderHeart className="w-4.5 h-4.5 text-[var(--primary-color)]" />
          </div>
        </div>

        {/* Allocation Visualization */}
        {totalCost > 0 && sortedHoldings.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]/50 font-bold">
                Asset Allocation
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[var(--primary-color)] font-bold">
                {sortedHoldings.length} Holdings
              </span>
            </div>
            <div className="h-2 w-full bg-[var(--surface-subtle)] rounded-full overflow-hidden flex">
              {sortedHoldings.slice(0, 5).map((item, idx) => {
                const pct = ((item.quantity * item.purchase_price) / totalCost) * 100;
                const colors = [
                  'bg-[var(--primary-color)]',
                  'bg-[var(--secondary-color)]',
                  'bg-emerald-500',
                  'bg-yellow-500',
                  'bg-purple-500'
                ];
                return (
                  <div
                    key={item.id}
                    className={`${colors[idx % colors.length]} h-full`}
                    style={{ width: `${pct}%` }}
                    title={`${item.symbol}: ${pct.toFixed(1)}%`}
                  />
                );
              })}
              {sortedHoldings.length > 5 && (
                <div className="bg-[var(--surface-raised)] h-full flex-1" title="Others" />
              )}
            </div>
          </div>
        )}

        {/* Holdings List */}
        <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
          {sortedHoldings.length === 0 ? (
            <p className="text-[10px] text-[var(--text-secondary)]/50 italic text-left">No active holdings (watchlist only).</p>
          ) : (
            sortedHoldings.slice(0, 3).map((item, idx) => {
              const pct = totalCost > 0 ? ((item.quantity * item.purchase_price) / totalCost) * 100 : 0;
              const markerColors = [
                'border-[var(--primary-color)]',
                'border-[var(--secondary-color)]',
                'border-emerald-500',
                'border-yellow-500',
                'border-purple-500'
              ];
              return (
                <div key={item.id} className="flex justify-between items-center text-xs py-1 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-left">
                    <span className={`w-2 h-2 rounded-full border-2 ${markerColors[idx % markerColors.length]}`} />
                    <div className="flex flex-col">
                      <span className="font-bold text-[var(--text-primary)]">{item.symbol}</span>
                      <span className="text-[8px] text-[var(--text-secondary)]/50 truncate max-w-[120px]">{item.company_name}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="font-semibold text-[var(--text-primary)]">{item.quantity} Shares</span>
                    <span className="text-[8px] font-bold text-[var(--text-secondary)]/60">{pct.toFixed(1)}% of Portfolio</span>
                  </div>
                </div>
              );
            })
          )}
          {sortedHoldings.length > 3 && (
            <p className="text-[9px] text-[var(--text-secondary)]/50 italic text-left mt-1.5">
              + {sortedHoldings.length - 3} more holdings...
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-[var(--border-color)] text-[9px] uppercase tracking-wider text-[var(--text-secondary)]/40 font-semibold text-left">
        Focus: Portfolio Composition
      </div>
    </GlassCard>
  );
};
