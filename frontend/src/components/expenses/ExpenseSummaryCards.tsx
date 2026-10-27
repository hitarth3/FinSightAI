import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenseService';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { ErrorState } from '../ui/ErrorState';
import { Plus } from 'lucide-react';

export function ExpenseSummaryCards({ onAddExpenseClick }: { onAddExpenseClick: () => void }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['expenseSummary'], queryFn: expenseService.getSummary });
  const money = (value: number) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  return <div className="space-y-4">
    <div className="module-toolbar"><p className="module-meta">This month · recorded transactions</p>
      <GlassButton onClick={onAddExpenseClick}><Plus size={16} />Add or import expenses</GlassButton></div>
    {isLoading ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="status" aria-label="Loading summaries">
      {[1, 2, 3].map(i => <GlassCard key={i} className="h-28 animate-pulse"><span className="sr-only">Loading</span></GlassCard>)}</div>
      : error || !data ? <ErrorState title="Expense summary unavailable" message="Please try again shortly." /> : <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Income', value: data.this_month.total_income || 0 },
            { label: 'Spending', value: data.this_month.total_amount || 0 },
            { label: 'Net cash flow', value: data.this_month.net_cashflow || 0 },
          ].map(metric => <GlassCard key={metric.label}>
            <p className="module-meta">{metric.label}</p>
            <p className="text-2xl font-semibold mt-3 tabular-nums">{money(metric.value)}</p>
          </GlassCard>)}
        </div>
        {data.this_year && <details className="report-disclosure"><summary>Year-to-date totals</summary>
          <p className="module-meta">Income {money(data.this_year.total_income || 0)} · Spending {money(data.this_year.total_amount || 0)} · Net cash flow {money(data.this_year.net_cashflow || 0)}</p>
        </details>}
      </>}
  </div>;
}
