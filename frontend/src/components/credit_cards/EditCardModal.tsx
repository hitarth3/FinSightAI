import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { creditCardService, UserCreditCard } from '../../services/creditCardService';
import { useToasts } from '../../context/ToastContext';
import { GlassModal } from '../ui/GlassModal';
import { GlassButton } from '../ui/GlassButton';

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: UserCreditCard | null;
}

export const EditCardModal: React.FC<EditCardModalProps> = ({ isOpen, onClose, card }) => {
  const queryClient = useQueryClient();
  const toasts = useToasts();

  // Form states
  const [nickname, setNickname] = useState('');
  const [limit, setLimit] = useState('');
  const [outstanding, setOutstanding] = useState('');
  const [billingDate, setBillingDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Pre-fill states when card changes
  useEffect(() => {
    if (card) {
      setNickname(card.nickname || '');
      setLimit(card.credit_limit.toString());
      setOutstanding(card.outstanding.toString());
      setBillingDate(card.billing_date.toString());
      setDueDate(card.due_date);
    }
  }, [card, isOpen]);

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => creditCardService.updateCard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
      queryClient.invalidateQueries({ queryKey: ['creditSummary'] });
      queryClient.invalidateQueries({ queryKey: ['creditInsights'] });
      toasts.success('Balance Updated', 'Your card details have been updated successfully.');
      onClose();
    },
    onError: (err: any) => {
      toasts.error('Update Failed', err.message || 'Check database validation.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;
    if (!limit || !billingDate || !dueDate) {
      toasts.error('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    mutation.mutate({
      id: card.id,
      data: {
        credit_limit: parseFloat(limit),
        outstanding: parseFloat(outstanding || '0'),
        billing_date: parseInt(billingDate),
        due_date: dueDate,
        nickname: nickname || null,
      },
    });
  };

  return (
    <GlassModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={card ? `Modify ${card.catalog?.bank_name} ${card.catalog?.card_name}` : 'Edit Card'} 
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">
              Approved Credit Limit (₹) *
            </label>
            <input
              type="number"
              required
              min="100"
              placeholder="e.g. 300000"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">
              Outstanding Balance (₹) *
            </label>
            <input
              type="number"
              required
              min="0"
              placeholder="e.g. 15000"
              value={outstanding}
              onChange={(e) => setOutstanding(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">
              Billing Cycle Day *
            </label>
            <input
              type="number"
              min="1"
              max="31"
              required
              placeholder="e.g. 15"
              value={billingDate}
              onChange={(e) => setBillingDate(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">
              Next Due Date *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">
            Card Nickname
          </label>
          <input
            type="text"
            placeholder="e.g. Shopping Card"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
          />
        </div>

        {card?.catalog && (
          <div className="p-3 bg-white/[0.01] rounded-xl border border-[var(--border-color)] text-[10px] text-[var(--text-secondary)] leading-normal space-y-1">
            <div className="flex justify-between">
              <span>Card Base Variant:</span>
              <span className="text-[var(--text-primary)] font-semibold">{card.catalog.bank_name} {card.catalog.card_name} ({card.catalog.card_type})</span>
            </div>
            <div className="flex justify-between">
              <span>Rewards Scheme:</span>
              <span className="text-yellow-400 font-semibold">{card.catalog.reward_type}</span>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-3">
          <GlassButton
            type="button"
            variant="outline"
            onClick={onClose}
            className="px-5 py-2.5 border-[var(--border-color)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
          >
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2.5 font-bold"
          >
            {mutation.isPending ? 'Updating...' : 'Save Changes'}
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  );
};
export default EditCardModal;
