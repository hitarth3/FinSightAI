import { expenseService } from './expenseService';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

// Hardcoded seed list of Indian Stock Assets
const SEED_STOCKS: Omit<StockData, 'price' | 'change' | 'changePercent' | 'volume' | 'chartData'>[] = [
  { symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd.', open: 2910, high: 2954, low: 2895, marketCap: '₹19.8L Cr', peRatio: 26.4, high52Week: 3024, low52Week: 2180, sector: 'Energy' },
  { symbol: 'TCS', companyName: 'Tata Consultancy Services Ltd.', open: 3820, high: 3890, low: 3810, marketCap: '₹13.9L Cr', peRatio: 30.1, high52Week: 4254, low52Week: 3070, sector: 'IT' },
  { symbol: 'HDFCBANK', companyName: 'HDFC Bank Ltd.', open: 1510, high: 1545, low: 1502, marketCap: '₹11.6L Cr', peRatio: 18.2, high52Week: 1757, low52Week: 1363, sector: 'Banking' },
  { symbol: 'INFY', companyName: 'Infosys Ltd.', open: 1470, high: 1495, low: 1450, marketCap: '₹6.1L Cr', peRatio: 24.5, high52Week: 1733, low52Week: 1215, sector: 'IT' },
  { symbol: 'ICICIBANK', companyName: 'ICICI Bank Ltd.', open: 1120, high: 1142, low: 1108, marketCap: '₹7.9L Cr', peRatio: 17.8, high52Week: 1170, low52Week: 898, sector: 'Banking' },
  { symbol: 'BHARTIARTL', companyName: 'Bharti Airtel Ltd.', open: 1280, high: 1315, low: 1275, marketCap: '₹7.2L Cr', peRatio: 45.2, high52Week: 1347, low52Week: 785, sector: 'Telecom' },
  { symbol: 'SBIN', companyName: 'State Bank of India', open: 825, high: 844, low: 818, marketCap: '₹7.4L Cr', peRatio: 10.9, high52Week: 852, low52Week: 554, sector: 'Banking' },
  { symbol: 'LICI', companyName: 'Life Insurance Corporation of India', open: 980, high: 1012, low: 975, marketCap: '₹6.2L Cr', peRatio: 15.4, high52Week: 1175, low52Week: 533, sector: 'Financial Services' },
  { symbol: 'HINDUNILVR', companyName: 'Hindustan Unilever Ltd.', open: 2350, high: 2365, low: 2315, marketCap: '₹5.5L Cr', peRatio: 52.8, high52Week: 2770, low52Week: 2210, sector: 'FMCG' },
  { symbol: 'ITC', companyName: 'ITC Ltd.', open: 435, high: 442, low: 431, marketCap: '₹5.4L Cr', peRatio: 25.9, high52Week: 500, low52Week: 399, sector: 'FMCG' },
  { symbol: 'LT', companyName: 'Larsen & Toubro Ltd.', open: 3650, high: 3712, low: 3625, marketCap: '₹5.1L Cr', peRatio: 37.6, high52Week: 3900, low52Week: 2200, sector: 'Infrastructure' },
  { symbol: 'BAJFINANCE', companyName: 'Bajaj Finance Ltd.', open: 6920, high: 7040, low: 6880, marketCap: '₹4.3L Cr', peRatio: 29.8, high52Week: 8192, low52Week: 6200, sector: 'Financial Services' },
  { symbol: 'M&M', companyName: 'Mahindra & Mahindra Ltd.', open: 2510, high: 2614, low: 2490, marketCap: '₹3.1L Cr', peRatio: 28.3, high52Week: 2650, low52Week: 1250, sector: 'Auto' },
  { symbol: 'TATAMOTORS', companyName: 'Tata Motors Ltd.', open: 940, high: 984, low: 935, marketCap: '₹3.2L Cr', peRatio: 16.5, high52Week: 1065, low52Week: 505, sector: 'Auto' },
  { symbol: 'WIPRO', companyName: 'Wipro Ltd.', open: 460, high: 468, low: 455, marketCap: '₹2.4L Cr', peRatio: 22.1, high52Week: 546, low52Week: 375, sector: 'IT' },
  { symbol: 'HCLTECH', companyName: 'HCL Technologies Ltd.', open: 1330, high: 1362, low: 1320, marketCap: '₹3.7L Cr', peRatio: 23.9, high52Week: 1696, low52Week: 1040, sector: 'IT' },
  { symbol: 'ADANIENT', companyName: 'Adani Enterprises Ltd.', open: 3150, high: 3240, low: 3120, marketCap: '₹3.6L Cr', peRatio: 98.4, high52Week: 3450, low52Week: 1740, sector: 'Conglomerate' },
  { symbol: 'SUNPHARMA', companyName: 'Sun Pharmaceutical Industries Ltd.', open: 1480, high: 1528, low: 1475, marketCap: '₹3.6L Cr', peRatio: 38.2, high52Week: 1640, low52Week: 960, sector: 'Pharma' },
  { symbol: 'TITAN', companyName: 'Titan Company Ltd.', open: 3350, high: 3390, low: 3310, marketCap: '₹3.0L Cr', peRatio: 82.5, high52Week: 3886, low52Week: 2650, sector: 'Consumer Goods' },
  { symbol: 'MARUTI', companyName: 'Maruti Suzuki India Ltd.', open: 12200, high: 12450, low: 12100, marketCap: '₹3.8L Cr', peRatio: 29.4, high52Week: 13075, low52Week: 8850, sector: 'Auto' },
];

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
  private cache: StockData[] = [];
  private indicesCache: MarketIndex[] = [];
  private lastUpdateTime: number = 0;

  constructor() {
    this.generateInitialData();
  }

  private generateInitialData() {
    this.cache = SEED_STOCKS.map(s => {
      // price between low and high 52-week, close to open
      const price = parseFloat((s.open + (Math.random() * 20 - 10)).toFixed(2));
      const change = parseFloat((price - s.open).toFixed(2));
      const changePercent = parseFloat(((change / s.open) * 100).toFixed(2));
      const volume = Math.floor(Math.random() * 5000000) + 100000;

      // generate historic data (last 7 hours for current trading day)
      const chartData = [
        { time: '09:30', value: s.open, aiValue: s.open },
        { time: '10:30', value: s.open * (1 + (Math.random() * 0.01 - 0.005)), aiValue: s.open * (1.002) },
        { time: '11:30', value: s.open * (1 + (Math.random() * 0.015 - 0.007)), aiValue: s.open * (1.005) },
        { time: '12:30', value: s.open * (1 + (Math.random() * 0.02 - 0.01)), aiValue: s.open * (1.009) },
        { time: '13:30', value: s.open * (1 + (Math.random() * 0.02 - 0.008)), aiValue: s.open * (1.012) },
        { time: '14:30', value: s.open * (1 + (Math.random() * 0.025 - 0.012)), aiValue: s.open * (1.018) },
        { time: '15:30', value: price, aiValue: price * (1 + (Math.random() * 0.01 + 0.005)) },
      ].map(pt => ({
        ...pt,
        value: parseFloat(pt.value.toFixed(2)),
        aiValue: parseFloat(pt.aiValue.toFixed(2))
      }));

      return {
        ...s,
        price,
        change,
        changePercent,
        volume,
        chartData
      };
    });

    this.indicesCache = [
      { name: 'Nifty 50', value: 22493.50, change: 110.15, changePercent: 0.49, trend: 'up' },
      { name: 'Sensex', value: 74119.39, change: 408.86, changePercent: 0.55, trend: 'up' },
      { name: 'Bank Nifty', value: 47835.80, change: -124.50, changePercent: -0.26, trend: 'down' },
      { name: 'Nifty IT', value: 36540.20, change: 356.10, changePercent: 0.98, trend: 'up' },
    ];

    this.lastUpdateTime = Date.now();
  }

  public tickData() {
    this.lastUpdateTime = Date.now();
  }

  public async getIndices(forceError = false, forceRefresh = false): Promise<MarketIndex[]> {
    if (forceError) throw new Error('API timed out fetching index metrics.');
    const url = `${API_BASE}/api/stocks/market/indices${forceRefresh ? '?refresh=true' : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch market indices');
    const json = await res.json();
    this.lastUpdateTime = Date.now();
    return json.data;
  }

  public async getTopGainers(): Promise<StockData[]> {
    const res = await fetch(`${API_BASE}/api/stocks/market/movers`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch market movers');
    const json = await res.json();
    return json.data.gainers;
  }

  public async getTopLosers(): Promise<StockData[]> {
    const res = await fetch(`${API_BASE}/api/stocks/market/movers`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch market movers');
    const json = await res.json();
    return json.data.losers;
  }

  public async getMostActive(): Promise<StockData[]> {
    const res = await fetch(`${API_BASE}/api/stocks/market/movers`, { headers: getHeaders() });
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
    const res = await fetch(`${API_BASE}/api/stocks/market/movers`, { headers: getHeaders() });
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
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch market movers');
    const json = await res.json();
    return json.data;
  }

  public async searchStocks(query: string): Promise<StockData[]> {
    if (!query.trim()) return [];
    const res = await fetch(`${API_BASE}/api/stocks/market/search?q=${query}`, { headers: getHeaders() });
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
    const res = await fetch(`${API_BASE}/api/stocks/market/quote/${symbol}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch quote for ${symbol}`);
    const json = await res.json();
    return json.data;
  }

  public async getStockQuotesBatch(symbols: string[], forceRefresh: boolean = false): Promise<Record<string, StockData>> {
    if (symbols.length === 0) return {};
    const symbolStr = symbols.join(',');
    const url = `${API_BASE}/api/stocks/market/quotes?symbols=${symbolStr}${forceRefresh ? '&refresh=true' : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
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
    await new Promise(r => setTimeout(r, 800));
    
    // Rotate the seed news list based on current timestamp to simulate new articles arriving on refresh
    const now = new Date();
    const timeSecs = Math.floor(now.getTime() / 1000);
    const rotationOffset = timeSecs % SEED_NEWS.length;
    const rotatedNews = [
      ...SEED_NEWS.slice(rotationOffset),
      ...SEED_NEWS.slice(0, rotationOffset)
    ];

    // Filter news by category and text search
    let filtered = rotatedNews.map((art, idx) => {
      // Compute highly realistic timestamps relative to the actual current time
      const minutesToSubtract = idx * 25 + (page - 1) * 60;
      const artTime = new Date(now.getTime() - minutesToSubtract * 60 * 1000);
      const timeText = artTime.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      return {
        ...art,
        publishedTime: `${timeText} (${minutesToSubtract}m ago)`
      };
    });

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
    const res = await fetch(`${API_BASE}/api/stocks`, { headers: getHeaders() });
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

    const res = await fetch(`${API_BASE}/api/stocks`, {
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
    const res = await fetch(`${API_BASE}/api/stocks/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to remove stock from watchlist');
    const json = await res.json();
    return json.success;
  }
}

export const stockService = new StockService();
