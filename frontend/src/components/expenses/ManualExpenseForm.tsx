import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../../services/expenseService';
import { useToasts } from '../../context/ToastContext';
import { GlassButton } from '../ui/GlassButton';

interface ManualExpenseFormProps {
  onSuccess: () => void;
}

export const ManualExpenseForm: React.FC<ManualExpenseFormProps> = ({ onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('FOOD');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const queryClient = useQueryClient();
  const toasts = useToasts();

  const mutation = useMutation({
    mutationFn: expenseService.createManualExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseSummary'] });
      queryClient.invalidateQueries({ queryKey: ['topMerchants'] });
      queryClient.invalidateQueries({ queryKey: ['categoryBreakdown'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyTrend'] });
      queryClient.invalidateQueries({ queryKey: ['expenseInsights'] });
      toasts.success('Expense Added', 'Your manual transaction has been saved successfully.');
      onSuccess();
    },
    onError: (err: any) => {
      toasts.error('Failed to Add Expense', err.message || 'An error occurred.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !merchant || !expenseDate) {
      toasts.error('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    
    mutation.mutate({
      amount: parseFloat(amount),
      merchant,
      category,
      payment_method: paymentMethod,
      expense_date: expenseDate,
      notes: notes || null
    });
  };

  const categories = [
    'FOOD', 'TRAVEL', 'SHOPPING', 'RENT', 'ENTERTAINMENT', 'UTILITIES', 
    'HEALTHCARE', 'EDUCATION', 'GROCERIES', 'SUBSCRIPTION', 'MISCELLANEOUS'
  ];

  const paymentMethods = [
    'UPI', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-4">
        {/* Merchant */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Merchant Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Swiggy"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
          />
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Amount (₹) *</label>
          <input
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors cursor-pointer appearance-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{cat}</option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Payment Method *</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors cursor-pointer appearance-none"
          >
            {paymentMethods.map((pm) => (
              <option key={pm} value={pm} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{pm.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Expense Date *</label>
          <input
            type="date"
            required
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Notes</label>
        <textarea
          placeholder="Optional notes or description..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors resize-none"
        />
      </div>

      {/* Submit Button */}
      <div className="pt-2 flex justify-end">
        <GlassButton
          type="submit"
          disabled={mutation.isPending}
          className="px-6 py-2.5 font-bold"
        >
          {mutation.isPending ? 'Saving...' : 'Save Manual Expense'}
        </GlassButton>
      </div>
    </form>
  );
};
export default ManualExpenseForm;
