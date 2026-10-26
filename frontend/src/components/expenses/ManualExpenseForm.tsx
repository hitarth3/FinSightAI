import React, { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../../services/expenseService';
import { useToasts } from '../../context/ToastContext';
import { GlassButton } from '../ui/GlassButton';

interface ManualExpenseFormProps {
  onSuccess: () => void;
}

export const ManualExpenseForm: React.FC<ManualExpenseFormProps> = ({ onSuccess }) => {
  const formId = useId();
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('FOOD');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [expenseDate, setExpenseDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
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
      toasts.success('Transaction saved', 'Your manual transaction has been saved successfully.');
      onSuccess();
    },
    onError: (err: Error) => {
      toasts.error('Could not save transaction', err.message || 'An error occurred.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mutation.isPending) return;
    if (!amount || !merchant.trim() || !expenseDate) {
      toasts.error('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toasts.error('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }
    mutation.mutate({
      amount: value,
      merchant: merchant.trim(),
      category,
      payment_method: paymentMethod,
      expense_date: expenseDate,
      notes: notes || null
    });
  };

  const categories = [
    'FOOD', 'TRAVEL', 'SHOPPING', 'RENT', 'ENTERTAINMENT', 'UTILITIES', 
    'HEALTHCARE', 'EDUCATION', 'GROCERIES', 'SUBSCRIPTION', 'MISCELLANEOUS',
    'SALARY', 'BONUS', 'INTEREST', 'FREELANCE', 'REFUND', 'INVESTMENT_RETURN', 'BANK_TRANSFER'
  ];

  const paymentMethods = [
    'UPI', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-sm">
      <div className="grid grid-cols-2 gap-4">
        {/* Merchant */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${formId}-merchant`} className="text-xs font-medium text-[var(--text-secondary)]">Merchant or source *</label>
          <input
            id={`${formId}-merchant`}
            type="text"
            maxLength={100}
            required
            placeholder="e.g. Grocery store or employer"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
          />
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${formId}-amount`} className="text-xs font-medium text-[var(--text-secondary)]">Amount (₹) *</label>
          <input
            id={`${formId}-amount`}
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${formId}-category`} className="text-xs font-medium text-[var(--text-secondary)]">Category *</label>
          <select
            id={`${formId}-category`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors cursor-pointer appearance-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{cat.toLowerCase().replaceAll('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${formId}-payment`} className="text-xs font-medium text-[var(--text-secondary)]">Payment Method *</label>
          <select
            id={`${formId}-payment`}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors cursor-pointer appearance-none"
          >
            {paymentMethods.map((pm) => (
              <option key={pm} value={pm} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{pm.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${formId}-date`} className="text-xs font-medium text-[var(--text-secondary)]">Transaction date *</label>
          <input
            id={`${formId}-date`}
            type="date"
            required
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${formId}-notes`} className="text-xs font-medium text-[var(--text-secondary)]">Notes</label>
        <textarea
          id={`${formId}-notes`}
            placeholder="Optional notes or description..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors resize-none"
        />
      </div>

      {/* Submit Button */}
      <div className="pt-2 flex justify-end">
        <GlassButton
          type="submit"
          disabled={mutation.isPending}
          className="px-6 py-2.5 font-bold"
        >
          {mutation.isPending ? 'Saving...' : 'Save transaction'}
        </GlassButton>
      </div>
    </form>
  );
};
export default ManualExpenseForm;
