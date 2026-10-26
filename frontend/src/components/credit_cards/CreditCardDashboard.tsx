import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { creditCardService, UserCreditCard } from '../../services/creditCardService';
import { SummaryCards } from './SummaryCards';
import { CreditCardList } from './CreditCardList';
import { InsightsSection } from './InsightsSection';
import { AddCardModal } from './AddCardModal';
import { EditCardModal } from './EditCardModal';
import { ArrowLeft, Plus, Sparkles, Brain } from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ErrorState } from '../ui/ErrorState';

interface CreditCardDashboardProps {
  onBack: () => void;
  onOpenAdvisor?: () => void;
}

export const CreditCardDashboard: React.FC<CreditCardDashboardProps> = ({ onBack, onOpenAdvisor }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<UserCreditCard | null>(null);

  // Fetch user credit cards
  const { data: cards, isLoading, error } = useQuery({
    queryKey: ['creditCards'],
    queryFn: creditCardService.getCards,
  });

  return (
    <div className="space-y-6">
      {/* Header Row */}
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
              Credit Cards Manager
            </h2>
            <p className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/50">
              AI-Driven Credit Optimization & Rewards Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-[var(--primary-color)] animate-pulse" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--primary-color)] font-mono">
              AI Analyzer active
            </span>
          </div>

          {onOpenAdvisor && (
            <GlassButton
              onClick={onOpenAdvisor}
              variant="outline"
              className="py-1.5 px-3.5 text-xs font-bold border-[var(--primary-color)]/30 text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 flex items-center gap-1.5 cursor-pointer"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Smart Advisor</span>
            </GlassButton>
          )}

          <GlassButton
            onClick={() => setIsAddOpen(true)}
            className="py-1.5 px-4 text-xs font-bold bg-gradient-to-tr from-[var(--primary-color)]/20 to-[var(--secondary-color)]/20 hover:from-[var(--primary-color)]/30 hover:to-[var(--secondary-color)]/30 border-[var(--primary-color)]/30 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Sync Credit Card</span>
          </GlassButton>
        </div>
      </div>

      {/* Aggregate metrics */}
      <SummaryCards />

      {/* Main layout splits: 2/3 cards list, 1/3 AI insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
              My Cards Catalog
            </h3>
            <span className="text-[10px] text-[var(--text-secondary)]/40 font-mono font-medium">
              Total Cards: {cards?.length || 0}
            </span>
          </div>

          {isLoading ? (
            <LoadingSkeleton shape="rows" rows={4} />
          ) : error || !cards ? (
            <ErrorState
              title="Sync Failed"
              message="Couldn't load your synced credit cards. Check your connection and try again."
            />
          ) : (
            <CreditCardList
              cards={cards}
              onEditCard={(c) => setEditingCard(c)}
              onAddClick={() => setIsAddOpen(true)}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <InsightsSection />
        </div>
      </div>

      {/* Modals */}
      <AddCardModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <EditCardModal 
        isOpen={editingCard !== null} 
        onClose={() => setEditingCard(null)} 
        card={editingCard} 
      />
    </div>
  );
};
export default CreditCardDashboard;
