import React, { useState, useEffect } from 'react';
import { stockService, MarketIndex, StockData } from '../../services/stockService';
import { stockAnalysisService, StockAnalysis } from '../../services/stockAnalysisService';
import { IndicesSection } from './IndicesSection';
import { MoversWidget } from './MoversWidget';
import { StockTables } from './StockTables';
import { StockSearchPanel } from './StockSearchPanel';
import { StockDetailModal } from './StockDetailModal';
import { StockAnalysisPanel } from './StockAnalysisPanel';
import { MarketNewsFeed } from './MarketNewsFeed';
import { GlassButton } from '../ui/GlassButton';
import { GlassCard } from '../ui/GlassCard';
import { useWatchlist } from '../../hooks/useWatchlist';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Bookmark,
  Loader2
} from 'lucide-react';

interface MarketDashboardProps {
  onBack: () => void;
}

export const MarketDashboard: React.FC<MarketDashboardProps> = ({ onBack }) => {
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [newsRefreshTrigger, setNewsRefreshTrigger] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [gainers, setGainers] = useState<StockData[]>([]);
  const [losers, setLosers] = useState<StockData[]>([]);
  const [mostActive, setMostActive] = useState<StockData[]>([]);
  const [movers, setMovers] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stock detail modal trigger
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(null);

  // AI Stock Analysis states
  const [activeAnalysisSymbol, setActiveAnalysisSymbol] = useState<string | null>(null);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [rankings, setRankings] = useState<StockAnalysis[]>([]);
  const [sortBy, setSortBy] = useState<'strength' | 'confidence' | 'sentiment'>('strength');

  // Watchlist custom hook
  const { data: watchlist = [], isLoading: isWatchlistLoading } = useWatchlist();
  const queryClient = useQueryClient();

  const loadDashboardData = async (forceError = false, forceRefresh = false) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const promises: Promise<any>[] = [
        stockService.getIndices(forceError, forceRefresh),
        stockService.getMarketMoversFull(forceRefresh),
      ];

      // If watchlist is available and we're force refreshing, batch fetch the watchlist stocks with forceRefresh to sync backend cache
      if (forceRefresh && watchlist && watchlist.length > 0) {
        promises.push(
          stockService.getStockQuotesBatch(watchlist.map(item => item.symbol), true)
        );
      }

      const [indData, fullMovers] = await Promise.all(promises);

      setIndices(indData);
      setMovers({
        biggestGainerSector: fullMovers.biggestGainerSector,
        biggestLosingSector: fullMovers.biggestLosingSector,
        advancing: fullMovers.advancing,
        declining: fullMovers.declining,
      });
      setGainers(fullMovers.gainers || []);
      setLosers(fullMovers.losers || []);
      setMostActive(fullMovers.mostActive || []);
      setLastUpdated(stockService.getLastUpdatedText());

      if (forceRefresh) {
        // Invalidate React Query's cache so all watchlist metrics pull the updated backend cache
        await queryClient.invalidateQueries({ queryKey: ['portfolioMetrics'] });
      }
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Unable to sync with Indian Exchange feed.');
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAnalyzeAll = async () => {
    if (watchlist.length === 0) return;
    setIsAnalyzingAll(true);
    try {
      const results = [];
      for (const item of watchlist) {
        try {
          const data = await stockAnalysisService.getAnalysis(item.symbol, false);
          results.push(data);
        } catch (e) {
          console.error('Failed to analyze', item.symbol, e);
          results.push(null);
        }
      }
      const valid = results.filter((r): r is StockAnalysis => r !== null);
      setRankings(valid);
    } catch (err) {
      console.error('Analyze All failed', err);
    } finally {
      setIsAnalyzingAll(false);
    }
  };

  const getSortedRankings = () => {
    return [...rankings].sort((a, b) => {
      if (sortBy === 'strength') return b.strengthScore - a.strengthScore;
      if (sortBy === 'confidence') return b.confidence - a.confidence;
      if (sortBy === 'sentiment') return a.sentiment.localeCompare(b.sentiment);
      return 0;
    });
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleManualRefresh = () => {
    setNewsRefreshTrigger(prev => prev + 1);
    loadDashboardData(false, true);
  };

  const handleStockClick = (symbol: string) => {
    setSelectedStockSymbol(symbol);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel with Back Controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-color)] gap-4">
        <div className="flex items-center gap-3">
          <GlassButton 
            variant="outline" 
            onClick={onBack}
            className="py-1.5 px-3 text-xs border-[var(--border-color)] hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Overview</span>
          </GlassButton>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
              Market Overview Dashboard
            </h2>
            <p className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/50">
              Indian Exchange Ticker & Technical Insights
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]/70 font-semibold bg-[var(--surface-muted)] border border-[var(--border-color)] px-2.5 py-1.5 rounded-lg shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated: {lastUpdated || 'Syncing...'}</span>
          </div>

        </div>
      </div>

      {/* Global Stock Search bar & manual trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <StockSearchPanel onStockSelect={handleStockClick} />

        <GlassButton
          variant="secondary"
          onClick={handleManualRefresh}
          className="text-xs py-2.5 px-4 md:w-auto w-full border-[var(--border-color)]"
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Market Feed'}</span>
        </GlassButton>
      </div>

      {error ? (
        /* Global Error State */
        <GlassCard className="p-12 text-center border-red-500/20 bg-red-500/5">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3 animate-bounce" />
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">Feed Connection Failure</h4>
          <p className="text-xs text-[var(--text-secondary)]/85 mb-4 max-w-md mx-auto">
            {error} Please verify your terminal network adapters or retry the API handshake below.
          </p>
          <GlassButton variant="outline" onClick={() => loadDashboardData()} className="mx-auto text-xs py-2 px-5">
            Retry Connection Handshake
          </GlassButton>
        </GlassCard>
      ) : (
        <>
          {/* Indices Section */}
          <IndicesSection indices={indices} isLoading={isLoading} />

          {/* Core Grid: movers & leaderboards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <StockTables 
                gainers={gainers} 
                losers={losers} 
                mostActive={mostActive} 
                isLoading={isLoading} 
                onStockClick={handleStockClick} 
              />
            </div>
            <div className="lg:col-span-1">
              <MoversWidget movers={movers} isLoading={isLoading} />
            </div>
          </div>

          {/* Watchlist & AI Stock Intelligence Section */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Watchlist Widget */}
            <div className="lg:col-span-1 space-y-6">
              <GlassCard className="hover:border-[var(--primary-color)]/20 transition-all duration-300">
                <div className="flex justify-between items-center mb-4 border-b border-[var(--border-color)] pb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-[var(--primary-color)]" /> Your Watchlist
                  </h4>
                  {watchlist.length > 0 && (
                    <GlassButton
                      variant="outline"
                      className="py-1 px-2.5 text-[8px] tracking-wide font-black"
                      onClick={handleAnalyzeAll}
                      disabled={isAnalyzingAll}
                    >
                      {isAnalyzingAll ? (
                        <>
                          <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-2.5 h-2.5 mr-1" />
                          Analyze All
                        </>
                      )}
                    </GlassButton>
                  )}
                </div>

                {isWatchlistLoading ? (
                  <div className="py-8 text-center text-xs text-[var(--text-secondary)]/40 animate-pulse">
                    Loading watchlist...
                  </div>
                ) : watchlist.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-secondary)]/50">
                    No tracked shares in watchlist. 
                    <p className="text-[10px] text-[var(--text-secondary)]/40 mt-1">
                      Search and track shares to display them here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {watchlist.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 ${
                          activeAnalysisSymbol === item.symbol
                            ? 'bg-[var(--primary-color)]/5 border-[var(--primary-color)]/30'
                            : 'bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] border-transparent'
                        }`}
                      >
                        <div 
                          onClick={() => handleStockClick(item.symbol)}
                          className="cursor-pointer truncate max-w-[55%] text-left"
                        >
                          <div className="text-xs font-black text-[var(--text-primary)] hover:text-[var(--primary-color)] transition-colors">
                            {item.symbol}
                          </div>
                          <div className="text-[9px] text-[var(--text-secondary)]/50 truncate">
                            {item.company_name}
                          </div>
                        </div>

                        <GlassButton
                          variant={activeAnalysisSymbol === item.symbol ? 'primary' : 'outline'}
                          className="py-1 px-2 text-[9px] font-bold"
                          onClick={() => setActiveAnalysisSymbol(item.symbol)}
                        >
                          <span>AI Report</span>
                        </GlassButton>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* AI Rankings */}
              {rankings.length > 0 && (
                <GlassCard className="border-purple-500/25">
                  <div className="flex justify-between items-center mb-3 border-b border-[var(--border-color)] pb-2">
                    <h5 className="text-[10px] uppercase font-extrabold tracking-widest text-purple-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI Rankings
                    </h5>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-black/40 text-[9px] font-bold border border-[var(--border-color)] rounded px-1.5 py-0.5 text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="strength">Score</option>
                      <option value="confidence">Confidence</option>
                      <option value="sentiment">Sentiment</option>
                    </select>
                  </div>

                  <div className="space-y-2 text-xs max-h-60 overflow-y-auto pr-1">
                    {getSortedRankings().map((r, idx) => (
                      <button
                        key={r.symbol}
                        onClick={() => setActiveAnalysisSymbol(r.symbol)}
                        className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] border border-transparent hover:border-[var(--border-color)] transition-all duration-150"
                      >
                        <span className="font-bold text-[var(--text-secondary)]/70 w-5">
                          {idx + 1}.
                        </span>
                        <span className="font-black text-[var(--text-primary)] flex-1">
                          {r.symbol}
                        </span>
                        <span className="font-bold text-success">
                          {sortBy === 'strength' && `${r.strengthScore}`}
                          {sortBy === 'confidence' && `${r.confidence}%`}
                          {sortBy === 'sentiment' && `${r.sentiment}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>

            {/* AI Analysis Report Panel */}
            <div className="lg:col-span-3">
              <StockAnalysisPanel symbol={activeAnalysisSymbol} />
            </div>
          </div>

          {/* Lower Grid: News feed */}
          <div className="w-full">
            <h3 className="text-base font-extrabold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--primary-color)]" /> Latest Financial & Corporate News
            </h3>
            <MarketNewsFeed onStockClick={handleStockClick} refreshTrigger={newsRefreshTrigger} />
          </div>
        </>
      )}

      {/* Stock Detailed View Modal */}
      {selectedStockSymbol && (
        <StockDetailModal
          isOpen={selectedStockSymbol !== null}
          onClose={() => setSelectedStockSymbol(null)}
          symbol={selectedStockSymbol}
        />
      )}
    </div>
  );
};
export default MarketDashboard;
