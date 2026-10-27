import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { creditCardService, UserCreditCard } from '../../services/creditCardService';
import { SectionNav } from '../ui/SectionNav';
import { BestCardFinder } from '../advisor/BestCardFinder';
import { RewardsAnalytics } from '../advisor/RewardsAnalytics';
import { CardRecommendations } from '../advisor/CardRecommendations';
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
  const [section, setSection] = useState<'cards' | 'rewards' | 'compare'>('cards');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<UserCreditCard | null>(null);

  // Fetch user credit cards
  const { data: cards, isLoading, error } = useQuery({
    queryKey: ['creditCards'],
    queryFn: creditCardService.getCards,
  });

  return (
    <div className="space-y-6">
      <div className="module-toolbar">
        <p className="module-meta">Manage balances, limits and rewards.</p>
        <div className="module-actions">
          {onOpenAdvisor && <GlassButton variant="secondary" onClick={onOpenAdvisor}>Ask assistant</GlassButton>}
          <GlassButton onClick={() => setIsAddOpen(true)}><Plus size={16} />Add card</GlassButton>
        </div>
      </div>

      <SectionNav<'cards' | 'rewards' | 'compare'> label="Credit card sections" value={section} onChange={setSection}
        items={[{ value: 'cards', label: 'My cards' }, { value: 'rewards', label: 'Rewards' }, { value: 'compare', label: 'Compare' }]} />
      {section === 'cards' && <>
      {/* Aggregate metrics */}
      <SummaryCards />

      {/* Main layout splits: 2/3 cards list, 1/3 AI insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[var(--text-primary)] ">
              My Cards Catalog
            </h3>
            <span className="text-xs text-[var(--text-secondary)] font-mono font-medium">
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

      </>}
      {section === 'rewards' && <div className="space-y-6"><BestCardFinder /><RewardsAnalytics /></div>}
      {section === 'compare' && <CardRecommendations />}
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
