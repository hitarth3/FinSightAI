import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { advisorService, RecommendedCardItem } from '../../services/advisorService';
import { GlassCard } from '../ui/GlassCard';
import { GlassBadge } from '../ui/GlassBadge';
import { Brain, ExternalLink, Star, TrendingUp, IndianRupee, Sparkles } from 'lucide-react';

const CatalogCard: React.FC<{ card: RecommendedCardItem; isBest?: boolean }> = ({ card, isBest }) => {
  return (
    <GlassCard
      className={`p-5 flex flex-col gap-3 transition-all duration-300 ${isBest ? 'border-emerald-500/25 bg-emerald-500/[0.02]' : ''}`}
      glow={isBest}
    >
      {isBest && (
        <div className="flex items-center gap-1.5 mb-1">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-[9px] uppercase font-black tracking-widest text-yellow-400">AI Recommended</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-[var(--text-primary)] text-sm leading-tight">{card.bank_name}</h4>
          <p className="text-[10px] text-[var(--text-secondary)] font-semibold mt-0.5 leading-tight">{card.card_name}</p>
        </div>
        <GlassBadge variant={card.reward_type === 'cashback' ? 'success' : 'neutral'} className="shrink-0 text-[8px]">
          {card.reward_type}
        </GlassBadge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center border-y border-[var(--border-color)] py-3">
        <div>
          <p className="text-[8px] uppercase tracking-wider text-[var(--text-secondary)]/50 font-bold">Annual Fee</p>
          <p className="text-xs font-black text-[var(--text-primary)] mt-0.5">
            {card.annual_fee === 0 ? 'Free' : `₹${card.annual_fee.toLocaleString('en-IN')}`}
          </p>
        </div>
        <div>
          <p className="text-[8px] uppercase tracking-wider text-[var(--text-secondary)]/50 font-bold">Annual Rewards</p>
          <p className="text-xs font-black text-emerald-400 mt-0.5">₹{card.estimated_annual_rewards.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div>
          <p className="text-[8px] uppercase tracking-wider text-[var(--text-secondary)]/50 font-bold">Net Benefit</p>
          <p className={`text-xs font-black mt-0.5 ${card.net_benefit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ₹{card.net_benefit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {card.official_url && (
        <a
          href={card.official_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--primary-color)] hover:opacity-80 transition-opacity"
        >
          <ExternalLink className="w-3 h-3" /> Apply Online
        </a>
      )}
    </GlassCard>
  );
};

export const CardRecommendations: React.FC = () => {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['cardRecommendations'],
    queryFn: advisorService.recommendCard,
    staleTime: 10 * 60 * 1000,
    enabled: false, // manual trigger
  });

  return (
    <div className="space-y-6">
      {/* Header with trigger */}
      <GlassCard className="p-5" glow>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-[var(--primary-color)]" />
              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">AI Card Upgrade Advisor</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              The AI analyzes your spending patterns across categories and matches your profile against the card catalog to recommend the highest-yield credit card you don't yet own.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-tr from-[var(--primary-color)]/20 to-[var(--secondary-color)]/20 hover:from-[var(--primary-color)]/30 hover:to-[var(--secondary-color)]/30 border border-[var(--primary-color)]/30 text-white text-xs font-bold transition-all duration-200 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${(isLoading || isFetching) ? 'animate-spin' : ''}`} />
            {isLoading || isFetching ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </GlassCard>

      {/* AI Reasoning Block */}
      {data?.reasoning && (
        <GlassCard className="p-4 border-[var(--primary-color)]/15">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[var(--primary-color)]/10 shrink-0">
              <Brain className="w-4 h-4 text-[var(--primary-color)]" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold tracking-widest text-[var(--primary-color)] mb-1">Advisor Reasoning</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">"{data.reasoning}"</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Best Recommendation */}
      {data?.recommended_card && (
        <div>
          <p className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 mb-3">
            🏆 Top Recommendation
          </p>
          <CatalogCard card={data.recommended_card} isBest />
        </div>
      )}

      {/* All Options Grid */}
      {data?.all_catalog_options && data.all_catalog_options.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--text-secondary)]/50" />
            <p className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">
              Full Card Catalog Ranking
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.all_catalog_options
              .filter(c => c.catalog_id !== data.recommended_card?.catalog_id)
              .map((card) => (
                <CatalogCard key={card.catalog_id} card={card} />
              ))}
          </div>
        </div>
      )}

      {!data && !isLoading && !isFetching && (
        <GlassCard className="p-12 text-center border-dashed border-[var(--border-color)] bg-white/[0.01]">
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-[var(--surface-subtle)]">
              <IndianRupee className="w-7 h-7 text-[var(--primary-color)]/60" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)] mb-1">No Analysis Run Yet</p>
              <p className="text-xs text-[var(--text-secondary)]/50 max-w-xs mx-auto leading-relaxed">
                Click "Run Analysis" to let the AI scan your spending profile and recommend the highest-yield card upgrade.
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default CardRecommendations;
