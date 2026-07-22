import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { advisorService, BestCardResponse, CardRankingItem } from '../../services/advisorService';
import { useToasts } from '../../context/ToastContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import {
  Sparkles, Brain, Award, ShieldAlert, Search,
  TrendingUp, Zap, BarChart2, CheckCircle, CircleDot, ChevronRight, Star
} from 'lucide-react';

// ── Confidence ring arc indicator ────────────────────────────────────────────
const ConfidenceRing: React.FC<{ score: number; size?: number }> = ({ score, size = 80 }) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-lg font-black text-[var(--text-primary)] leading-none">{score}</span>
        <span className="text-[7px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">Score</span>
      </div>
    </div>
  );
};

// ── Small card tile for rankings / alternatives ───────────────────────────────
const CardTile: React.FC<{
  card: CardRankingItem;
  rank: number;
  isWinner?: boolean;
}> = ({ card, rank, isWinner }) => {
  const rankColors = ['text-yellow-400', 'text-slate-400', 'text-orange-600'];
  const rankLabel = ['🏆 Best', '🥈 Alt', '🥉 Fallback'];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
      isWinner
        ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
        : 'border-[var(--border-color)] bg-[var(--surface-muted)] hover:bg-[var(--surface-muted)]'
    }`}>
      <div className="shrink-0">
        <span className={`text-xs font-black ${rankColors[rank] || 'text-[var(--text-secondary)]'}`}>#{rank + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-[var(--text-primary)] truncate">{card.bank_name} {card.card_name}</span>
          {rank < 3 && (
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
              rank === 0 ? 'border-emerald-500/30 text-emerald-400' :
              rank === 1 ? 'border-slate-500/30 text-slate-400' :
              'border-orange-600/30 text-orange-500'
            }`}>{rankLabel[rank]}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[9px] text-[var(--text-secondary)]">Rate: {card.reward_rate}%</span>
          {card.utilization_pct !== undefined && (
            <span className={`text-[9px] ${card.utilization_pct > 50 ? 'text-red-400' : card.utilization_pct > 30 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              Util: {card.utilization_pct.toFixed(0)}%
            </span>
          )}
          {card.monthly_cap_remaining !== null && card.monthly_cap_remaining !== undefined && (
            <span className="text-[9px] text-violet-400">Cap left: ₹{card.monthly_cap_remaining.toFixed(0)}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className={`text-sm font-black block ${isWinner ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
          ₹{card.expected_rewards.toFixed(2)}
        </span>
        {!isWinner && card.additional_savings > 0 && (
          <span className="text-[8px] text-red-400">-₹{card.additional_savings.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
};

// ── Main BestCardFinder component ─────────────────────────────────────────────
export const BestCardFinder: React.FC = () => {
  const toasts = useToasts();
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('General Spending');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<BestCardResponse | null>(null);
  const [isResolvingMerchant, setIsResolvingMerchant] = useState(false);
  const [resolvedCategory, setResolvedCategory] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categories = [
    'Groceries', 'Dining', 'Online Shopping', 'Travel', 'Fuel', 'Movies',
    'Utilities', 'Electronics', 'Fashion', 'Healthcare', 'General Spending',
  ];

  // Client-side fast merchant alias map (before hitting API)
  const quickResolve = (val: string): string | null => {
    const m = val.toLowerCase().trim();
    if (!m) return null;
    if (/dmart|reliance fresh|bigbasket|blinkit|grofers|spencer|nature.s basket/.test(m)) return 'Groceries';
    if (/zomato|swiggy|dominos|mcdonald|pizza hut|kfc|starbucks|eazydiner/.test(m)) return 'Dining';
    if (/amazon|flipkart|myntra|ajio|nykaa|meesho|tata cliq/.test(m)) return 'Online Shopping';
    if (/uber|ola|rapido|irctc|makemytrip|goibibo|cleartrip|yatra|easemytrip/.test(m)) return 'Travel';
    if (/bpcl|hpcl|hp petrol|indian oil|shell|petrol|fuel/.test(m)) return 'Fuel';
    if (/pvr|inox|bookmyshow|cinepolis|movie/.test(m)) return 'Movies';
    if (/airtel|jio|bescom|mseb|netflix|hotstar|bill|utility/.test(m)) return 'Utilities';
    if (/apollo|medplus|netmeds|1mg|pharmeasy|health/.test(m)) return 'Healthcare';
    if (/h&m|zara|westside|pantaloons|fashion|clothing/.test(m)) return 'Fashion';
    return null;
  };

  const handleMerchantChange = (val: string) => {
    setMerchant(val);
    const quick = quickResolve(val);
    if (quick) {
      setCategory(quick);
      setResolvedCategory(quick);
      setIsResolvingMerchant(false);
    } else if (val.trim().length >= 3) {
      setIsResolvingMerchant(true);
      setResolvedCategory(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const lookup = await advisorService.merchantLookup(val.trim());
          setCategory(lookup.category);
          setResolvedCategory(`${lookup.category} ${lookup.ai_classified ? '(AI)' : '(DB)'}`);
        } catch {
          // keep current
        } finally {
          setIsResolvingMerchant(false);
        }
      }, 800);
    } else {
      setIsResolvingMerchant(false);
      setResolvedCategory(null);
    }
  };

  const mutation = useMutation({
    mutationFn: advisorService.getBestCard,
    onSuccess: (data) => {
      setResult(data);
      if (data.best_card) {
        toasts.success(
          'Best Card Identified',
          `${data.best_card.bank_name} ${data.best_card.card_name} earns ₹${data.best_card.expected_rewards.toFixed(2)} (Score: ${data.best_card.confidence_score}/100)`
        );
      }
    },
    onError: (err: any) => {
      toasts.error('Calculation Failed', err.message || 'An error occurred.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toasts.error('Missing Input', 'Enter a valid transaction amount.');
      return;
    }
    mutation.mutate({ merchant: merchant || undefined, category, amount: parseFloat(amount) });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* ── INPUT PANEL ── */}
      <GlassCard className="lg:col-span-2 p-5" glow>
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--border-color)]">
          <div className="p-1.5 rounded-lg bg-violet-500/10">
            <Zap className="w-4 h-4 text-violet-400" />
          </div>
          <h3 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider">Reward Simulator</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Merchant input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
              Merchant Name <span className="text-[var(--text-secondary)]/40">(auto-detects category)</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]/40" />
              <input
                type="text"
                placeholder="e.g. DMart, Swiggy, Amazon, IRCTC..."
                value={merchant}
                onChange={(e) => handleMerchantChange(e.target.value)}
                className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-violet-500/40 transition-colors placeholder:text-[var(--text-secondary)]/50"
              />
            </div>
            {isResolvingMerchant && (
              <span className="text-[9px] text-violet-400/70 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                AI resolving merchant category...
              </span>
            )}
            {resolvedCategory && !isResolvingMerchant && (
              <span className="text-[9px] text-emerald-400/80 flex items-center gap-1">
                <CheckCircle className="w-2.5 h-2.5" />
                Resolved: {resolvedCategory}
              </span>
            )}
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
              Spend Category <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setResolvedCategory(e.target.value); }}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-violet-500/40 transition-colors cursor-pointer appearance-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{cat}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
              Purchase Amount (₹) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-violet-500/40 transition-colors"
            />
          </div>

          <GlassButton
            type="submit"
            disabled={mutation.isPending}
            fullWidth
            className="py-3 font-extrabold uppercase bg-gradient-to-r from-violet-600/20 to-indigo-600/20 hover:from-violet-600/30 hover:to-indigo-600/30 border-violet-500/30"
          >
            {mutation.isPending ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-3 h-3 border-2 border-[var(--border-color)] border-t-white rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                <Sparkles className="w-3.5 h-3.5" />
                Find Best Card
              </span>
            )}
          </GlassButton>
        </form>

        {/* Quick picks */}
        <div className="mt-5 pt-4 border-t border-[var(--border-color)]">
          <p className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)]/50 mb-2">Quick Merchants</p>
          <div className="flex flex-wrap gap-1.5">
            {['DMart', 'Swiggy', 'Amazon', 'IRCTC', 'Shell', 'Netflix'].map((m) => (
              <button
                key={m}
                onClick={() => handleMerchantChange(m)}
                className="text-[9px] px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)] transition-all cursor-pointer"
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* ── RESULTS PANEL ── */}
      <div className="lg:col-span-3 space-y-4">
        {result ? (
          result.best_card ? (
            <>
              {/* ── Winner card ── */}
              <GlassCard className="border-emerald-500/20 bg-emerald-500/[0.02]" glow>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400">
                        Best Card Recommendation
                      </span>
                    </div>
                    <h4 className="text-xl font-black text-[var(--text-primary)] truncate">
                      {result.best_card.bank_name} {result.best_card.card_name}
                    </h4>
                    {result.best_card.nickname && (
                      <p className="text-[9px] text-[var(--text-secondary)] font-mono uppercase mt-0.5">{result.best_card.nickname}</p>
                    )}

                    {/* Key metrics row */}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <div className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[8px] text-[var(--text-secondary)] block uppercase">Cashback</span>
                        <span className="text-sm font-black text-emerald-400">₹{result.best_card.expected_rewards.toFixed(2)}</span>
                      </div>
                      <div className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-color)]">
                        <span className="text-[8px] text-[var(--text-secondary)] block uppercase">Rate</span>
                        <span className="text-sm font-black text-[var(--text-primary)]">{result.best_card.reward_rate}%</span>
                      </div>
                      {result.best_card.monthly_cap_remaining !== null && (
                        <div className="px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20">
                          <span className="text-[8px] text-[var(--text-secondary)] block uppercase">Cap Left</span>
                          <span className="text-sm font-black text-violet-400">₹{result.best_card.monthly_cap_remaining?.toFixed(0)}</span>
                        </div>
                      )}
                      <div className={`px-2 py-1 rounded-lg border ${result.best_card.utilization_pct > 50 ? 'bg-red-500/10 border-red-500/20' : 'bg-[var(--surface-subtle)] border-[var(--border-color)]'}`}>
                        <span className="text-[8px] text-[var(--text-secondary)] block uppercase">Util</span>
                        <span className={`text-sm font-black ${result.best_card.utilization_pct > 50 ? 'text-red-400' : result.best_card.utilization_pct > 30 ? 'text-yellow-400' : 'text-[var(--text-primary)]'}`}>
                          {result.best_card.utilization_pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Confidence Ring */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <ConfidenceRing score={Math.round(result.best_card.confidence_score)} />
                    <span className="text-[8px] text-[var(--text-secondary)]/60 uppercase tracking-widest text-center">Confidence</span>
                  </div>
                </div>

                {/* AI Explanation */}
                <div className="mt-4 p-3.5 rounded-xl border border-violet-500/15 bg-violet-500/[0.03]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Brain className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[9px] uppercase font-bold tracking-wider text-violet-400">AI Advisor Explanation</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                    "{result.explanation}"
                  </p>
                </div>
              </GlassCard>

              {/* ── Alternative + Fallback cards ── */}
              {(result.alternative_card || result.fallback_card) && (
                <GlassCard className="p-4">
                  <h4 className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/60 mb-3 flex items-center gap-1.5">
                    <BarChart2 className="w-3 h-3" />
                    Alternatives
                  </h4>
                  <div className="space-y-2">
                    {result.alternative_card && (
                      <CardTile card={result.alternative_card} rank={1} />
                    )}
                    {result.fallback_card && (
                      <CardTile card={result.fallback_card} rank={2} />
                    )}
                  </div>
                </GlassCard>
              )}

              {/* ── Full Rankings ── */}
              {result.rankings.length > 1 && (
                <GlassCard className="p-4">
                  <h4 className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/60 mb-3 flex items-center gap-1.5">
                    <Star className="w-3 h-3" />
                    All Cards Ranked by Score
                  </h4>
                  <div className="space-y-1.5">
                    {result.rankings.map((card, idx) => (
                      <CardTile key={card.card_id} card={card} rank={idx} isWinner={idx === 0} />
                    ))}
                  </div>
                </GlassCard>
              )}
            </>
          ) : (
            <GlassCard className="p-8 text-center">
              <ShieldAlert className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <p className="font-bold text-[var(--text-primary)] mb-1">Credit Limit Issue</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                {result.explanation || 'Transaction amount exceeds available credit on all registered cards.'}
              </p>
            </GlassCard>
          )
        ) : (
          <GlassCard className="p-12 text-center border-dashed border-[var(--border-color)] bg-white/[0.01] h-full flex flex-col justify-center items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-violet-400 animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              </div>
            </div>
            <div>
              <h4 className="text-[var(--text-primary)] font-bold text-sm mb-1">Reward Optimizer Ready</h4>
              <p className="text-xs text-[var(--text-secondary)]/60 leading-relaxed max-w-xs">
                Enter a merchant or category and transaction amount to find your highest-reward card with AI-powered confidence scoring.
              </p>
            </div>
            <div className="flex flex-col items-start gap-1.5 text-[9px] text-[var(--text-secondary)]/50">
              <div className="flex items-center gap-1.5"><CircleDot className="w-3 h-3 text-emerald-400/50" /> Normalized reward calculator with monthly cap tracking</div>
              <div className="flex items-center gap-1.5"><CircleDot className="w-3 h-3 text-violet-400/50" /> 5-factor confidence scoring (reward + cap + util + due + fee)</div>
              <div className="flex items-center gap-1.5"><CircleDot className="w-3 h-3 text-yellow-400/50" /> AI merchant classification via Groq LLM</div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default BestCardFinder;
