import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockService } from '../services/stockService';

export interface WatchlistItem {
  id: string;
  symbol: string;
  company_name: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
}

export function useWatchlist() {
  return useQuery<WatchlistItem[]>({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const list = await stockService.getWatchlist();
      return list || [];
    },
  });
}

export function useTrackStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      symbol,
      companyName,
      quantity,
      price,
    }: {
      symbol: string;
      companyName: string;
      quantity: number;
      price: number;
    }) => {
      return stockService.trackStockInWatchlist(symbol, companyName, quantity, price);
    },
    onMutate: async (newStock) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['watchlist'] });

      // Snapshot the previous watchlist
      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>(['watchlist']);

      // Prevent duplicate watchlist entries
      if (
        previousWatchlist?.some(
          (item) => item.symbol.toUpperCase() === newStock.symbol.toUpperCase()
        )
      ) {
        throw new Error(`${newStock.symbol.toUpperCase()} is already tracked in your watchlist.`);
      }

      // Create an optimistic watchlist item
      const optimisticStock: WatchlistItem = {
        id: 'optimistic-' + Date.now(),
        symbol: newStock.symbol.toUpperCase(),
        company_name: newStock.companyName,
        quantity: newStock.quantity,
        purchase_price: newStock.price,
        purchase_date: new Date().toISOString().split('T')[0],
      };

      // Optimistically update the watchlist cache
      queryClient.setQueryData<WatchlistItem[]>(['watchlist'], (old) => [
        ...(old || []),
        optimisticStock,
      ]);

      return { previousWatchlist };
    },
    onError: (err: any, newStock, context) => {
      // Rollback to previous state on error
      if (context?.previousWatchlist) {
        queryClient.setQueryData(['watchlist'], context.previousWatchlist);
      }
    },
    onSettled: () => {
      // Always invalidate after error or success to keep server sync
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

export function useUntrackStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return stockService.untrackStockFromWatchlist(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist'] });

      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>(['watchlist']);

      // Optimistically remove from watchlist cache
      queryClient.setQueryData<WatchlistItem[]>(
        ['watchlist'],
        (old) => old?.filter((item) => item.id !== id) || []
      );

      return { previousWatchlist };
    },
    onError: (err, id, context) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData(['watchlist'], context.previousWatchlist);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

export interface PortfolioMetrics {
  totalInvested: number;
  currentPortfolioValue: number;
  totalProfitLoss: number;
  totalReturnPercent: number;
  numberOfHoldings: number;
  totalWatchlistStocks: number;
  topGainer: { symbol: string; changePercent: number } | null;
  topLoser: { symbol: string; changePercent: number } | null;
  dailyPortfolioChange: number;
  todayReturnPercent: number;
  overallTrend: 'bullish' | 'bearish' | 'neutral';
  lastUpdated?: string;
}

export function usePortfolioMetrics(watchlist: WatchlistItem[] | undefined) {
  return useQuery<PortfolioMetrics | null>({
    queryKey: ['portfolioMetrics', watchlist?.map((item) => `${item.symbol}:${item.quantity}`).join(',')],
    queryFn: async () => {
      if (!watchlist || watchlist.length === 0) return null;

      const symbols = watchlist.map((item) => item.symbol);
      const quotesMap = await stockService.getStockQuotesBatch(symbols);

      let totalInvested = 0;
      let currentPortfolioValue = 0;
      let dailyPortfolioChange = 0;

      watchlist.forEach((item) => {
        const liveQuote = quotesMap[item.symbol.toUpperCase()];
        const currentPrice = liveQuote ? liveQuote.price : item.purchase_price;
        const change = liveQuote ? liveQuote.change : 0;

        totalInvested += item.quantity * item.purchase_price;
        currentPortfolioValue += item.quantity * currentPrice;
        dailyPortfolioChange += item.quantity * change;
      });

      const totalProfitLoss = currentPortfolioValue - totalInvested;
      const totalReturnPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
      
      const previousValue = currentPortfolioValue - dailyPortfolioChange;
      const todayReturnPercent = previousValue > 0 ? (dailyPortfolioChange / previousValue) * 100 : 0;

      // Calculate Top Gainer and Top Loser in the watchlist
      let topGainer: { symbol: string; changePercent: number } | null = null;
      let topLoser: { symbol: string; changePercent: number } | null = null;

      Object.entries(quotesMap).forEach(([symbol, quote]: [string, any]) => {
        if (quote) {
          const changePercent = quote.changePercent;
          if (!topGainer || changePercent > topGainer.changePercent) {
            topGainer = { symbol, changePercent };
          }
          if (!topLoser || changePercent < topLoser.changePercent) {
            topLoser = { symbol, changePercent };
          }
        }
      });

      const overallTrend = totalProfitLoss > 0 ? 'bullish' : totalProfitLoss < 0 ? 'bearish' : 'neutral';
      
      const quotesList = Object.values(quotesMap);
      const lastUpdated = quotesList.length > 0 ? (quotesList[0] as any).updatedAt : undefined;

      return {
        totalInvested,
        currentPortfolioValue,
        totalProfitLoss,
        totalReturnPercent,
        numberOfHoldings: watchlist.filter((item) => item.quantity > 0).length,
        totalWatchlistStocks: watchlist.length,
        topGainer,
        topLoser,
        dailyPortfolioChange,
        todayReturnPercent,
        overallTrend,
        lastUpdated,
      };
    },
    enabled: !!watchlist && watchlist.length > 0,
    staleTime: 300000, // 5 minutes cache stale duration
    refetchOnWindowFocus: true,
  });
}
