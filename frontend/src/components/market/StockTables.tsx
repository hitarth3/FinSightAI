import React from 'react';
import { StockData } from '../../services/stockService';
import { GlassCard } from '../ui/GlassCard';
import { TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StockTablesProps {
  gainers: StockData[];
  losers: StockData[];
  mostActive: StockData[];
  isLoading: boolean;
  onStockClick: (symbol: string) => void;
}

export const StockTables: React.FC<StockTablesProps> = ({
  gainers,
  losers,
  mostActive,
  isLoading,
  onStockClick,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((panel) => (
          <GlassCard key={panel} className="p-6 animate-pulse">
            <div className="w-32 h-4 bg-[var(--surface-raised)] rounded mb-4" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="w-16 h-3.5 bg-[var(--surface-raised)] rounded" />
                    <div className="w-24 h-2 bg-[var(--surface-raised)] rounded" />
                  </div>
                  <div className="w-12 h-4 bg-[var(--surface-raised)] rounded" />
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  const renderStockRow = (stock: StockData, type: 'gainer' | 'loser' | 'active') => {
    const isUp = stock.changePercent >= 0;
    
    return (
      <div
        key={stock.symbol}
        onClick={() => onStockClick(stock.symbol)}
        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--surface-subtle)]  border border-transparent hover:border-[var(--border-color)] transition-all duration-200 cursor-pointer group"
      >
        <div className="flex items-center gap-3 truncate max-w-[65%]">
          <div className={`p-2 rounded-lg shrink-0 ${
            type === 'gainer' ? 'bg-success/10 text-success' :
            type === 'loser' ? 'bg-error/10 text-error' : 'bg-cyan-500/10 text-cyan-400'
          }`}>
            {type === 'gainer' ? <ArrowUpRight className="w-4 h-4" /> :
             type === 'loser' ? <ArrowDownRight className="w-4 h-4" /> :
             <Activity className="w-4 h-4" />}
          </div>
          <div className="truncate">
            <div className="text-xs font-black text-[var(--text-primary)] group-hover:text-[var(--primary-color)] transition-colors">
              {stock.symbol}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]/60 truncate">
              {stock.companyName}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs font-bold text-[var(--text-primary)]">
            ₹{stock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          {type === 'active' ? (
            <div className="text-[9px] font-semibold text-[var(--text-secondary)]/70">
              Vol: {(stock.volume / 100000).toFixed(1)}L
            </div>
          ) : (
            <div className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${isUp ? 'text-success' : 'text-error'}`}>
              {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Top Gainers */}
      <GlassCard className="flex flex-col justify-between hover:border-success/20 transition-all duration-300">
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-success mb-4 flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5" /> Top Gainers
          </h4>
          <div className="space-y-1">
            {gainers.map(stock => renderStockRow(stock, 'gainer'))}
          </div>
        </div>
      </GlassCard>

      {/* Top Losers */}
      <GlassCard className="flex flex-col justify-between hover:border-error/20 transition-all duration-300">
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-error mb-4 flex items-center gap-2">
            <TrendingDown className="w-4.5 h-4.5" /> Top Losers
          </h4>
          <div className="space-y-1">
            {losers.map(stock => renderStockRow(stock, 'loser'))}
          </div>
        </div>
      </GlassCard>

      {/* Most Active */}
      <GlassCard className="flex flex-col justify-between hover:border-cyan-500/20 transition-all duration-300">
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-2">
            <Activity className="w-4.5 h-4.5" /> Most Active
          </h4>
          <div className="space-y-1">
            {mostActive.map(stock => renderStockRow(stock, 'active'))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
export default StockTables;
