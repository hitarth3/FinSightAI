import React, { useState, useEffect } from 'react';
import { stockAnalysisService, StockAnalysis } from '../../services/stockAnalysisService';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  RefreshCw, 
  Calendar, 
  ShieldAlert, 
  Compass, 
  LineChart, 
  AlertCircle 
} from 'lucide-react';

interface StockAnalysisPanelProps {
  symbol: string | null;
}

export const StockAnalysisPanel: React.FC<StockAnalysisPanelProps> = ({ symbol }) => {
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async (forceRefresh = false) => {
    if (!symbol) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await stockAnalysisService.getAnalysis(symbol, forceRefresh);
      setAnalysis(result);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'API timed out connecting to the intelligence service.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      fetchAnalysis(false);
    } else {
      setAnalysis(null);
    }
  }, [symbol]);

  // Empty State
  if (!symbol) {
    return (
      <GlassCard className="p-8 text-center border-[var(--border-color)] h-full flex flex-col items-center justify-center min-h-[300px]">
        <Sparkles className="w-10 h-10 text-[var(--text-secondary)]/30 mb-3" />
        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">No Active AI Report</h4>
        <p className="text-xs text-[var(--text-secondary)]/60 max-w-xs mx-auto">
          Select a stock from your watchlist to generate an AI report.
        </p>
      </GlassCard>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <GlassCard className="p-6 space-y-6 animate-pulse min-h-[400px]">
        <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)]">
          <div className="space-y-1">
            <div className="w-20 h-4 bg-[var(--surface-raised)] rounded" />
            <div className="w-32 h-2.5 bg-[var(--surface-raised)] rounded" />
          </div>
          <div className="w-24 h-8 bg-[var(--surface-raised)] rounded-xl" />
        </div>

        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
          <span className="text-xs text-[var(--primary-color)] font-bold font-mono">
            Analyzing stock with AI...
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-[var(--surface-subtle)] rounded-xl" />
          <div className="h-16 bg-[var(--surface-subtle)] rounded-xl" />
        </div>
      </GlassCard>
    );
  }

  // Error State
  if (error) {
    return (
      <GlassCard className="p-8 text-center border-red-500/20 bg-red-500/5 min-h-[300px] flex flex-col items-center justify-center">
        <ShieldAlert className="w-12 h-12 text-error mb-3 animate-bounce" />
        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">AI Analysis Service Unavailable</h4>
        <p className="text-xs text-[var(--text-secondary)]/85 mb-4 max-w-sm mx-auto">
          Unable to generate stock intelligence report.
        </p>
        
        {/* Error Details */}
        <div className="w-full max-w-md p-3 rounded-lg bg-black/30 border border-[var(--border-color)] text-[10px] font-mono text-left text-red-300 mb-5 overflow-x-auto whitespace-pre-wrap">
          {error}
        </div>

        <div className="flex gap-3">
          <GlassButton 
            variant="outline" 
            onClick={() => fetchAnalysis(true)} 
            className="text-xs py-1.5 px-4"
          >
            Retry Analysis Request
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  if (!analysis) return null;

  // Visualizing progress ring variables
  const score = analysis.strengthScore;
  const radius = 30;
  const stroke = 5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Colored indicators based on score value
  let scoreColorClass = 'text-error';
  let scoreStrokeClass = 'stroke-error';
  let scoreLevel = 'Weak';

  if (score > 70) {
    scoreColorClass = 'text-success';
    scoreStrokeClass = 'stroke-success';
    scoreLevel = 'Strong';
  } else if (score > 40) {
    scoreColorClass = 'text-yellow-500';
    scoreStrokeClass = 'stroke-yellow-500';
    scoreLevel = 'Neutral';
  }

  // Recommendation styles
  const rec = analysis.recommendation.toUpperCase();
  let recVariant: 'cyan' | 'purple' | 'success' | 'error' | 'neutral' = 'neutral';
  if (rec.includes('BUY')) recVariant = 'success';
  if (rec.includes('SELL')) recVariant = 'error';
  if (rec.includes('HOLD')) recVariant = 'purple';

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day} ${month} ${year} • ${hours}:${minutes} IST`;
    } catch {
      return isoString;
    }
  };

  return (
    <GlassCard className="p-6 space-y-6 hover:border-[var(--primary-color)]/10 transition-all duration-300">
      {/* Panel Header */}
      <div className="flex justify-between items-start pb-4 border-b border-[var(--border-color)] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-black text-[var(--text-primary)]">
              {analysis.symbol}
            </h4>
            <GlassBadge variant="cyan">AI Intelligence</GlassBadge>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/50 flex items-center gap-1.5 mt-0.5">
            <Calendar className="w-3.5 h-3.5" /> Generated: {formatTimestamp(analysis.analysisGeneratedAt)}
          </span>
        </div>

        <GlassButton
          variant="secondary"
          onClick={() => fetchAnalysis(true)}
          className="py-1.5 px-3 text-xs shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          <span>Refresh</span>
        </GlassButton>
      </div>

      {/* Strength & Recommendation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Circular Progress Gauge */}
        <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-color)] flex items-center gap-4 justify-center md:justify-start">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                className="text-[var(--text-secondary)]/20 stroke-current"
                strokeWidth={stroke}
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                className={`${scoreStrokeClass} stroke-current transition-all duration-500 ease-out`}
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset }}
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>
            <span className={`absolute text-sm font-black ${scoreColorClass}`}>
              {score}
            </span>
          </div>

          <div>
            <span className="text-[8px] uppercase tracking-widest text-[var(--text-secondary)]/50 block">AI Strength</span>
            <span className={`text-xs font-black capitalize ${scoreColorClass}`}>
              {scoreLevel} Score
            </span>
          </div>
        </div>

        {/* Recommendation card */}
        <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-color)] flex flex-col justify-center">
          <span className="text-[8px] uppercase tracking-widest text-[var(--text-secondary)]/50 block mb-1">
            Recommendation
          </span>
          <div>
            <GlassBadge variant={recVariant} className="text-xs font-black">
              {analysis.recommendation}
            </GlassBadge>
          </div>
        </div>

        {/* Trend card */}
        <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-color)] flex items-center gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${
            analysis.trend.toUpperCase() === 'BULLISH' ? 'bg-success/10 text-success' :
            analysis.trend.toUpperCase() === 'BEARISH' ? 'bg-error/10 text-error' : 'bg-purple-500/10 text-purple-400'
          }`}>
            {analysis.trend.toUpperCase() === 'BEARISH' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
          </div>
          <div>
            <span className="text-[8px] uppercase tracking-widest text-[var(--text-secondary)]/50 block">Market Trend</span>
            <span className="text-xs font-black text-[var(--text-primary)]">
              {analysis.trend}
            </span>
          </div>
        </div>
      </div>

      {/* Support & Resistance Prices */}
      <div className="grid grid-cols-2 gap-4">
        {/* Support Levels */}
        <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-color)]">
          <h5 className="text-[10px] uppercase font-bold tracking-wider text-success mb-2.5 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" /> Support Levels
          </h5>
          <div className="flex gap-2">
            {analysis.supportLevels.map((lvl, idx) => (
              <span 
                key={idx} 
                className="px-2.5 py-1 rounded bg-success/5 border border-success/15 text-xs font-bold text-success"
              >
                ₹{lvl}
              </span>
            ))}
          </div>
        </div>

        {/* Resistance Levels */}
        <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-color)]">
          <h5 className="text-[10px] uppercase font-bold tracking-wider text-error mb-2.5 flex items-center gap-1.5">
            <LineChart className="w-3.5 h-3.5" /> Resistance Levels
          </h5>
          <div className="flex gap-2">
            {analysis.resistanceLevels.map((lvl, idx) => (
              <span 
                key={idx} 
                className="px-2.5 py-1 rounded bg-error/5 border border-error/15 text-xs font-bold text-error"
              >
                ₹{lvl}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* News Sentiment & Confidence metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-color)] text-xs">
          <span className="text-[8px] uppercase tracking-widest text-[var(--text-secondary)]/50 block mb-0.5">News Sentiment</span>
          <span className="font-bold text-[var(--text-primary)] capitalize">{analysis.sentiment}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-color)] text-xs">
          <span className="text-[8px] uppercase tracking-widest text-[var(--text-secondary)]/50 block mb-0.5">AI Confidence</span>
          <span className="font-bold text-[var(--text-primary)]">{analysis.confidence}%</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-color)] text-xs">
          <span className="text-[8px] uppercase tracking-widest text-[var(--text-secondary)]/50 block mb-0.5">Risk Level</span>
          <span className="font-bold text-[var(--text-primary)] capitalize">{analysis.riskLevel}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-color)] space-y-1.5">
        <span className="text-[9px] uppercase font-extrabold tracking-widest text-[var(--text-secondary)]/40 block">
          AI Analysis Summary
        </span>
        <p className="text-xs text-[var(--text-primary)]/85 leading-relaxed whitespace-pre-wrap">
          {analysis.summary}
        </p>
      </div>

      {/* Optional: Score Breakdown for Future Scoring Modules */}
      {(analysis.technicalScore !== undefined || analysis.newsScore !== undefined || analysis.fundamentalScore !== undefined) && (
        <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-color)] text-xs space-y-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 block">Score Breakdown</span>
          <div className="grid grid-cols-3 gap-3">
            {analysis.technicalScore !== undefined && (
              <div>
                <span className="text-[8px] text-[var(--text-secondary)] block">Technical</span>
                <span className="font-bold">{analysis.technicalScore}/100</span>
              </div>
            )}
            {analysis.newsScore !== undefined && (
              <div>
                <span className="text-[8px] text-[var(--text-secondary)] block">News & Buzz</span>
                <span className="font-bold">{analysis.newsScore}/100</span>
              </div>
            )}
            {analysis.fundamentalScore !== undefined && (
              <div>
                <span className="text-[8px] text-[var(--text-secondary)] block">Fundamentals</span>
                <span className="font-bold">{analysis.fundamentalScore}/100</span>
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
};
export default StockAnalysisPanel;
