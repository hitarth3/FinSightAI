import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenseService';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { ErrorState } from '../ui/ErrorState';
import { Wallet, TrendingUp, DollarSign, PlusCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ExpenseSummaryCardsProps {
  onAddExpenseClick: () => void;
}

export const ExpenseSummaryCards: React.FC<ExpenseSummaryCardsProps> = ({ onAddExpenseClick }) => {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['expenseSummary'],
    queryFn: expenseService.getSummary,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7].map((idx) => (
          <GlassCard key={idx} className={`h-28 animate-pulse bg-[var(--surface-subtle)] ${idx === 4 ? 'lg:row-span-2 lg:h-full lg:min-h-[248px]' : ''}`}>
            <div />
          </GlassCard>
        ))}
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="col-span-full">
        <ErrorState title="Expense Summary" message="Failed to load expense summaries. Please check your connection." />
      </div>
    );
  }

  const { this_month, this_year } = summary;
  const monthlyExpenses = this_month.total_amount || 0;
  const monthlyIncome = this_month.total_income || 0;
  const monthlyNetCashflow = this_month.net_cashflow || 0;

  const yearlyExpenses = this_year?.total_amount || 0;
  const yearlyIncome = this_year?.total_income || 0;
  const yearlyNetCashflow = this_year?.net_cashflow || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 1. This Month Income */}
      <GlassCard className="flex flex-col justify-between h-full hover:border-green-500/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">This Month Income</span>
          <div className="p-1.5 rounded bg-[var(--surface-subtle)] text-green-400">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-black text-green-400">₹{monthlyIncome.toLocaleString()}</h4>
          <span className="text-[10px] text-[var(--text-secondary)]/40 block mt-1">Logged from statement</span>
        </div>
      </GlassCard>

      {/* 2. This Month Expense */}
      <GlassCard className="flex flex-col justify-between h-full hover:border-red-500/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">This Month Expense</span>
          <div className="p-1.5 rounded bg-[var(--surface-subtle)] text-red-400">
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-black text-red-400">₹{monthlyExpenses.toLocaleString()}</h4>
          <div className="flex items-center gap-1 mt-1 text-[10px]">
            {this_month.change_percentage >= 0 ? (
              <span className="text-red-400 font-semibold flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +{this_month.change_percentage}%
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center">
                <ArrowDownRight className="w-3 h-3" /> {this_month.change_percentage}%
              </span>
            )}
            <span className="text-[var(--text-secondary)]/55">vs last month</span>
          </div>
        </div>
      </GlassCard>

      {/* 3. This Month Net Cashflow */}
      <GlassCard className={`flex flex-col justify-between h-full transition-all duration-300 ${monthlyNetCashflow >= 0 ? 'hover:border-green-500/20' : 'hover:border-red-500/20'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">This Month Net Cashflow</span>
          <div className={`p-1.5 rounded bg-[var(--surface-subtle)] ${monthlyNetCashflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <DollarSign className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h4 className={`text-xl font-black ${monthlyNetCashflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {monthlyNetCashflow >= 0 ? '+' : ''}₹{monthlyNetCashflow.toLocaleString()}
          </h4>
          <span className="text-[10px] text-[var(--text-secondary)]/40 block mt-1">Income minus expenses</span>
        </div>
      </GlassCard>

      {/* 4. Add Expense Button Card (Spans 2 rows on Desktop) */}
      <div className="lg:row-span-2 flex items-center justify-center h-full w-full">
        <GlassButton
          onClick={onAddExpenseClick}
          className="w-full h-full min-h-[100px] lg:min-h-[248px] flex flex-col items-center justify-center gap-3 font-bold text-sm bg-gradient-to-tr from-[var(--primary-color)]/20 to-[var(--secondary-color)]/20 hover:from-[var(--primary-color)]/30 hover:to-[var(--secondary-color)]/30 border-[var(--primary-color)]/30 cursor-pointer rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]"
        >
          <PlusCircle className="w-6 h-6 text-[var(--primary-color)] animate-pulse" />
          <div className="text-center">
            <span className="block text-[var(--text-primary)]">Add Expense</span>
            <span className="block text-[9px] font-normal text-[var(--text-secondary)]/60 mt-1">Manual entry or OCR receipt</span>
          </div>
        </GlassButton>
      </div>

      {/* 5. Current Year Income */}
      <GlassCard className="flex flex-col justify-between h-full hover:border-green-500/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">Current Year Income</span>
          <div className="p-1.5 rounded bg-[var(--surface-subtle)] text-green-400">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-black text-green-400">₹{yearlyIncome.toLocaleString()}</h4>
          <span className="text-[10px] text-[var(--text-secondary)]/40 block mt-1">Annual accrued income</span>
        </div>
      </GlassCard>

      {/* 6. Current Year Expense */}
      <GlassCard className="flex flex-col justify-between h-full hover:border-red-500/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">Current Year Expense</span>
          <div className="p-1.5 rounded bg-[var(--surface-subtle)] text-red-400">
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-black text-red-400">₹{yearlyExpenses.toLocaleString()}</h4>
          <span className="text-[10px] text-[var(--text-secondary)]/40 block mt-1">Annual total expenses</span>
        </div>
      </GlassCard>

      {/* 7. Current Year Net Cashflow */}
      <GlassCard className={`flex flex-col justify-between h-full transition-all duration-300 ${yearlyNetCashflow >= 0 ? 'hover:border-green-500/20' : 'hover:border-red-500/20'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">Current Year Net Cashflow</span>
          <div className={`p-1.5 rounded bg-[var(--surface-subtle)] ${yearlyNetCashflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <DollarSign className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <h4 className={`text-xl font-black ${yearlyNetCashflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {yearlyNetCashflow >= 0 ? '+' : ''}₹{yearlyNetCashflow.toLocaleString()}
          </h4>
          <span className="text-[10px] text-[var(--text-secondary)]/40 block mt-1">Annual net performance</span>
        </div>
      </GlassCard>
    </div>
  );
};

export default ExpenseSummaryCards;
