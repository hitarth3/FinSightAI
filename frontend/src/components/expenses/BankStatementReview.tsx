import React, { useState, useEffect } from 'react';
import { expenseService } from '../../services/expenseService';
import { useToasts } from '../../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { GlassButton } from '../ui/GlassButton';
import { 
  AlertTriangle, Trash2, CheckSquare, Square, 
  ArrowDownRight, ArrowUpRight, CheckCircle2, RefreshCw, Info
} from 'lucide-react';

interface Transaction {
  id: string;
  import_id: string;
  raw_description: string;
  transaction_type: 'DEBIT' | 'CREDIT';
  merchant: string;
  amount: number;
  date: string;
  category: string;
  category_source: 'MERCHANT_MAPPING' | 'AI_CLASSIFICATION' | 'MANUAL';
  nature: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'INVESTMENT' | 'LOAN' | 'OTHER';
  nature_source: string;
  confidence_score: number;
  is_duplicate: boolean;
  is_selected: boolean;
}

interface BankStatementReviewProps {
  importId: string;
  summary: {
    bank_name: string;
    total_transactions: number;
    expense_transactions: number;
    income_transactions: number;
    investment_transactions?: number;
    transfer_transactions?: number;
    total_expenses: number;
    total_income: number;
    total_investments?: number;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const NATURE_STYLES: Record<string, string> = {
  EXPENSE: 'bg-red-500/10 text-red-400 border border-red-500/20',
  INCOME: 'bg-green-500/10 text-green-400 border border-green-500/20',
  TRANSFER: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  INVESTMENT: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  LOAN: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  OTHER: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)]',
};

const NATURES = ['EXPENSE', 'INCOME', 'TRANSFER', 'INVESTMENT', 'LOAN', 'OTHER'];

const CATEGORIES = [
  'FOOD', 'TRAVEL', 'SHOPPING', 'RENT', 'ENTERTAINMENT', 'UTILITIES', 
  'HEALTHCARE', 'EDUCATION', 'GROCERIES', 'SUBSCRIPTION', 'MISCELLANEOUS',
  'SALARY', 'BONUS', 'INTEREST', 'FREELANCE', 'REFUND', 'BANK_TRANSFER', 'INVESTMENT_RETURN'
];

const PAYMENT_METHODS = [
  'UPI', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING'
];

export const BankStatementReview: React.FC<BankStatementReviewProps> = ({
  importId,
  summary,
  onSuccess,
  onCancel,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING'>('UPI');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkNature, setBulkNature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const queryClient = useQueryClient();
  const toasts = useToasts();

  useEffect(() => {
    fetchTransactions();
  }, [importId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await expenseService.getStatementTransactions(importId);
      setTransactions(data);
    } catch (err) {
      toasts.error('Error', 'Failed to fetch statement transactions.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCategories = (nature: string) => {
    if (nature === 'INCOME') {
      return ['SALARY', 'BONUS', 'INTEREST', 'FREELANCE', 'REFUND', 'BANK_TRANSFER', 'INVESTMENT_RETURN', 'MISCELLANEOUS'];
    }
    if (nature === 'EXPENSE') {
      return ['FOOD', 'TRAVEL', 'SHOPPING', 'RENT', 'ENTERTAINMENT', 'UTILITIES', 'HEALTHCARE', 'EDUCATION', 'GROCERIES', 'SUBSCRIPTION', 'MISCELLANEOUS'];
    }
    return CATEGORIES;
  };

  const handleToggleSelect = async (tx: Transaction) => {
    const newSelected = !tx.is_selected;
    try {
      setTransactions(prev => prev.map(item => item.id === tx.id ? { ...item, is_selected: newSelected } : item));
      await expenseService.updateStatementTransaction(importId, tx.id, { is_selected: newSelected });
    } catch (err) {
      toasts.error('Error', 'Failed to update transaction selection.');
      setTransactions(prev => prev.map(item => item.id === tx.id ? { ...item, is_selected: !newSelected } : item));
    }
  };

  const handleSelectAll = async (checked: boolean) => {
    if (transactions.length === 0) return;

    try {
      setTransactions(prev => prev.map(item => ({ ...item, is_selected: checked })));
      const txIds = transactions.map(tx => tx.id);
      await expenseService.bulkSelectTransactions(importId, txIds, checked);
    } catch (err) {
      toasts.error('Error', 'Failed to update selection in bulk.');
      fetchTransactions();
    }
  };

  const handleUpdateField = async (txId: string, field: string, value: any) => {
    try {
      let extraUpdates: any = {};
      if (field === 'nature') {
        // Auto-assign default category if switching nature
        const currentTx = transactions.find(t => t.id === txId);
        if (currentTx) {
          const allowedCats = getFilteredCategories(value);
          if (!allowedCats.includes(currentTx.category)) {
            extraUpdates.category = value === 'INCOME' ? 'SALARY' : 'MISCELLANEOUS';
          }
        }
      }

      setTransactions(prev => prev.map(item => 
        item.id === txId ? { ...item, [field]: value, ...extraUpdates } : item
      ));

      await expenseService.updateStatementTransaction(importId, txId, { [field]: value, ...extraUpdates });
    } catch (err) {
      toasts.error('Error', `Failed to update transaction ${field}.`);
      fetchTransactions();
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    try {
      setTransactions(prev => prev.filter(item => item.id !== txId));
      await expenseService.deleteStatementTransaction(importId, txId);
      toasts.success('Deleted', 'Transaction removed from statement import review.');
    } catch (err) {
      toasts.error('Error', 'Failed to remove transaction.');
      fetchTransactions();
    }
  };

  const handleBulkReclassify = async () => {
    // Only reclassify selected transactions
    const selectedIds = transactions.filter(t => t.is_selected).map(t => t.id);
    if (selectedIds.length === 0) {
      toasts.error('No Selection', 'Please select at least one transaction to reclassify.');
      return;
    }
    if (!bulkCategory && !bulkNature) {
      toasts.error('No Changes', 'Please select a Category or Nature to apply.');
      return;
    }

    try {
      setTransactions(prev => prev.map(item => {
        if (!selectedIds.includes(item.id)) return item;
        const updated = { ...item };
        if (bulkCategory) {
          updated.category = bulkCategory;
          updated.category_source = 'MANUAL';
        }
        if (bulkNature) {
          updated.nature = bulkNature as any;
          updated.nature_source = 'MANUAL';
        }
        return updated;
      }));

      await expenseService.bulkReclassify(selectedIds, bulkCategory || undefined, bulkNature || undefined);
      toasts.success('Reclassified', `Successfully reclassified ${selectedIds.length} transactions.`);
      setBulkCategory('');
      setBulkNature('');
    } catch (err) {
      toasts.error('Error', 'Failed to bulk reclassify transactions.');
      fetchTransactions();
    }
  };

  const handleConfirmImport = async () => {
    const selectedCount = transactions.filter(t => t.is_selected).length;
    if (selectedCount === 0) {
      toasts.error('No Transactions Selected', 'Please select at least one transaction to import.');
      return;
    }

    setIsSubmitting(true);
    try {
      await expenseService.confirmStatementImport(importId, paymentMethod);
      
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseSummary'] });
      queryClient.invalidateQueries({ queryKey: ['topMerchants'] });
      queryClient.invalidateQueries({ queryKey: ['categoryBreakdown'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyTrend'] });
      queryClient.invalidateQueries({ queryKey: ['expenseInsights'] });
      
      onSuccess();
    } catch (err: any) {
      toasts.error('Import Failed', err.message || 'An error occurred during import.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = transactions.filter(t => t.is_selected).length;
  const allSelected = transactions.length > 0 && transactions.every(t => t.is_selected);
  const hasDuplicatesSelected = transactions.some(t => t.is_selected && t.is_duplicate);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <RefreshCw className="w-8 h-8 text-[var(--primary-color)] animate-spin" />
        <p className="text-xs font-semibold text-[var(--text-primary)]">Loading transactions for review...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 5-Card Analytics Summary Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-2xl shadow-glass">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/50">Bank Statement</p>
          <p className="text-xs font-black text-[var(--text-primary)] flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-color)]"></span>
            {summary.bank_name} Bank
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/50">Total Extracted</p>
          <p className="text-xs font-black text-[var(--text-primary)]">{summary.total_transactions} txs</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/50">Expenses</p>
          <p className="text-xs font-black text-red-400 flex items-center gap-1 truncate">
            <ArrowDownRight className="w-3.5 h-3.5" />
            ₹{summary.total_expenses.toLocaleString()} ({summary.expense_transactions})
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/50">Income</p>
          <p className="text-xs font-black text-green-400 flex items-center gap-1 truncate">
            <ArrowUpRight className="w-3.5 h-3.5" />
            ₹{summary.total_income.toLocaleString()} ({summary.income_transactions})
          </p>
        </div>
        <div className="space-y-1 col-span-2 md:col-span-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/50">Investments</p>
          <p className="text-xs font-black text-yellow-400 flex items-center gap-1 truncate">
            <ArrowUpRight className="w-3.5 h-3.5 text-yellow-400" />
            ₹{(summary.total_investments || 0).toLocaleString()} ({summary.investment_transactions || 0})
          </p>
        </div>
      </div>

      {/* Duplicate Warning Panel */}
      {hasDuplicatesSelected && (
        <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold">Duplicate Warning</p>
            <p className="text-[10px] text-amber-300/80 leading-normal">
              One or more selected transactions match existing expenses in your database. Please verify these entries to prevent duplicate expense data.
            </p>
          </div>
        </div>
      )}

      {/* Bulk and Settings Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-3 bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl">
        {/* Bulk Reclassify */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-[var(--text-secondary)]/70 whitespace-nowrap">Bulk Reclassify:</span>
          
          <select
            value={bulkNature}
            onChange={(e) => setBulkNature(e.target.value)}
            className="px-2 py-1.5 bg-[var(--surface-subtle)] hover:bg-[var(--surface-raised)] text-xs text-[var(--text-primary)] rounded-lg border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] transition-all"
          >
            <option value="" className="bg-[var(--bg-color)] text-[var(--text-primary)]">-- Nature --</option>
            {NATURES.map(n => (
              <option key={n} value={n} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{n}</option>
            ))}
          </select>

          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="px-2 py-1.5 bg-[var(--surface-subtle)] hover:bg-[var(--surface-raised)] text-xs text-[var(--text-primary)] rounded-lg border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] transition-all"
          >
            <option value="" className="bg-[var(--bg-color)] text-[var(--text-primary)]">-- Category --</option>
            {(bulkNature ? getFilteredCategories(bulkNature) : CATEGORIES).map(c => (
              <option key={c} value={c} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{c}</option>
            ))}
          </select>

          <button
            onClick={handleBulkReclassify}
            className="px-3 py-1.5 bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90 text-xs font-bold text-slate-950 rounded-lg cursor-pointer transition-all shadow-[0_0_10px_rgba(255,255,255,0.05)]"
          >
            Apply
          </button>
        </div>

        {/* Global Import Settings */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs text-[var(--text-secondary)]/70 whitespace-nowrap">Payment Method:</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            className="px-2.5 py-1.5 bg-[var(--surface-subtle)] hover:bg-[var(--surface-raised)] text-xs text-[var(--text-primary)] rounded-lg border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] transition-all"
          >
            {PAYMENT_METHODS.map(m => (
              <option key={m} value={m} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{m.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="border border-[var(--border-color)] rounded-xl bg-[var(--surface-subtle)] max-h-[40vh] overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--surface-muted)] text-[10px] text-[var(--text-secondary)]/60 uppercase tracking-wider font-bold">
              <th className="p-3 w-12 text-center">
                <button
                  onClick={() => handleSelectAll(!allSelected)}
                  className="p-1 rounded hover:bg-[var(--surface-raised)] cursor-pointer"
                  title="Select All Expenses"
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-[var(--primary-color)] mx-auto" />
                  ) : (
                    <Square className="w-4 h-4 text-[var(--text-secondary)]/50 mx-auto" />
                  )}
                </button>
              </th>
              <th className="p-3 w-24">Date</th>
              <th className="p-3 w-48">Narration</th>
              <th className="p-3 w-32">Merchant</th>
              <th className="p-3 w-20">Amount</th>
              <th className="p-3 w-28">Nature</th>
              <th className="p-3 w-28">Category</th>
              <th className="p-3 w-16 text-center">Info</th>
              <th className="p-3 w-12 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const isExpense = tx.nature === 'EXPENSE';
              return (
                <tr 
                  key={tx.id} 
                  className={`border-b border-[var(--border-color)] transition-colors duration-200 ${
                    tx.nature === 'INCOME' 
                      ? 'bg-green-500/[0.01] hover:bg-green-500/[0.03]' 
                      : tx.nature === 'INVESTMENT' 
                        ? 'bg-yellow-500/[0.01] hover:bg-yellow-500/[0.03]'
                        : tx.is_selected 
                          ? 'bg-[var(--primary-color)]/[0.02] hover:bg-[var(--primary-color)]/[0.04]' 
                          : 'hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggleSelect(tx)}
                      className="p-1 rounded hover:bg-[var(--surface-raised)] cursor-pointer"
                    >
                      {tx.is_selected ? (
                        <CheckSquare className="w-4 h-4 text-[var(--primary-color)] mx-auto" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-secondary)]/40 mx-auto" />
                      )}
                    </button>
                  </td>

                  {/* Date */}
                  <td className="p-3">
                    <input
                      type="date"
                      value={tx.date}
                      onChange={(e) => handleUpdateField(tx.id, 'date', e.target.value)}
                      className="bg-[var(--surface-subtle)] hover:bg-[var(--surface-raised)] border border-[var(--border-color)] rounded px-1.5 py-1 text-[var(--text-primary)] text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] transition-all w-full"
                    />
                  </td>

                  {/* Narration */}
                  <td className="p-3 truncate max-w-xs text-[11px] text-[var(--text-secondary)]" title={tx.raw_description}>
                    {tx.raw_description}
                  </td>

                  {/* Merchant */}
                  <td className="p-3">
                    <input
                      type="text"
                      value={tx.merchant}
                      onChange={(e) => handleUpdateField(tx.id, 'merchant', e.target.value)}
                      className="bg-[var(--surface-subtle)] hover:bg-[var(--surface-raised)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] transition-all w-full"
                    />
                  </td>

                  {/* Amount */}
                  <td className="p-3 font-semibold text-[var(--text-primary)]">
                    <input
                      type="number"
                      step="0.01"
                      value={tx.amount}
                      onChange={(e) => handleUpdateField(tx.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="bg-[var(--surface-subtle)] hover:bg-[var(--surface-raised)] border border-[var(--border-color)] rounded px-1.5 py-1 text-[var(--text-primary)] text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] transition-all w-full"
                    />
                  </td>

                  {/* Nature Dropdown with Badges */}
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <select
                        value={tx.nature}
                        onChange={(e) => handleUpdateField(tx.id, 'nature', e.target.value)}
                        className={`bg-[var(--surface-subtle)] hover:bg-[var(--surface-raised)] border border-[var(--border-color)] rounded px-1.5 py-1 text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] transition-all w-full`}
                      >
                        {NATURES.map(n => (
                          <option key={n} value={n} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{n}</option>
                        ))}
                      </select>
                      <span className="text-[8px] text-[var(--text-secondary)]/40 ml-1">
                        via {tx.nature_source === 'AI_CLASSIFICATION' ? 'LangChain' : tx.nature_source}
                      </span>
                    </div>
                  </td>

                  {/* Category Dropdown */}
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <select
                        value={tx.category}
                        onChange={(e) => handleUpdateField(tx.id, 'category', e.target.value)}
                        className="bg-[var(--surface-subtle)] hover:bg-[var(--surface-raised)] border border-[var(--border-color)] rounded px-1.5 py-1 text-[var(--text-primary)] text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] transition-all w-full"
                      >
                        {getFilteredCategories(tx.nature).map(c => (
                          <option key={c} value={c} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{c}</option>
                        ))}
                      </select>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded self-start ${
                        tx.category_source === 'MERCHANT_MAPPING' 
                          ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/10' 
                          : tx.category_source === 'AI_CLASSIFICATION' 
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/10' 
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/10'
                      }`}>
                        {tx.category_source === 'MERCHANT_MAPPING' ? 'Rules' : tx.category_source === 'AI_CLASSIFICATION' ? 'LangChain' : 'Manual'}
                      </span>
                    </div>
                  </td>

                  {/* Info / Confidence */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {tx.is_duplicate && isExpense && (
                        <span 
                          className="p-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/15 cursor-help animate-pulse"
                          title="Potential duplicate transaction. A similar expense exists in database."
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span 
                        className="text-[10px] text-[var(--text-secondary)]/50 font-bold"
                        title={`Confidence: ${tx.confidence_score?.toFixed(0) || 100}%`}
                      >
                        {tx.confidence_score?.toFixed(0) || 100}%
                      </span>
                    </div>
                  </td>

                  {/* Delete Action */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDeleteTransaction(tx.id)}
                      className="p-1 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer transition-colors"
                      title="Remove transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4 mt-2">
        <GlassButton
          onClick={onCancel}
          variant="secondary"
          className="text-xs font-bold px-4 py-2 border border-[var(--border-color)] cursor-pointer"
        >
          Cancel Import
        </GlassButton>
        <button
          onClick={handleConfirmImport}
          disabled={selectedCount === 0 || isSubmitting}
          className="px-5 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/95 disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-secondary)]/40 disabled:cursor-not-allowed text-xs font-bold text-slate-950 rounded-xl cursor-pointer transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] flex items-center gap-1.5"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Importing Transactions...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Import Selected Transactions ({selectedCount})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
