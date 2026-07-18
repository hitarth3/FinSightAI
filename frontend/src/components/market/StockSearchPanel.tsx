import React, { useState, useEffect, useRef } from 'react';
import { stockService, StockData } from '../../services/stockService';
import { GlassInput } from '../ui/GlassInput';
import { GlassCard } from '../ui/GlassCard';
import { Search, Loader2, ArrowUpRight, ArrowDownRight, Globe } from 'lucide-react';

interface StockSearchPanelProps {
  onStockSelect: (symbol: string) => void;
}

export const StockSearchPanel: React.FC<StockSearchPanelProps> = ({ onStockSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const matching = await stockService.searchStocks(query);
        setResults(matching);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  // Click outside close
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, []);

  return (
    <div className="relative w-full max-w-lg" ref={dropdownRef}>
      <GlassInput
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search stocks by name or symbol (e.g. Reliance, TCS...)"
        icon={isSearching ? <Loader2 className="w-4.5 h-4.5 animate-spin text-[var(--primary-color)]" /> : <Search className="w-4.5 h-4.5" />}
        className="w-full mb-0 text-[var(--text-primary)] focus:outline-none"
      />

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-30 glass-panel rounded-2xl max-h-72 overflow-y-auto shadow-glass-large border border-[var(--border-color)]">
          <div className="p-2 space-y-1">
            {results.map((stock) => {
              return (
                <button
                  key={stock.symbol}
                  onClick={() => {
                    onStockSelect(stock.symbol);
                    setQuery('');
                    setResults([]);
                  }}
                  className="w-full text-left flex items-center justify-between p-3 rounded-xl hover:bg-[var(--surface-subtle)]  border border-transparent hover:border-[var(--border-color)] transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3 truncate max-w-[75%]">
                    <div className="p-1.5 rounded-lg shrink-0 bg-cyan-500/10 text-cyan-400">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-black text-[var(--text-primary)]">{stock.symbol}</div>
                      <div className="text-[9px] text-[var(--text-secondary)]/60 truncate">{stock.companyName}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                      {stock.exchange || 'NSE'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {query && results.length === 0 && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 z-30 glass-panel rounded-2xl p-4 text-center text-xs text-[var(--text-secondary)]/60 border border-[var(--border-color)]">
          No matching company or symbol found.
        </div>
      )}
    </div>
  );
};
export default StockSearchPanel;
