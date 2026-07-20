import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { creditCardService, UserCreditCard } from '../../services/creditCardService';
import { useToasts } from '../../context/ToastContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { Edit2, Trash2, Info, ExternalLink, RefreshCw, Cpu, Wifi, Plane, Zap } from 'lucide-react';

interface CreditCardListProps {
  cards: UserCreditCard[];
  onEditCard: (card: UserCreditCard) => void;
  onAddClick: () => void;
}

// ── Bank colour mapping ───────────────────────────────────────────────────────
function getCardTheme(bankName: string): {
  gradient: string;
  border: string;
  accent: string;
  chipGlow: string;
} {
  const b = (bankName || '').toLowerCase();
  if (b.includes('hdfc'))
    return { gradient: 'from-blue-900 via-indigo-950 to-slate-950', border: 'border-blue-500/20', accent: '#6366f1', chipGlow: '#818cf8' };
  if (b.includes('icici'))
    return { gradient: 'from-orange-950 via-amber-950 to-zinc-950', border: 'border-orange-500/20', accent: '#f59e0b', chipGlow: '#fbbf24' };
  if (b.includes('sbi'))
    return { gradient: 'from-teal-950 via-cyan-950 to-neutral-950', border: 'border-teal-500/20', accent: '#14b8a6', chipGlow: '#2dd4bf' };
  if (b.includes('axis'))
    return { gradient: 'from-rose-950 via-purple-950 to-stone-950', border: 'border-rose-500/20', accent: '#f43f5e', chipGlow: '#fb7185' };
  if (b.includes('hsbc'))
    return { gradient: 'from-red-950 via-rose-950 to-slate-950', border: 'border-red-500/20', accent: '#ef4444', chipGlow: '#f87171' };
  if (b.includes('kotak'))
    return { gradient: 'from-gray-900 via-zinc-950 to-black', border: 'border-gray-500/20', accent: '#6b7280', chipGlow: '#9ca3af' };
  if (b.includes('amex'))
    return { gradient: 'from-yellow-950 via-amber-950 to-zinc-950', border: 'border-yellow-500/20', accent: '#d97706', chipGlow: '#fbbf24' };
  if (b.includes('au small') || b.includes('au bank'))
    return { gradient: 'from-violet-950 via-purple-950 to-slate-950', border: 'border-violet-500/20', accent: '#8b5cf6', chipGlow: '#a78bfa' };
  if (b.includes('indusind'))
    return { gradient: 'from-emerald-950 via-green-950 to-slate-950', border: 'border-emerald-500/20', accent: '#10b981', chipGlow: '#34d399' };
  if (b.includes('yes'))
    return { gradient: 'from-cyan-950 via-sky-950 to-slate-950', border: 'border-cyan-500/20', accent: '#06b6d4', chipGlow: '#22d3ee' };
  if (b.includes('idfc'))
    return { gradient: 'from-pink-950 via-fuchsia-950 to-slate-950', border: 'border-pink-500/20', accent: '#ec4899', chipGlow: '#f472b6' };
  if (b.includes('federal') || b.includes('scapia'))
    return { gradient: 'from-indigo-950 via-blue-950 to-slate-950', border: 'border-indigo-500/20', accent: '#4f46e5', chipGlow: '#818cf8' };
  return { gradient: 'from-indigo-950 via-violet-950 to-slate-950', border: 'border-violet-500/20', accent: '#7c3aed', chipGlow: '#a78bfa' };
}

// ── Utilization helpers ───────────────────────────────────────────────────────
function getUtil(outstanding: number, limit: number) {
  if (limit <= 0) return 0;
  return (outstanding / limit) * 100;
}
function utilBarColor(u: number) {
  if (u > 50) return '#ef4444';
  if (u > 30) return '#f59e0b';
  return '#10b981';
}
function utilBadge(u: number) {
  const label = `${u.toFixed(1)}% Used`;
  if (u > 50) return <GlassBadge variant="error">{label}</GlassBadge>;
  if (u > 30) return <GlassBadge variant="warning">{label}</GlassBadge>;
  return <GlassBadge variant="success">{label}</GlassBadge>;
}

// ── Render rules from normalized schema ──────────────────────────────────────
function renderRewardRules(rules_json: any): React.ReactNode {
  if (!rules_json) return <span className="text-[var(--text-secondary)]/50 italic text-[9px]">Standard reward logic</span>;

  const rules = rules_json.rules as Array<{
    category: string; rate: number; monthly_cap?: number | null;
    applicable_channels?: string[]; partner_merchants?: string[];
  }> | undefined;

  const baseRate = rules_json.base_rate;
  const pointVal = rules_json.reward_point_value;
  const loungeDom = rules_json.lounge_domestic;
  const loungeIntl = rules_json.lounge_international;
  const fuelWaiver = rules_json.fuel_waiver_rate;

  return (
    <div className="space-y-1.5">
      {rules && rules.slice(0, 4).map((r, i) => (
        <div key={i} className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="capitalize text-[var(--text-secondary)] text-[8.5px] block truncate">
              {r.category.replace('_', ' ')}
              {r.applicable_channels?.includes('online') && !r.applicable_channels?.includes('offline') &&
                <span className="ml-1 text-violet-400/60">(online)</span>}
            </span>
            {r.partner_merchants && r.partner_merchants.length > 0 && (
              <span className="text-[7.5px] text-[var(--text-secondary)]/50 truncate max-w-[100px]">
                {r.partner_merchants.slice(0, 2).join(', ')}{r.partner_merchants.length > 2 ? '…' : ''}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="text-[9px] font-bold text-emerald-400">{r.rate}%</span>
            {r.monthly_cap != null && (
              <span className="text-[7.5px] text-yellow-400/70 block">cap ₹{r.monthly_cap}</span>
            )}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)] mt-1">
        <span className="text-[8px] text-white/35">Base / Point Value</span>
        <span className="text-[8px] text-[var(--text-secondary)] font-semibold">{baseRate}% / ₹{pointVal}</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export const CreditCardList: React.FC<CreditCardListProps> = ({ cards, onEditCard, onAddClick }) => {
  const queryClient = useQueryClient();
  const toasts = useToasts();
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const toggleFlip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const deleteMutation = useMutation({
    mutationFn: creditCardService.deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
      queryClient.invalidateQueries({ queryKey: ['creditSummary'] });
      queryClient.invalidateQueries({ queryKey: ['creditInsights'] });
      toasts.success('Card Removed', 'The credit card record was cleanly removed.');
    },
    onError: () => toasts.error('Delete Failed', 'Could not remove the credit card.'),
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Remove this credit card?')) deleteMutation.mutate(id);
  };

  if (cards.length === 0) {
    return (
      <GlassCard className="p-10 flex flex-col items-center justify-center text-center gap-6 border-dashed border-[var(--border-color)] bg-white/[0.01]">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-color)] flex items-center justify-center">
          <Cpu className="w-7 h-7 text-[var(--text-secondary)]/40" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">No Credit Cards Synced</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm">
            Add your active credit cards to track balances, utilization, billing cycles, and AI-powered cashback recommendations.
          </p>
        </div>
        <GlassButton onClick={onAddClick} className="py-2.5 px-6 text-xs font-bold">
          Sync Your First Card
        </GlassButton>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card) => {
        const isFlipped = !!flippedCards[card.id];
        const util = getUtil(card.outstanding, card.credit_limit);
        const available = card.credit_limit - card.outstanding;
        const theme = getCardTheme(card.catalog?.bank_name || '');
        const rulesJson = card.catalog?.reward_rules_json;
        const loungeDom: number = rulesJson?.lounge_domestic ?? 0;
        const loungeIntl: number = rulesJson?.lounge_international ?? 0;

        // Days to due date
        const today = new Date();
        const due = new Date(card.due_date);
        const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return (
          <div key={card.id} className="flex flex-col gap-3">
            {/* ── 3D Flip Container ── */}
            <div className="w-full" style={{ aspectRatio: '1.586 / 1', perspective: '1000px' }}>
              <div
                className="w-full h-full relative"
                style={{
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* ── CARD FRONT ── */}
                <div
                  className={`absolute inset-0 w-full h-full p-5 rounded-[20px] bg-gradient-to-br border flex flex-col justify-between overflow-hidden ${theme.gradient} ${theme.border}`}
                  style={{ backfaceVisibility: 'hidden', boxShadow: `0 20px 60px -10px ${theme.accent}30` }}
                >
                  {/* Glowing orb top-left */}
                  <div
                    className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-30"
                    style={{ backgroundColor: theme.accent }}
                  />
                  {/* Glowing orb bottom-right */}
                  <div
                    className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20"
                    style={{ backgroundColor: theme.chipGlow }}
                  />

                  {/* Top row: Bank + Card name + flip */}
                  <div className="flex items-start justify-between z-10">
                    <div>
                      <h4 className="text-sm font-black tracking-tight text-white uppercase leading-none">
                        {card.catalog?.bank_name}
                      </h4>
                      <span className="text-[9px] font-bold text-[var(--text-secondary)] tracking-widest uppercase block mt-0.5">
                        {card.catalog?.card_type || 'Credit Card'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-white/75 italic">
                        {card.catalog?.card_name}
                      </span>
                      <button
                        onClick={(e) => toggleFlip(card.id, e)}
                        className="p-1 rounded-md bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
                        title="View reward details"
                      >
                        <Info className="w-3 h-3 text-white/70" />
                      </button>
                    </div>
                  </div>

                  {/* EMV Chip + Network */}
                  <div className="flex items-center gap-3 z-10">
                    <div
                      className="w-9 h-7 rounded-md border flex items-center justify-center relative overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${theme.chipGlow}22, ${theme.accent}15)`, borderColor: `${theme.chipGlow}30` }}
                    >
                      {/* Chip lines */}
                      <div className="absolute inset-0 flex flex-col justify-center gap-[2px] px-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="h-[1.5px] bg-current opacity-20 rounded-full" style={{ color: theme.chipGlow }} />
                        ))}
                      </div>
                      <Cpu className="w-4 h-4 relative z-10" style={{ color: theme.chipGlow, opacity: 0.7 }} />
                    </div>
                    <Wifi className="w-4 h-4 text-[var(--text-secondary)]/40 rotate-90" />
                    <span className="text-xs font-mono tracking-widest text-[var(--text-secondary)]/60">
                      •••• •••• •••• {card.id.slice(0, 4).toUpperCase()}
                    </span>
                  </div>

                  {/* Bottom: balances + utilization bar */}
                  <div className="z-10 space-y-2">
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-[7.5px] uppercase tracking-widest text-white/35 block">Outstanding</span>
                        <h5 className="text-base font-black text-white leading-tight">
                          ₹{card.outstanding.toLocaleString('en-IN')}
                        </h5>
                      </div>
                      <div className="text-right">
                        <span className="text-[7.5px] uppercase tracking-widest text-white/35 block">Available</span>
                        <span className="text-sm font-black" style={{ color: util > 50 ? '#f87171' : '#34d399' }}>
                          ₹{available.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Utilization bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-[var(--surface-raised)] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(util, 100)}%`, backgroundColor: utilBarColor(util) }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[7.5px] text-[var(--text-secondary)]/60">Limit ₹{card.credit_limit.toLocaleString('en-IN')}</span>
                        {utilBadge(util)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── CARD BACK ── */}
                <div
                  className={`absolute inset-0 w-full h-full p-0 rounded-[20px] bg-gradient-to-br border flex flex-col overflow-hidden ${theme.gradient} ${theme.border}`}
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    boxShadow: `0 20px 60px -10px ${theme.accent}30`
                  }}
                >
                  {/* Magnetic strip */}
                  <div className="w-full h-7 bg-black/70 shrink-0 mt-4" />

                  {/* Back content */}
                  <div className="flex-1 p-4 flex flex-col justify-between overflow-hidden">
                    {/* Reward structure */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[8px] uppercase font-bold tracking-wider text-white/35 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" style={{ color: theme.accent }} /> Reward Rules
                        </span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border text-[var(--text-secondary)]"
                          style={{ borderColor: `${theme.accent}30`, backgroundColor: `${theme.accent}10` }}>
                          {card.catalog?.reward_type || 'Points'}
                        </span>
                      </div>
                      {renderRewardRules(rulesJson)}
                    </div>

                    {/* Benefits row */}
                    <div className="space-y-1.5">
                      {(loungeDom > 0 || loungeIntl > 0) && (
                        <div className="flex items-center justify-between text-[8px]">
                          <span className="text-white/35 flex items-center gap-1">
                            <Plane className="w-2.5 h-2.5" style={{ color: theme.chipGlow }} /> Lounge
                          </span>
                          <span className="text-[var(--text-secondary)] font-semibold">
                            {loungeDom > 100 ? 'Unlimited' : `${loungeDom}`} dom
                            {loungeIntl > 0 ? ` · ${loungeIntl > 100 ? 'Unlimited' : loungeIntl} intl` : ''}
                          </span>
                        </div>
                      )}

                      {/* Fees + controls */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-color)]">
                        <div className="flex gap-3">
                          <div>
                            <span className="text-[7px] text-[var(--text-secondary)]/50 block">Join</span>
                            <span className="text-[8.5px] font-bold text-[var(--text-secondary)]">₹{card.catalog?.joining_fee}</span>
                          </div>
                          <div>
                            <span className="text-[7px] text-[var(--text-secondary)]/50 block">Annual</span>
                            <span className="text-[8.5px] font-bold text-[var(--text-secondary)]">₹{card.catalog?.annual_fee}</span>
                          </div>
                          <div>
                            <span className="text-[7px] text-[var(--text-secondary)]/50 block">Cycle</span>
                            <span className="text-[8.5px] font-bold text-[var(--text-secondary)]">Day {card.billing_date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {card.catalog?.official_url && (
                            <a
                              href={card.catalog.official_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[8px] text-blue-300 hover:text-[var(--text-primary)] flex items-center gap-0.5 transition-all"
                            >
                              <ExternalLink className="w-2 h-2" /> URL
                            </a>
                          )}
                          <button
                            onClick={(e) => toggleFlip(card.id, e)}
                            className="px-2 py-0.5 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] text-[8px] text-[var(--text-primary)] font-bold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <RefreshCw className="w-2 h-2" /> Front
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Action row below card ── */}
            <div className="flex items-center gap-2 px-1">
              <span className={`text-[9px] font-medium mr-auto ${
                daysLeft <= 3 ? 'text-red-400' : daysLeft <= 7 ? 'text-yellow-400' : 'text-[var(--text-secondary)]/60'
              }`}>
                Due: {new Date(card.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                {daysLeft >= 0 && daysLeft <= 7 && (
                  <span className="ml-1 text-[8px]">({daysLeft}d)</span>
                )}
              </span>
              <GlassButton
                variant="outline"
                onClick={() => onEditCard(card)}
                className="py-1 px-3 text-[10px] border-[var(--border-color)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </GlassButton>
              <GlassButton
                variant="outline"
                onClick={(e) => handleDelete(e, card.id)}
                className="py-1 px-2 text-[10px] border-red-500/10 hover:bg-red-500/10 text-red-400 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </GlassButton>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CreditCardList;
