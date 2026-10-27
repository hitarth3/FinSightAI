import { API_BASE, apiFetch } from './apiClient';

function getHeaders() {
  const token = localStorage.getItem('finsight_access_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export interface ReportEvidence {
  version?: number;
  news?: { title: string; url: string; source: string; published_at: string; sentiment: string }[];
  news_method?: string;
  confidence_components?: Record<string, number>;
  confidence_method?: string;
  market_data_as_of?: string;
  recommendation_method?: string;
}

export interface StockAnalysis {
  symbol: string;
  evidence?: ReportEvidence;
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
  stale?: boolean;
  warning?: string;
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
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Main entry point to get AI analysis
  public async getAnalysis(symbol: string, forceRefresh = false): Promise<StockAnalysis> {
    const cleanSymbol = symbol.trim().toUpperCase();

    // 1. Check in-memory cache if not forcing refresh
    if (!forceRefresh && this.isCacheValid(cleanSymbol)) {
      console.log(`[Analysis Cache] Hit for ${encodeURIComponent(cleanSymbol)}`);
      return this.cache[cleanSymbol].data;
    }

    try {
      // 3. If not forcing refresh, check historical records from database first
      if (!forceRefresh) {
        try {
          const dbData = await this.loadFromDatabase(cleanSymbol);
          if (dbData) {
            // Check if DB data is fresh (less than 5 minutes old)
            const dbAge = Date.now() - new Date(dbData.analysisGeneratedAt).getTime();
            if (dbAge >= 0 && dbAge < this.cacheTTL && dbData.evidence?.version === 2) {
              this.saveToCache(cleanSymbol, dbData);
              return dbData;
            }
          }
        } catch (dbErr) {
          console.error('[Analysis Database] Failed to query historical records', dbErr);
        }
      }

      // Generate and persist the report on the backend.
      console.log(`[Analysis API] Requesting backend trigger for ${cleanSymbol}...`);
      const response = await apiFetch(`${API_BASE}/api/stocks/analysis/trigger/${encodeURIComponent(cleanSymbol)}`, {
        method: 'POST',
        timeoutMs: 90_000,
        headers: getHeaders(),
      });

      if (!response.ok) {
        const errorDetail = await response.json().then((j: any) => j.detail || j.message).catch(() => 'Backend error');
        throw new Error(errorDetail);
      }

      const resJson = await response.json();
      const rawJson = resJson.data;
      
      // Normalize and validate response structure
      const analysis = this.mapResponseToModel(rawJson);

      // 6. Cache in memory
      this.saveToCache(cleanSymbol, analysis);
      return analysis;

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(`[Analysis API] Request for ${cleanSymbol} was intentionally aborted.`);
        throw err;
      }

      console.error(`[Analysis API] Failed to fetch report:`, err);
      
      // Fallback: Check if we have ANY historical report in DB as secondary fallback
      // (This satisfies reloads, while not generating fake data/mock responses)
      try {
        console.log(`[Analysis Database] Attempting historical fallback for ${cleanSymbol}...`);
        const historical = await this.loadFromDatabase(cleanSymbol);
        if (historical) {
          console.log(`[Analysis Database] Found historical fallback.`);
          return { ...historical, stale: true, warning: 'Refresh failed. Showing the last saved report.' };
        }
      } catch (fallbackErr) {
        console.error('[Analysis Database] Fallback lookup failed:', fallbackErr);
      }

      throw err;
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
    const res = await apiFetch(`${API_BASE}/api/stocks/analysis/${encodeURIComponent(symbol)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.data) return null;
    
    return this.mapResponseToModel(json.data);
  }

  // Maps backend database snake_case keys back to CamelCase frontend interfaces
  private mapResponseToModel(data: any): StockAnalysis {
    return {
      symbol: data.symbol,
      evidence: data.evidence || {},
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
