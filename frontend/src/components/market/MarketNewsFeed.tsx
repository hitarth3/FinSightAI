import React, { useState, useEffect } from 'react';
import { stockService, NewsArticle } from '../../services/stockService';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassInput } from '../ui/GlassInput';
import { GlassModal } from '../ui/GlassModal';
import { 
  RefreshCw, 
  Calendar, 
  User, 
  Search, 
  BookOpen, 
  ExternalLink, 
  FileText 
} from 'lucide-react';

interface MarketNewsFeedProps {
  onStockClick: (symbol: string) => void;
  refreshTrigger?: number;
}

const CATEGORIES = [
  'Market News',
  'Company News',
  'Earnings Results',
  'IPO News',
  'RBI News',
  'SEBI News',
  'Global Market News',
];

export const MarketNewsFeed: React.FC<MarketNewsFeedProps> = ({ onStockClick, refreshTrigger }) => {
  const [activeCategory, setActiveCategory] = useState('Market News');
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [lastSynced, setLastSynced] = useState<string>('');

  // Fetch news articles
  const fetchNews = async (pageNum: number, isRefresh = false) => {
    if (pageNum === 1) setIsLoading(true);
    try {
      const result = await stockService.getNewsFeed(activeCategory, query, pageNum);
      if (isRefresh || pageNum === 1) {
        setArticles(result.articles);
      } else {
        setArticles(prev => [...prev, ...result.articles]);
      }
      setHasMore(result.hasMore);
      setPage(pageNum);
      setLastSynced(new Date().toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    } catch (err) {
      console.error('Failed to fetch news', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews(1);
  }, [activeCategory]);

  // Handle Search Input Submission/Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchNews(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNews(1, true);
  };

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      handleRefresh();
    }
  }, [refreshTrigger]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchNews(page + 1);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--text-secondary)]">Illustrative articles for exploring the interface. Headlines and dates are not a current news source.</p>
      {/* Search & Refresh Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category horizontal scrolling bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full md:max-w-[70%]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all duration-300 ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white border-transparent shadow-glow-accent'
                  : 'bg-[var(--surface-muted)] hover:bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border-color)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search bar & Refresh */}
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          {lastSynced && (
            <span className="text-[10px] font-semibold text-[var(--text-secondary)]/70 bg-[var(--surface-muted)] border border-[var(--border-color)] px-2.5 py-1.5 rounded-lg shrink-0">
              Sample content
            </span>
          )}
          <div className="relative flex items-center w-full md:w-60">
            <GlassInput
              label="Search news..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mb-0 w-full"
            />
          </div>

          <GlassButton
            variant="secondary"
            onClick={handleRefresh}
            className="p-3.5"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </GlassButton>
        </div>
      </div>

      {/* News Feed Grid */}
      {isLoading ? (
        /* Loading Skeletons */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <GlassCard key={i} className="p-6 space-y-4 animate-pulse">
              <div className="w-16 h-4 bg-[var(--surface-raised)] rounded" />
              <div className="w-full h-10 bg-[var(--surface-raised)] rounded" />
              <div className="w-full h-16 bg-[var(--surface-raised)] rounded" />
            </GlassCard>
          ))}
        </div>
      ) : articles.length === 0 ? (
        /* Empty State */
        <GlassCard className="p-12 text-center text-xs text-[var(--text-secondary)]/50 border border-[var(--border-color)]">
          <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--text-secondary)]/30" />
          <p className="font-semibold mb-3">No matching news articles found</p>
          <GlassButton variant="outline" onClick={handleRefresh} className="mx-auto text-xs py-1.5 px-3">
            Retry Feed Connection
          </GlassButton>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((art) => (
              <GlassCard 
                key={art.id} 
                className="p-6 flex flex-col justify-between hover:border-[var(--primary-color)]/20 transition-all duration-300 h-64"
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <span className="text-[9px] uppercase font-black tracking-widest text-[var(--primary-color)]">
                      {art.source}
                    </span>
                    <span className="text-[9px] text-[var(--text-secondary)]/50 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {art.publishedTime}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-[var(--text-primary)] tracking-tight line-clamp-2 mb-2 hover:text-[var(--primary-color)] transition-colors">
                    {art.headline}
                  </h4>

                  <p className="text-xs text-[var(--text-secondary)]/80 line-clamp-3 leading-relaxed">
                    {art.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-color)]">
                  <div>
                    {art.relatedStock && (
                      <button
                        onClick={() => onStockClick(art.relatedStock!)}
                        className="text-[10px] uppercase font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Ref: {art.relatedStock}
                      </button>
                    )}
                  </div>

                  <GlassButton
                    variant="outline"
                    className="py-1.5 px-3.5 text-[10px]"
                    onClick={() => setSelectedArticle(art)}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Read Article</span>
                  </GlassButton>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Load More Button (Infinite Scroll alternative) */}
          {hasMore && (
            <div className="flex justify-center mt-4">
              <GlassButton 
                variant="secondary" 
                onClick={handleLoadMore}
                className="py-2.5 px-6 text-xs text-[var(--text-secondary)] border-[var(--border-color)]"
              >
                Load More Articles
              </GlassButton>
            </div>
          )}
        </div>
      )}

      {/* Article Reader Modal */}
      {selectedArticle && (
        <GlassModal
          isOpen={selectedArticle !== null}
          onClose={() => setSelectedArticle(null)}
          title={selectedArticle.headline}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-secondary)]/60 uppercase">
              <span>Source: {selectedArticle.source}</span>
              <span>Published: {selectedArticle.publishedTime}</span>
            </div>

            <div className="text-xs leading-relaxed text-[var(--text-primary)]/95 space-y-3">
              <p className="font-semibold">{selectedArticle.summary}</p>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam elementum, eros et dapibus molestie, 
                lectus elit consequat justo, sit amet feugiat libero neque vel augue. Curabitur sed nisl vitae purus 
                vestibulum elementum a id sapien. Suspendisse pulvinar, nunc non tristique feugiat, elit ligula cursus 
                felis, ut pretium felis purus at massa.
              </p>
              <p>
                Duis vel interdum magna. Proin congue justo in accumsan consequat. Pellentesque habitant morbi tristique 
                senectus et netus et malesuada fames ac turpis egestas. Mauris varius, ligula ac tincidunt ultrices, 
                mauris sapien eleifend magna, vel pulvinar eros leo sed tortor.
              </p>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-[var(--border-color)]">
              {selectedArticle.relatedStock ? (
                <GlassButton
                  variant="outline"
                  className="py-1.5 px-3 text-[10px]"
                  onClick={() => {
                    const sym = selectedArticle.relatedStock!;
                    setSelectedArticle(null);
                    onStockClick(sym);
                  }}
                >
                  <span>Analyze {selectedArticle.relatedStock}</span>
                </GlassButton>
              ) : <div />}

              <GlassButton
                variant="primary"
                className="py-1.5 px-4 text-[10px]"
                onClick={() => window.open('https://www.google.com/finance', '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full Coverage</span>
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      )}
    </div>
  );
};
export default MarketNewsFeed;
