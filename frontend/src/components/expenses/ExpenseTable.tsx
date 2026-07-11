import React, { useState } from 'react';
import { Eye, Trash2, Search, Filter } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../../services/expenseService';
import { useToasts } from '../../context/ToastContext';

interface ExpenseTableProps {
  expenses: any[];
  onViewDetails: (expense: any) => void;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({ expenses, onViewDetails }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const queryClient = useQueryClient();
  const toasts = useToasts();

  const deleteMutation = useMutation({
    mutationFn: expenseService.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseSummary'] });
      queryClient.invalidateQueries({ queryKey: ['topMerchants'] });
      queryClient.invalidateQueries({ queryKey: ['categoryBreakdown'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyTrend'] });
      queryClient.invalidateQueries({ queryKey: ['expenseInsights'] });
      toasts.success('Expense Deleted', 'The expense record was cleanly removed.');
    },
    onError: () => {
      toasts.error('Error', 'Failed to delete the expense.');
    }
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this expense?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredExpenses = expenses.filter(item => {
    const matchesSearch = item.merchant.toLowerCase().includes(search.toLowerCase()) || 
                          (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === '' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    'FOOD', 'TRAVEL', 'SHOPPING', 'RENT', 'ENTERTAINMENT', 'UTILITIES', 
    'HEALTHCARE', 'EDUCATION', 'GROCERIES', 'SUBSCRIPTION', 'MISCELLANEOUS',
    'SALARY', 'BONUS', 'INTEREST', 'FREELANCE', 'REFUND', 'BANK_TRANSFER', 'INVESTMENT_RETURN'
  ];

  return (
    <GlassCard className="p-6 flex flex-col gap-4 overflow-visible" glow>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-2 border-b border-[var(--border-color)]">
        <h3 className="text-base font-extrabold text-[var(--text-primary)]">Transaction History</h3>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]/60" />
            <input
              type="text"
              placeholder="Search merchant or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
            />
          </div>

          <div className="relative flex-1 md:flex-initial min-w-[150px]">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors cursor-pointer appearance-none"
            >
              <option value="" className="bg-[var(--bg-color)] text-[var(--text-primary)]">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{cat}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]/60 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">
              <th className="py-3.5 px-4">Merchant</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Date</th>
              <th className="py-3.5 px-4">Payment</th>
              <th className="py-3.5 px-4 text-right">Amount</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-xs text-[var(--text-secondary)]/40">
                  No matching transaction records found.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => onViewDetails(item)}
                  className="hover:bg-[var(--surface-muted)] cursor-pointer transition-colors duration-200"
                >
                  <td className="py-4 px-4 font-bold text-[var(--text-primary)] text-xs">
                    {item.merchant}
                  </td>
                  <td className="py-4 px-4 text-xs">
                    <span className="text-[10px] uppercase font-semibold px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]/80">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-xs text-[var(--text-secondary)]">
                    {item.expense_date}
                  </td>
                  <td className="py-4 px-4 text-xs text-[var(--text-secondary)]">
                    {item.payment_method.replace('_', ' ')}
                  </td>
                  {(() => {
                    const getAmountColorAndSign = (nature: string) => {
                      switch (nature) {
                        case 'INCOME':
                          return { className: 'text-green-400', prefix: '+' };
                        case 'TRANSFER':
                          return { className: 'text-blue-400', prefix: '' };
                        case 'INVESTMENT':
                          return { className: 'text-yellow-400', prefix: '' };
                        case 'LOAN':
                          return { className: 'text-orange-400', prefix: '' };
                        case 'EXPENSE':
                        default:
                          return { className: 'text-[var(--text-primary)]', prefix: '' };
                      }
                    };
                    const styling = getAmountColorAndSign(item.nature);
                    return (
                      <td className={`py-4 px-4 text-xs font-extrabold text-right ${styling.className}`}>
                        {styling.prefix}₹{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    );
                  })()}
                  <td className="py-4 px-4 text-xs text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2.5">
                      <button
                        onClick={() => onViewDetails(item)}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-all cursor-pointer"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, item.id)}
                        className="p-1.5 rounded-lg text-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};
export default ExpenseTable;
