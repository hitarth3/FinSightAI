
import { API_BASE, apiFetch } from './apiClient';

function getHeaders() {
  const token = localStorage.getItem('finsight_access_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export interface StockData {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  marketCap: string;
  peRatio: number;
  high52Week: number;
  low52Week: number;
  sector: string;
  chartData: { time: string; value: number; aiValue: number }[];
  exchange?: string;
  updatedAt?: string;
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down';
}

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  publishedTime: string;
  category: string;
  relatedStock?: string;
  url?: string;
}

const SEED_NEWS: Omit<NewsArticle, 'publishedTime'>[] = [
  { id: 'n1', headline: 'Reliance and BP Launch Major Deepwater Gas Field in KG D6 Block', summary: 'Reliance Industries and partner BP have announced the commencement of gas production from the MJ deepwater field, boosting India\'s domestic energy independence.', source: 'Economic Times', category: 'Market News', relatedStock: 'RELIANCE' },
  { id: 'n2', headline: 'TCS Secures $1.5B Megadeal with UK Insurance Giant for Digital Core Transformation', summary: 'Tata Consultancy Services has expanded its long-standing partnership with Phoenix Group to modernise its administrative systems using the TCS BaNCS platform.', source: 'CNBC TV18', category: 'Company News', relatedStock: 'TCS' },
  { id: 'n3', headline: 'HDFC Bank Q4 Profit Surges 37% YoY; Asset Quality Remains Resilient', summary: 'India\'s largest private lender reported solid fourth-quarter results, beating analyst expectations on net interest income growth and demonstrating robust loan disbursements.', source: 'Bloomberg Quint', category: 'Earnings Results', relatedStock: 'HDFCBANK' },
  { id: 'n4', headline: 'RBI Keeps Repo Rate Unchanged at 6.50% in Latest Monetary Policy Meet', summary: 'The Reserve Bank of India Governor Shaktikanta Das announced that the MPC has voted to keep the policy repo rate unchanged, maintaining focus on withdrawal of accommodation to align inflation to target.', source: 'RBI Press Release', category: 'RBI News' },
  { id: 'n5', headline: 'SEBI Clarifies FPI Disclosure Norms to Prevent Concentrated Holdings', summary: 'The Securities and Exchange Board of India issued revised circulars detailing granular identification disclosures for high-risk Foreign Portfolio Investors (FPIs).', source: 'SEBI Circulars', category: 'SEBI News' },
  { id: 'n6', headline: 'IPO Boom: 5 New Tech Startups File DRHP with SEBI to Raise Over ₹8,000 Cr', summary: 'The Indian primary market remains hyperactive as fintech and e-commerce startups file draft papers to fund expansion plans and offer exits to early-stage venture investors.', source: 'Moneycontrol', category: 'IPO News' },
  { id: 'n7', headline: 'US Federal Reserve Hints at Rate Cuts Later This Year as Inflation Softens', summary: 'Global markets rallied after Chairman Jerome Powell suggested that borrowing costs have likely peaked, hinting at multiple policy easing steps before the year-end.', source: 'Wall Street Journal', category: 'Global Market News' },
  { id: 'n8', headline: 'Infosys Signs Strategic Collaboration with NVIDIA for Enterprise AI Deployment', summary: 'Infosys Topaz will integrate NVIDIA AI Enterprise software to enable global corporations to build custom generative AI solutions securely.', source: 'LiveMint', category: 'Company News', relatedStock: 'INFY' },
  { id: 'n9', headline: 'Tata Motors Shares Hit New All-Time High as JLR Sales Grow 20% globally', summary: 'Strong luxury portfolio volumes in North America and China pushed Tata Motors shares past record thresholds, driven by rising EV adoption in Jag-Land Rover.', source: 'Financial Express', category: 'Earnings Results', relatedStock: 'TATAMOTORS' },
  { id: 'n10', headline: 'SEBI Board Proposes Instant Settlement of Trades, Streamlining Retail Access', summary: 'SEBI Chairman proposed a phased implementation of instantaneous T+0 settlement cycles, aiming to release liquidity back to retail trading accounts immediately.', source: 'Business Standard', category: 'SEBI News' }
];

class StockService {
  private lastUpdateTime = 0;

  public tickData() {
    this.lastUpdateTime = Date.now();
  }

  public async getIndices(forceError = false, forceRefresh = false): Promise<MarketIndex[]> {
    if (forceError) throw new Error('API timed out fetching index metrics.');
    const url = `${API_BASE}/api/stocks/market/indices${forceRefresh ? '?refresh=true' : ''}`;
    const res = await apiFetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch market indices');
    const json = await res.json();
    this.lastUpdateTime = Date.now();
    return json.data;
  }

  public async getTopGainers(): Promise<StockData[]> {
    const res = await apiFetch(`${API_BASE}/api/stocks/market/movers`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch market movers');
    const json = await res.json();
    return json.data.gainers;
  }

  public async getTopLosers(): Promise<StockData[]> {
    const res = await apiFetch(`${API_BASE}/api/stocks/market/movers`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch market movers');
    const json = await res.json();
    return json.data.losers;
  }

  public async getMostActive(): Promise<StockData[]> {
    const res = await apiFetch(`${API_BASE}/api/stocks/market/movers`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch market movers');
    const json = await res.json();
    return json.data.mostActive;
  }

  public async getMarketMovers(): Promise<{
    biggestGainerSector: string;
    biggestLosingSector: string;
    advancing: number;
    declining: number;
  }> {
    const res = await apiFetch(`${API_BASE}/api/stocks/market/movers`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch market movers');
    const json = await res.json();
    return {
      biggestGainerSector: json.data.biggestGainerSector,
      biggestLosingSector: json.data.biggestLosingSector,
      advancing: json.data.advancing,
      declining: json.data.declining
    };
  }

  public async getMarketMoversFull(forceRefresh = false): Promise<any> {
    const url = `${API_BASE}/api/stocks/market/movers${forceRefresh ? '?refresh=true' : ''}`;
    const res = await apiFetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch market movers');
    const json = await res.json();
    return json.data;
  }

  public async searchStocks(query: string): Promise<StockData[]> {
    if (!query.trim()) return [];
    const res = await apiFetch(`${API_BASE}/api/stocks/market/search?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to search stocks');
    const json = await res.json();
    return json.data.map((item: any) => ({
      symbol: item.symbol,
      companyName: item.companyName,
      price: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      open: 0,
      high: 0,
      low: 0,
      marketCap: 'N/A',
      peRatio: 0,
      high52Week: 0,
      low52Week: 0,
      sector: 'Indian Market Equities',
      chartData: [],
      exchange: item.exchange === 'NSI' ? 'NSE' : 'BSE'
    }));
  }

  public async getStockBySymbol(symbol: string): Promise<StockData | undefined> {
    const res = await apiFetch(`${API_BASE}/api/stocks/market/quote/${symbol}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch quote for ${symbol}`);
    const json = await res.json();
    return json.data;
  }

  public async getStockQuotesBatch(symbols: string[], forceRefresh: boolean = false): Promise<Record<string, StockData>> {
    if (symbols.length === 0) return {};
    const symbolStr = symbols.join(',');
    const url = `${API_BASE}/api/stocks/market/quotes?symbols=${symbolStr}${forceRefresh ? '&refresh=true' : ''}`;
    const res = await apiFetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch batch stock quotes');
    const json = await res.json();
    return json.data || {};
  }

  // News Feed with Categories, pagination, and infinite scroll simulation
  public async getNewsFeed(
    category: string,
    query: string = '',
    page: number = 1,
    limit: number = 4
  ): Promise<{ articles: NewsArticle[]; hasMore: boolean }> {
    // Static examples have no verified publication dates; never present them as live news.
    let filtered = SEED_NEWS.map(article => ({ ...article, publishedTime: 'Sample article · not a live feed' }));

    if (category !== 'Market News') {
      filtered = filtered.filter(n => n.category === category);
    }

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        n => n.headline.toLowerCase().includes(q) || 
             n.summary.toLowerCase().includes(q) || 
             (n.relatedStock && n.relatedStock.toLowerCase().includes(q))
      );
    }

    // Paginate results
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < filtered.length;

    return {
      articles: paginated,
      hasMore
    };
  }

  public getLastUpdatedText(): string {
    return new Date(this.lastUpdateTime).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // --- Watchlist backend integrations ---
  
  public async getWatchlist(): Promise<any[]> {
    const res = await apiFetch(`${API_BASE}/api/stocks`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch watchlist holdings');
    const json = await res.json();
    return json.data;
  }

  public async trackStockInWatchlist(symbol: string, companyName: string, quantity: number, price: number): Promise<any> {
    const payload = {
      symbol: symbol.toUpperCase(),
      company_name: companyName,
      quantity: quantity,
      purchase_price: price,
      purchase_date: new Date().toISOString().split('T')[0] // today's date
    };

    const res = await apiFetch(`${API_BASE}/api/stocks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errorMsg = await res.json().then(j => j.detail || j.message).catch(() => 'Failed to track stock');
      throw new Error(errorMsg);
    }
    const json = await res.json();
    return json.data;
  }

  public async untrackStockFromWatchlist(id: string): Promise<boolean> {
    const res = await apiFetch(`${API_BASE}/api/stocks/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to remove stock from watchlist');
    const json = await res.json();
    return json.success;
  }
}

export const stockService = new StockService();
