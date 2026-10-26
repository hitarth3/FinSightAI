import React, { useState, useEffect } from 'react';
import { stockService, StockData } from '../../services/stockService';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { useToasts } from '../../context/ToastContext';
import { useWatchlist, useTrackStock, useUntrackStock } from '../../hooks/useWatchlist';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Bookmark, 
  DollarSign, 
  Activity 
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  isOpen,
  onClose,
  symbol,
}) => {
  const toasts = useToasts();
  const [stock, setStock] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Watchlist query & mutations
  const { data: watchlist = [], isLoading: isWatchlistLoading } = useWatchlist();
  const trackStockMutation = useTrackStock();
  const untrackStockMutation = useUntrackStock();

  // Watchlist form state
  const [quantity, setQuantity] = useState('10');
  const [purchasePrice, setPurchasePrice] = useState('');

  const isSubmitting = trackStockMutation.isPending || untrackStockMutation.isPending;

  // Load stock details
  useEffect(() => {
    if (!isOpen || !symbol) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await stockService.getStockBySymbol(symbol);
        if (data) {
          setStock(data);
          setPurchasePrice(data.price.toString());
        }
      } catch (err) {
        toasts.error('Failed to load stock data', 'Unable to retrieve standard ticker variables.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, symbol]);

  if (!isOpen) return null;

  const matchedWatchlistStock = watchlist.find(
    (item) => item.symbol.toUpperCase() === symbol.toUpperCase()
  );

  const handleTrackStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stock) return;

    const qty = parseInt(quantity);
    const price = parseFloat(purchasePrice);

    if (isNaN(qty) || qty <= 0) {
      toasts.error('Invalid Quantity', 'Please enter a valid positive integer.');
      return;
    }
    if (isNaN(price) || price <= 0) {
      toasts.error('Invalid Price', 'Please enter a valid purchase price.');
      return;
    }

    trackStockMutation.mutate(
      {
        symbol: stock.symbol,
        companyName: stock.companyName,
        quantity: qty,
        price,
      },
      {
        onSuccess: () => {
          toasts.success(
            'Portfolio Updated',
            `${stock.symbol} is now actively tracked in your investments.`
          );
        },
        onError: (err: any) => {
          toasts.error('Tracking Failed', err.message || 'Unable to store portfolio record.');
        },
      }
    );
  };

  const handleUntrackStock = async (id: string) => {
    untrackStockMutation.mutate(id, {
      onSuccess: () => {
        toasts.success(
          'Stock Removed',
          `${symbol} was removed from your tracked holdings.`
        );
      },
      onError: () => {
        toasts.error('Untrack Failed', 'Unable to delete portfolio database reference.');
      },
    });
  };

  const isUp = stock ? stock.changePercent >= 0 : true;

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={stock ? `${stock.companyName} (${stock.symbol})` : 'Stock Details'}
      size="lg"
    >
      {isLoading || !stock ? (
        <div className="py-20 flex flex-col items-center justify-center text-xs text-[var(--text-secondary)]/50 gap-3">
          <Activity className="w-8 h-8 animate-pulse text-[var(--primary-color)]" />
          <span>Syncing with market feed...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Price Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-color)] gap-4">
            <div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                  ₹{stock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className={`text-base font-bold flex items-center ${isUp ? 'text-success' : 'text-error'}`}>
                  {isUp ? <TrendingUp className="w-4.5 h-4.5 mr-1" /> : <TrendingDown className="w-4.5 h-4.5 mr-1" />}
                  {isUp ? '+' : ''}{stock.change.toFixed(2)} ({isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                </span>
              </div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/40 mt-1">
                Last trading tick • Sector: {stock.sector}
              </p>
            </div>
            
            <div>
              {matchedWatchlistStock ? (
                <GlassBadge variant="success">Actively Tracked</GlassBadge>
              ) : (
                <GlassBadge variant="neutral">Not in Watchlist</GlassBadge>
              )}
            </div>
          </div>

          {/* Grid Layout: Chart & Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Chart Area */}
            <div className="lg:col-span-3 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">
                Today's Trading Session
              </span>
              <div className="w-full h-[220px] bg-[var(--surface-muted)] rounded-2xl p-4 border border-[var(--border-color)]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stock.chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="detailColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isUp ? '#22C55E' : '#EF4444'} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={isUp ? '#22C55E' : '#EF4444'} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      stroke="var(--chart-axis)"
                      tick={{ fill: 'var(--chart-axis)', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--chart-axis)"
                      tick={{ fill: 'var(--chart-axis)', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      domain={['dataMin - 10', 'dataMax + 10']}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--chart-tooltip-bg)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid var(--chart-tooltip-border)',
                        borderRadius: '8px',
                        fontSize: '10px',
                        color: 'var(--chart-tooltip-text)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={isUp ? '#22C55E' : '#EF4444'}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#detailColor)"
                      name="Price"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Core Stats Sheet */}
            <div className="lg:col-span-2 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">
                Key Stock Statistics
              </span>
              <div className="grid grid-cols-2 gap-3.5 p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-color)] text-xs">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 block">Open</span>
                  <span className="font-bold text-[var(--text-primary)]">₹{stock.open.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 block">Volume</span>
                  <span className="font-bold text-[var(--text-primary)]">{(stock.volume / 100000).toFixed(1)} Lakhs</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 block">Daily High</span>
                  <span className="font-bold text-success">₹{stock.high.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 block">Daily Low</span>
                  <span className="font-bold text-error">₹{stock.low.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 block">Market Cap</span>
                  <span className="font-bold text-[var(--text-primary)]">{stock.marketCap}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 block">P/E Ratio</span>
                  <span className="font-bold text-[var(--text-primary)]">{stock.peRatio}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 block">52W High</span>
                  <span className="font-bold text-[var(--text-primary)]">₹{stock.high52Week.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 block">52W Low</span>
                  <span className="font-bold text-[var(--text-primary)]">₹{stock.low52Week.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio Watchlist Tracker Module */}
          <div className="border-t border-[var(--border-color)] pt-5">
            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Bookmark className="w-4.5 h-4.5 text-[var(--primary-color)]" /> Track in Investment Portfolio
            </h4>

            {isWatchlistLoading ? (
              <div className="py-4 text-center text-xs text-[var(--text-secondary)]/40 animate-pulse">
                Querying database holdings...
              </div>
            ) : matchedWatchlistStock ? (
              /* Already Tracked: Show summary and deletion trigger */
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-success/5 border border-success/15 gap-4">
                <div className="text-xs space-y-1 text-left w-full">
                  <div className="text-[var(--text-primary)] font-bold">
                    Currently tracking <span className="text-success">{matchedWatchlistStock.quantity} shares</span>
                  </div>
                  <div className="text-[var(--text-secondary)]/80">
                    Purchase Price: <span className="font-bold">₹{matchedWatchlistStock.purchase_price.toLocaleString()}</span> • Track Date: {matchedWatchlistStock.purchase_date}
                  </div>
                </div>

                <GlassButton
                  variant="outline"
                  className="py-2 px-4 text-xs border-error/30 hover:bg-error/10 text-error shrink-0"
                  isLoading={isSubmitting}
                  onClick={() => handleUntrackStock(matchedWatchlistStock.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Stop Tracking</span>
                </GlassButton>
              </div>
            ) : (
              /* Not Tracked: Show tracking form */
              <form onSubmit={handleTrackStock} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <GlassInput
                  label="Track Quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mb-0"
                  required
                />
                
                <GlassInput
                  label="Purchase Price (₹)"
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="mb-0"
                  required
                />

                <GlassButton
                  type="submit"
                  className="py-3.5 text-xs font-bold"
                  isLoading={isSubmitting}
                >
                  <Plus className="w-4 h-4 animate-bounce" />
                  <span>Add to Watchlist</span>
                </GlassButton>
              </form>
            )}
          </div>
        </div>
      )}
    </GlassModal>
  );
};
export default StockDetailModal;
