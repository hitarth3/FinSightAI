import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenseService';
import { SectionNav } from '../ui/SectionNav';
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

import type { Expense } from '../../types/expense';

interface ExpenseDashboardProps {
  onBack: () => void;
}

export const ExpenseDashboard: React.FC<ExpenseDashboardProps> = ({ onBack }) => {
  const [section, setSection] = useState<'transactions' | 'analytics'>('transactions');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const { data: expenses, isLoading, error, refetch } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: expenseService.getExpenses,
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <ExpenseSummaryCards onAddExpenseClick={() => setIsAddOpen(true)} />

      <SectionNav<'transactions' | 'analytics'> label="Expense sections" value={section} onChange={setSection}
        items={[{ value: 'transactions', label: 'Transactions' }, { value: 'analytics', label: 'Analytics' }]} />
      {section === 'analytics' && <>
      {/* Analytics (Breakdown + Trend) */}
      <ExpenseAnalytics />

      {/* Insights + Leaderboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseInsightsCard />
        <TopMerchantsCard />
      </div>

      </>}
      {section === 'transactions' && <>
      {/* Transaction History Grid */}
      {isLoading ? (
        <LoadingSkeleton shape="rows" rows={5} />
      ) : error || !expenses ? (
        <ErrorState title="Transaction History" message="Failed to load transaction history." onRetry={() => void refetch()} />
      ) : (
        <ExpenseTable expenses={expenses} onViewDetails={(exp) => setSelectedExpense(exp)} />
      )}

      </>}
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
