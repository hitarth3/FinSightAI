import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creditCardService } from '../../services/creditCardService';
import { useToasts } from '../../context/ToastContext';
import { GlassModal } from '../ui/GlassModal';
import { GlassButton } from '../ui/GlassButton';
import { ShieldCheck, Info } from 'lucide-react';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCardModal: React.FC<AddCardModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const toasts = useToasts();

  // Form states
  const [bank, setBank] = useState('');
  const [catalogId, setCatalogId] = useState('');
  const [nickname, setNickname] = useState('');
  const [limit, setLimit] = useState('');
  const [outstanding, setOutstanding] = useState('');
  const [billingDate, setBillingDate] = useState('15');
  const [dueDate, setDueDate] = useState('');

  // Fetch global catalog
  const { data: catalog, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['cardCatalog'],
    queryFn: creditCardService.getCatalog,
    enabled: isOpen,
  });

  // Extract unique banks
  const uniqueBanks = Array.from(
    new Set(catalog?.map((item) => item.bank_name) || [])
  ).sort();

  // Filter cards by selected bank
  const bankCards = catalog?.filter((item) => item.bank_name === bank) || [];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setBank('');
      setCatalogId('');
      setNickname('');
      setLimit('');
      setOutstanding('0');
      setBillingDate('15');
      
      // Default due date to next 20 days
      const d = new Date();
      d.setDate(d.getDate() + 20);
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  // Set default limit/outstanding when card catalog details change
  useEffect(() => {
    if (catalogId && bankCards.length > 0) {
      const selectedProfile = bankCards.find((c) => c.id === catalogId);
      // If Regalia Gold/Magnus premium, pre-fill higher mock limit for demo purposes
      if (selectedProfile) {
        if (selectedProfile.card_name.includes('Black') || selectedProfile.card_name.includes('Magnus')) {
          setLimit('500000');
        } else if (selectedProfile.card_name.includes('Gold') || selectedProfile.card_name.includes('Sapphiro')) {
          setLimit('300000');
        } else {
          setLimit('150000');
        }
      }
    }
  }, [catalogId]);

  const mutation = useMutation({
    mutationFn: creditCardService.createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
      queryClient.invalidateQueries({ queryKey: ['creditSummary'] });
      queryClient.invalidateQueries({ queryKey: ['creditInsights'] });
      toasts.success('Credit Card Synced', 'Your card details have been successfully configured.');
      onClose();
    },
    onError: (err: any) => {
      toasts.error('Failed to Sync Card', err.message || 'Check database validation.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bank || !catalogId || !limit || !dueDate || !billingDate) {
      toasts.error('Missing Fields', 'Please select a catalog profile and specify limits.');
      return;
    }

    mutation.mutate({
      catalog_id: catalogId,
      credit_limit: parseFloat(limit),
      outstanding: parseFloat(outstanding || '0'),
      billing_date: parseInt(billingDate),
      due_date: dueDate,
      nickname: nickname || undefined,
    });
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Sync Credit Card Profile" size="md">
      {isCatalogLoading ? (
        <div className="p-8 text-center text-xs text-[var(--text-secondary)]/50 animate-pulse">
          Loading global credit card catalog...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Bank & Card Selector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">
                Select Bank *
              </label>
              <select
                value={bank}
                onChange={(e) => {
                  setBank(e.target.value);
                  setCatalogId('');
                }}
                required
                className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors cursor-pointer appearance-none"
              >
                <option value="" className="bg-[var(--bg-color)] text-[var(--text-primary)]">Choose Bank</option>
                {uniqueBanks.map((b) => (
                  <option key={b} value={b} className="bg-[var(--bg-color)] text-[var(--text-primary)]">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">
                Card Profile *
              </label>
              <select
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value)}
                required
                disabled={!bank}
                className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors cursor-pointer appearance-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="" className="bg-[var(--bg-color)] text-[var(--text-primary)]">Select Card Variant</option>
                {bankCards.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[var(--bg-color)] text-[var(--text-primary)]">
                    {c.card_name} ({c.reward_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nickname & Credit Limit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">
                Credit Limit (₹) *
              </label>
              <input
                type="number"
                required
                min="100"
                placeholder="Limit approved by bank"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">
                Outstanding Balance (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Current outstanding"
                value={outstanding}
                onChange={(e) => setOutstanding(e.target.value)}
                className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
              />
            </div>
          </div>

          {/* Billing Cycle Details */}
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
                Next Payment Due Date *
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
              Custom Nickname (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Personal Shopping Card"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
            />
          </div>

          {/* Catalog Benefits Preview Box (Active when profile is chosen) */}
          {catalogId && (
            <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-white/[0.01] space-y-2">
              <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--primary-color)] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Catalog Verified Card Benefits
              </span>
              {(() => {
                const profile = bankCards.find((c) => c.id === catalogId);
                if (!profile) return null;
                return (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-[var(--text-secondary)]">
                    <div>
                      <span className="text-[var(--text-secondary)] text-[9px] block">Rewards system:</span>
                      <span className="font-semibold text-[var(--text-primary)]/80">{profile.reward_type}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)] text-[9px] block">Annual Fee:</span>
                      <span className="font-semibold text-[var(--text-primary)]/80">₹{profile.annual_fee}</span>
                    </div>
                    {profile.lounge_access && profile.lounge_access !== 'None' && (
                      <div className="col-span-2 border-t border-[var(--border-color)] pt-1.5 mt-0.5">
                        <span className="text-[var(--text-secondary)] text-[9px] block font-medium">Lounge access privileges:</span>
                        <span className="text-[var(--text-primary)]/80">{profile.lounge_access}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Submit Buttons */}
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
              {mutation.isPending ? 'Syncing...' : 'Sync Card'}
            </GlassButton>
          </div>
        </form>
      )}
    </GlassModal>
  );
};
export default AddCardModal;
