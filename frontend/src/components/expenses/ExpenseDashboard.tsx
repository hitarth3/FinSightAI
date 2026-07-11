import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenseService';
import { ExpenseSummaryCards } from './ExpenseSummaryCards';
import { ExpenseAnalytics } from './ExpenseAnalytics';
import { ExpenseTable } from './ExpenseTable';
import { TopMerchantsCard } from './TopMerchantsCard';
import { ExpenseInsightsCard } from './ExpenseInsightsCard';
import { AddExpenseModal } from './AddExpenseModal';
import { ExpenseDetailsModal } from './ExpenseDetailsModal';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ErrorState } from '../ui/ErrorState';

interface ExpenseDashboardProps {
  onBack: () => void;
}

export const ExpenseDashboard: React.FC<ExpenseDashboardProps> = ({ onBack }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);

  const { data: expenses, isLoading, error } = useQuery({
    queryKey: ['expenses'],
    queryFn: expenseService.getExpenses,
  });

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <GlassButton 
            variant="outline" 
            onClick={onBack}
            className="py-1.5 px-3 text-xs border-[var(--border-color)] hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Overview</span>
          </GlassButton>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
              Expense Intelligence Cockpit
            </h2>
            <p className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/50">
              Unified Expense Tracking & Receipt Scanning
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Sparkles className="w-4 h-4 text-[var(--primary-color)] animate-pulse" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--primary-color)] font-mono">
            Powered by Grok AI
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <ExpenseSummaryCards onAddExpenseClick={() => setIsAddOpen(true)} />

      {/* Analytics (Breakdown + Trend) */}
      <ExpenseAnalytics />

      {/* Insights + Leaderboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseInsightsCard />
        <TopMerchantsCard />
      </div>

      {/* Transaction History Grid */}
      {isLoading ? (
        <LoadingSkeleton shape="rows" rows={5} />
      ) : error || !expenses ? (
        <ErrorState title="Transaction History" message="Failed to load transaction history." />
      ) : (
        <ExpenseTable expenses={expenses} onViewDetails={(exp) => setSelectedExpense(exp)} />
      )}

      {/* Modals */}
      <AddExpenseModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      
      <ExpenseDetailsModal 
        isOpen={selectedExpense !== null} 
        onClose={() => setSelectedExpense(null)} 
        expense={selectedExpense} 
      />
    </div>
  );
};
export default ExpenseDashboard;
