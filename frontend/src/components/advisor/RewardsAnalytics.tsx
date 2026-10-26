import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { advisorService, RewardSummary } from '../../services/advisorService';
import { GlassCard } from '../ui/GlassCard';
import { TrendingUp, TrendingDown, Award, Target, BarChart3, Calendar, Zap, Trophy } from 'lucide-react';

// ── Metric Card ──────────────────────────────────────────────────────────────
const MetricCell: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  color?: string;
  sub?: string;
  highlight?: boolean;
}> = ({ label, value, icon: Icon, color = 'text-[var(--primary-color)]', sub, highlight }) => (
  <GlassCard className={`p-4 flex flex-col gap-2 ${highlight ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : ''}`}>
    <div className="flex items-center justify-between">
      <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/60">{label}</span>
      <div className={`p-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-color)] ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
    </div>
    <h4 className={`text-xl font-black text-[var(--text-primary)] ${highlight ? 'text-emerald-400' : ''}`}>{value}</h4>
    {sub && <p className="text-[9px] text-[var(--text-secondary)]/60 truncate">{sub}</p>}
  </GlassCard>
);

// ── Cap Usage Bar ─────────────────────────────────────────────────────────────
const CapBar: React.FC<{ label: string; used: number; max: number }> = ({ label, used, max }) => {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[8.5px]">
        <span className="text-[var(--text-secondary)] truncate max-w-[60%]">{label}</span>
        <span className="text-[var(--text-secondary)] font-semibold">₹{used.toFixed(0)} / ₹{max.toFixed(0)}</span>
      </div>
      <div className="w-full bg-[var(--surface-raised)] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const RewardsAnalytics: React.FC = () => {
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['rewardAnalytics'],
    queryFn: advisorService.getRewardAnalytics,
    staleTime: 5 * 60 * 1000,
  });

  const { data: summaries, isLoading: summaryLoading } = useQuery({
    queryKey: ['rewardSummary'],
    queryFn: advisorService.getRewardSummary,
    staleTime: 5 * 60 * 1000,
  });

  if (analyticsLoading || summaryLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <GlassCard key={i} className="p-4 animate-pulse">
              <div className="h-2.5 bg-[var(--surface-raised)] rounded-lg w-1/2 mb-3" />
              <div className="h-6 bg-[var(--surface-raised)] rounded-lg w-3/4" />
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Key Metrics Grid ── */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCell
            label="Monthly Cashback"
            value={`₹${analytics.monthly_cashback.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon={TrendingUp}
            color="text-emerald-400"
            sub="Estimated for current month"
            highlight
          />
          <MetricCell
            label="Annual Cashback"
            value={`₹${analytics.annual_cashback.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon={Award}
            color="text-yellow-400"
            sub="Actual tracked this year"
          />
          <MetricCell
            label="Annual Forecast"
            value={`₹${(analytics.annual_forecast || analytics.monthly_cashback * 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon={Zap}
            color="text-violet-400"
            sub="Projected 12-month rewards"
          />
          <MetricCell
            label="Points Earned"
            value={analytics.reward_points_earned.toLocaleString('en-IN')}
            icon={Target}
            color="text-[var(--primary-color)]"
            sub="Total across all cards"
          />
          <MetricCell
            label="Missed Rewards"
            value={`₹${analytics.missed_rewards.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon={TrendingDown}
            color="text-red-400"
            sub="Could be optimized with advisor"
          />
          <MetricCell
            label="Best Card"
            value={analytics.best_performing_card.length > 16 ? analytics.best_performing_card.split(' ').slice(-1)[0] : analytics.best_performing_card}
            icon={Trophy}
            color="text-emerald-400"
            sub={analytics.best_performing_card}
          />
          <MetricCell
            label="Underperformer"
            value={analytics.worst_performing_card.length > 16 ? analytics.worst_performing_card.split(' ').slice(-1)[0] : analytics.worst_performing_card}
            icon={BarChart3}
            color="text-orange-400"
            sub="Lowest utilization efficiency"
          />
          <MetricCell
            label="Optimization Gap"
            value={`₹${Math.max(0, analytics.missed_rewards - analytics.monthly_cashback).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon={TrendingUp}
            color="text-amber-400"
            sub="Use Smart Advisor to close gap"
          />
        </div>
      )}

      {/* ── Monthly Cap Usage Bars ── */}
      {analytics?.cap_usage_summary && analytics.cap_usage_summary.length > 0 && (
        <GlassCard className="p-5">
          <h4 className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/60 mb-4 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-violet-400" /> Monthly Reward Cap Usage
          </h4>
          <div className="space-y-3">
            {analytics.cap_usage_summary.map((entry, i) => (
              <CapBar
                key={i}
                label={`Card ${entry.card_id.slice(0, 8)}...`}
                used={entry.reward_earned}
                max={entry.cap_used > 0 ? entry.cap_used * 1.5 : 1000}
              />
            ))}
          </div>
          <p className="text-[8px] text-[var(--text-secondary)]/40 mt-3">Cap data reflects advisor-tracked recommendation sessions this month.</p>
        </GlassCard>
      )}

      {/* ── Monthly Reward Ledger ── */}
      {summaries && summaries.length > 0 && (
        <GlassCard className="p-5">
          <h4 className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/60 mb-4 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Monthly Reward Ledger
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[8.5px] uppercase tracking-widest text-[var(--text-secondary)]/50 border-b border-[var(--border-color)]">
                  <th className="text-left pb-2.5 font-bold">Month</th>
                  <th className="text-left pb-2.5 font-bold">Cards Used</th>
                  <th className="text-right pb-2.5 font-bold text-emerald-400">Earned</th>
                  <th className="text-right pb-2.5 font-bold text-red-400">Missed</th>
                  <th className="text-right pb-2.5 font-bold text-violet-400 hidden md:table-cell">Forecast</th>
                  <th className="text-left pb-2.5 font-bold hidden lg:table-cell">Top Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {summaries.map((row: RewardSummary, i: number) => {
                  const missedRatio = row.rewards_earned > 0
                    ? (row.rewards_missed / (row.rewards_earned + row.rewards_missed)) * 100
                    : 0;
                  return (
                    <tr key={i} className="hover:bg-[var(--surface-muted)] transition-colors duration-150">
                      <td className="py-2.5 font-semibold text-[var(--text-primary)]">{row.month}</td>
                      <td className="py-2.5 text-[var(--text-secondary)]/60 max-w-[100px] truncate">{row.cards_used || '—'}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">
                        ₹{row.rewards_earned.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={`font-bold ${missedRatio > 50 ? 'text-red-400' : missedRatio > 25 ? 'text-yellow-400' : 'text-[var(--text-secondary)]'}`}>
                          ₹{row.rewards_missed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-violet-400 hidden md:table-cell">
                        ₹{(row.annual_forecast || row.rewards_earned * 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 text-[var(--text-secondary)]/60 hidden lg:table-cell truncate max-w-[100px]">
                        {row.top_categories || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {!analytics && !analyticsLoading && (
        <GlassCard className="p-10 text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-3 text-[var(--text-secondary)]/40" />
          <p className="font-bold text-[var(--text-primary)] mb-1">No Analytics Yet</p>
          <p className="text-xs text-[var(--text-secondary)]/60">Add credit cards and record transactions to unlock reward intelligence.</p>
        </GlassCard>
      )}
    </div>
  );
};

export default RewardsAnalytics;
