import { API_BASE, apiFetch } from './apiClient';
const WEBHOOK_URL = import.meta.env.VITE_N8N_ANALYTIC_WEBHOOK_URL;

function getHeaders() {
  const token = localStorage.getItem('finsight_access_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export interface StockAnalysis {
  symbol: string;
  strengthScore: number;
  recommendation: string;
  trend: string;
  confidence: number;
  riskLevel: string;
  sentiment: string;
  supportLevels: number[];
  resistanceLevels: number[];
  summary: string;
  analysisGeneratedAt: string;
  technicalScore?: number;
  newsScore?: number;
  fundamentalScore?: number;
  momentumScore?: number;
  // Extensible properties for future analysis models
  [key: string]: any;
}

interface CacheEntry {
  data: StockAnalysis;
  timestamp: number;
}

class StockAnalysisService {
  private cache: Record<string, CacheEntry> = {};
  private activeController: AbortController | null = null;
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Main entry point to get AI analysis
  public async getAnalysis(symbol: string, forceRefresh = false): Promise<StockAnalysis> {
    const cleanSymbol = symbol.trim().toUpperCase();

    // 1. Check in-memory cache if not forcing refresh
    if (!forceRefresh && this.isCacheValid(cleanSymbol)) {
      console.log(`[Analysis Cache] Hit for ${cleanSymbol}`);
      return this.cache[cleanSymbol].data;
    }

    // 2. Cancel any active request for rapid tab switches
    if (this.activeController) {
      this.activeController.abort();
      console.log(`[Analysis API] Aborted previous active request.`);
    }

    this.activeController = new AbortController();
    const signal = this.activeController.signal;

    try {
      // 3. If not forcing refresh, check historical records from database first
      if (!forceRefresh) {
        try {
          const dbData = await this.loadFromDatabase(cleanSymbol);
          if (dbData) {
            // Check if DB data is fresh (less than 5 minutes old)
            const dbAge = Date.now() - new Date(dbData.analysisGeneratedAt).getTime();
            if (dbAge < this.cacheTTL) {
              this.saveToCache(cleanSymbol, dbData);
              return dbData;
            }
          }
        } catch (dbErr) {
          console.error('[Analysis Database] Failed to query historical records', dbErr);
        }
      }

      // 4. Call live n8n Webhook via Backend Proxy (bypasses CORS restrictions)
      console.log(`[Analysis Webhook Proxy] Requesting backend trigger for ${cleanSymbol}...`);
      const response = await apiFetch(`${API_BASE}/api/stocks/analysis/trigger/${cleanSymbol}`, {
        method: 'POST',
        headers: getHeaders(),
        signal,
      });

      if (!response.ok) {
        const errorDetail = await response.json().then((j: any) => j.detail || j.message).catch(() => 'Backend error');
        throw new Error(errorDetail);
      }

      const resJson = await response.json();
      const rawJson = resJson.data;
      
      // Normalize and validate response structure
      const analysis = this.normalizeAnalysis(cleanSymbol, rawJson);

      // 5. Store newly generated report in database
      try {
        await this.saveToDatabase(analysis);
      } catch (dbSaveErr) {
        console.error('[Analysis Database] Failed to persist report:', dbSaveErr);
      }

      // 6. Cache in memory
      this.saveToCache(cleanSymbol, analysis);
      return analysis;

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(`[Analysis API] Request for ${cleanSymbol} was intentionally aborted.`);
        throw err;
      }

      console.error(`[Analysis Webhook] Failed to fetch report:`, err);
      
      // Fallback: Check if we have ANY historical report in DB as secondary fallback
      // (This satisfies reloads, while not generating fake data/mock responses)
      try {
        console.log(`[Analysis Database] Attempting historical fallback for ${cleanSymbol}...`);
        const historical = await this.loadFromDatabase(cleanSymbol);
        if (historical) {
          console.log(`[Analysis Database] Found historical fallback.`);
          this.saveToCache(cleanSymbol, historical);
          return historical;
        }
      } catch (fallbackErr) {
        console.error('[Analysis Database] Fallback lookup failed:', fallbackErr);
      }

      throw err;
    } finally {
      if (this.activeController?.signal === signal) {
        this.activeController = null;
      }
    }
  }

  // Check cache status
  private isCacheValid(symbol: string): boolean {
    const entry = this.cache[symbol];
    if (!entry) return false;
    return Date.now() - entry.timestamp < this.cacheTTL;
  }

  private saveToCache(symbol: string, data: StockAnalysis) {
    this.cache[symbol] = {
      data,
      timestamp: Date.now(),
    };
  }

  // Clear memory cache for a stock (e.g. on manual refresh)
  public clearCache(symbol: string) {
    delete this.cache[symbol.toUpperCase()];
  }

  // --- Supabase/FastAPI CRUD Proxy ---
  
  private async loadFromDatabase(symbol: string): Promise<StockAnalysis | null> {
    const res = await apiFetch(`${API_BASE}/api/stocks/analysis/${symbol}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.data) return null;
    
    return this.mapResponseToModel(json.data);
  }

  private async saveToDatabase(analysis: StockAnalysis): Promise<StockAnalysis> {
    const payload = {
      symbol: analysis.symbol,
      strength_score: analysis.strengthScore,
      recommendation: analysis.recommendation,
      trend: analysis.trend,
      confidence: analysis.confidence,
      risk_level: analysis.riskLevel,
      sentiment: analysis.sentiment,
      support_levels: analysis.supportLevels,
      resistance_levels: analysis.resistanceLevels,
      summary: analysis.summary,
      analysis_generated_at: analysis.analysisGeneratedAt,
    };

    const res = await apiFetch(`${API_BASE}/api/stocks/analysis`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error('Failed to save analysis report to Supabase.');
    }

    const json = await res.json();
    return this.mapResponseToModel(json.data);
  }

  // Normalize n8n response to ensure it maps to TypeScript shape safely
  private normalizeAnalysis(symbol: string, data: any): StockAnalysis {
    if (!data || data.strengthScore === undefined || data.summary?.includes("Analysis parsing failed")) {
      throw new Error(data?.summary || "Invalid or incomplete analysis report structure returned from n8n.");
    }
    return {
      symbol: symbol,
      strengthScore: Number(data.strengthScore),
      recommendation: data.recommendation || 'HOLD',
      trend: data.trend || 'Sideways',
      confidence: data.confidence !== undefined ? Number(data.confidence) : 70,
      riskLevel: data.riskLevel || 'Medium',
      sentiment: data.sentiment || 'Neutral',
      supportLevels: Array.isArray(data.supportLevels) ? data.supportLevels.map(Number) : [0, 0],
      resistanceLevels: Array.isArray(data.resistanceLevels) ? data.resistanceLevels.map(Number) : [0, 0],
      summary: data.summary || 'Analysis report generated.',
      analysisGeneratedAt: data.analysisGeneratedAt || new Date().toISOString(),
      technicalScore: data.technicalScore !== undefined ? Number(data.technicalScore) : undefined,
      newsScore: data.newsScore !== undefined ? Number(data.newsScore) : undefined,
      fundamentalScore: data.fundamentalScore !== undefined ? Number(data.fundamentalScore) : undefined,
      momentumScore: data.momentumScore !== undefined ? Number(data.momentumScore) : undefined,
    };
  }

  // Maps backend database snake_case keys back to CamelCase frontend interfaces
  private mapResponseToModel(data: any): StockAnalysis {
    return {
      symbol: data.symbol,
      strengthScore: data.strength_score,
      recommendation: data.recommendation,
      trend: data.trend,
      confidence: data.confidence,
      riskLevel: data.risk_level,
      sentiment: data.sentiment,
      supportLevels: data.support_levels || [],
      resistanceLevels: data.resistance_levels || [],
      summary: data.summary,
      analysisGeneratedAt: data.analysis_generated_at,
      created_at: data.created_at,
    };
  }
}

export const stockAnalysisService = new StockAnalysisService();
