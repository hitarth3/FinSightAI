import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { creditCardService } from '../../services/creditCardService';
import { GlassCard } from '../ui/GlassCard';
import { ErrorState } from '../ui/ErrorState';
import { Wallet, ShieldAlert, Award, Compass, Landmark } from 'lucide-react';

export const SummaryCards: React.FC = () => {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['creditSummary'],
    queryFn: creditCardService.getSummary,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5].map((idx) => (
          <GlassCard key={idx} className="h-28 animate-pulse bg-[var(--surface-subtle)]">
            <div />
          </GlassCard>
        ))}
      </div>
    );
  }

  if (error || !summary) {
    return <ErrorState title="Summary Unavailable" message="Failed to load credit summary statistics." />;
  }

  const {
    total_limit = 0,
    total_outstanding = 0,
    available_credit = 0,
    overall_utilization = 0,
    expected_rewards = 0,
  } = summary;

  // Utilization color coding
  const getUtilColor = (util: number) => {
    if (util > 50) return 'text-red-400 border-red-500/20 bg-red-500/5';
    if (util > 30) return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
    return 'text-green-400 border-green-500/20 bg-green-500/5';
  };

  const getUtilProgressColor = (util: number) => {
    if (util > 50) return 'bg-red-500';
    if (util > 30) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
      {/* 1. Total Limit */}
      <GlassCard className="flex flex-col justify-between h-full hover:border-blue-500/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">Total Limit</span>
          <div className="p-1.5 rounded bg-[var(--surface-subtle)] text-blue-400">
            <Landmark className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-black text-[var(--text-primary)]">₹{total_limit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
          <span className="text-[10px] text-[var(--text-secondary)]/40 block mt-1">Aggregated across all cards</span>
        </div>
      </GlassCard>

      {/* 2. Outstanding Balance */}
      <GlassCard className="flex flex-col justify-between h-full hover:border-red-500/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">Outstanding</span>
          <div className="p-1.5 rounded bg-[var(--surface-subtle)] text-red-400">
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-black text-red-400">₹{total_outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
          <span className="text-[10px] text-[var(--text-secondary)]/40 block mt-1">Total unpaid liabilities</span>
        </div>
      </GlassCard>

      {/* 3. Available Credit */}
      <GlassCard className="flex flex-col justify-between h-full hover:border-green-500/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">Available Credit</span>
          <div className="p-1.5 rounded bg-[var(--surface-subtle)] text-emerald-400">
            <Compass className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-black text-emerald-400">₹{available_credit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
          <span className="text-[10px] text-[var(--text-secondary)]/40 block mt-1">Safe-to-spend limit remaining</span>
        </div>
      </GlassCard>

      {/* 4. Overall Utilization */}
      <GlassCard className={`flex flex-col justify-between h-full transition-all duration-300 border hover:border-opacity-50`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">Overall Utilization</span>
          <div className={`p-1.5 rounded bg-[var(--surface-subtle)] ${getUtilColor(overall_utilization).split(' ')[0]}`}>
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h4 className={`text-xl font-black ${getUtilColor(overall_utilization).split(' ')[0]}`}>
            {overall_utilization.toFixed(1)}%
          </h4>
          <div className="w-full bg-[var(--surface-raised)] rounded-full h-1 mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getUtilProgressColor(overall_utilization)}`} 
              style={{ width: `${Math.min(overall_utilization, 100)}%` }} 
            />
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]/45 block mt-1.5">
            {overall_utilization > 30 ? 'Exceeds recommended 30%' : 'Healthy utilization range'}
          </span>
        </div>
      </GlassCard>

      {/* 5. Expected Rewards */}
      <GlassCard className="flex flex-col justify-between h-full hover:border-yellow-500/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">Expected Rewards</span>
          <div className="p-1.5 rounded bg-[var(--surface-subtle)] text-yellow-400">
            <Award className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-black text-yellow-400">₹{expected_rewards.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
          <span className="text-[10px] text-[var(--text-secondary)]/40 block mt-1">Forecasted cashback & values</span>
        </div>
      </GlassCard>
    </div>
  );
};
