import React from 'react';
import { GlassModal } from '../ui/GlassModal';
import { ReceiptPreview } from './ReceiptPreview';
import { Calendar, CreditCard, Award, FileText } from 'lucide-react';
import { GlassBadge } from '../ui/GlassBadge';

import type { Expense } from '../../types/expense';

interface ExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
}

export const ExpenseDetailsModal: React.FC<ExpenseDetailsModalProps> = ({ isOpen, onClose, expense }) => {
  if (!expense) return null;

  const isAiExtracted = expense.source_type !== 'MANUAL';
  const confidencePercent = Math.round(expense.ai_confidence * 100);

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Transaction details" size="sm">
      <div className="space-y-5 text-sm">
        {/* Header summary */}
        <div className="flex flex-col items-center justify-center py-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-color)] gap-1.5">
          <span className="text-3xl font-black text-[var(--text-primary)]">₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="font-semibold text-[var(--text-primary)]/90 text-sm">{expense.merchant}</span>
          <div className="flex gap-2 mt-1">
            <GlassBadge variant="cyan">{expense.category}</GlassBadge>
            <GlassBadge variant={isAiExtracted ? 'success' : 'neutral'}>
              {expense.source_type.replaceAll('_', ' ')}
            </GlassBadge>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-[var(--primary-color)] shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--text-secondary)]/50 uppercase font-bold">Date</span>
              <span className="text-xs text-[var(--text-primary)] font-semibold">{expense.expense_date}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-[var(--secondary-color)] shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--text-secondary)]/50 uppercase font-bold">Payment Method</span>
              <span className="text-xs text-[var(--text-primary)] font-semibold">{expense.payment_method.replaceAll('_', ' ')}</span>
            </div>
          </div>

          {isAiExtracted && (
            <div className="flex items-center gap-2.5 col-span-2">
              <Award className="w-4 h-4 text-success shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--text-secondary)]/50 uppercase font-bold">AI Extraction Confidence</span>
                <span className="text-xs text-success font-bold">{confidencePercent}% Confidence</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {expense.notes && (
          <div className="flex gap-2.5 p-3 rounded-xl bg-white/[0.01] border border-[var(--border-color)]">
            <FileText className="w-4 h-4 text-[var(--text-secondary)]/60 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--text-secondary)]/50 uppercase font-bold">Notes</span>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{expense.notes}</p>
            </div>
          </div>
        )}

        {/* Receipt Image if available */}
        {expense.receipt_url && (
          <div className="pt-2">
            <ReceiptPreview 
              receiptUrl={expense.receipt_url} 
              thumbnailUrl={expense.thumbnail_url} 
              fileName={`${expense.merchant}_receipt`}
            />
          </div>
        )}
      </div>
    </GlassModal>
  );
};
export default ExpenseDetailsModal;
