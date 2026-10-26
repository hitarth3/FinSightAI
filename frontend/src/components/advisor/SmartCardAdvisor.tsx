import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Zap, BarChart3, Star, MessageSquare } from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';
import { BestCardFinder } from './BestCardFinder';
import { RewardsAnalytics } from './RewardsAnalytics';
import { CardRecommendations } from './CardRecommendations';
import { AdvisorChat } from './AdvisorChat';

type AdvisorTab = 'simulator' | 'analytics' | 'recommendations' | 'chat';

interface Tab {
  id: AdvisorTab;
  label: string;
  icon: React.ElementType;
  description: string;
}

const TABS: Tab[] = [
  {
    id: 'simulator',
    label: 'Reward Simulator',
    icon: Zap,
    description: 'Find best card for any purchase'
  },
  {
    id: 'analytics',
    label: 'Reward Analytics',
    icon: BarChart3,
    description: 'Monthly cashback & insights'
  },
  {
    id: 'recommendations',
    label: 'Card Upgrades',
    icon: Star,
    description: 'AI-driven card suggestions'
  },
  {
    id: 'chat',
    label: 'AI Chat',
    icon: MessageSquare,
    description: 'RAG-powered advisor chat'
  },
];

interface SmartCardAdvisorProps {
  onBack: () => void;
}

export const SmartCardAdvisor: React.FC<SmartCardAdvisorProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<AdvisorTab>('simulator');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <GlassButton
            variant="outline"
            className="py-1.5 px-3 text-xs gap-1.5"
            onClick={onBack}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </GlassButton>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center shadow-lg shadow-[var(--primary-color)]/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Smart Card Advisor</h2>
              <p className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">
                AI-Powered Reward Intelligence Engine
              </p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Advisor Online</span>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold
                transition-all duration-200 relative overflow-hidden
                ${isActive
                  ? 'bg-gradient-to-tr from-[var(--primary-color)]/20 to-[var(--secondary-color)]/15 border-[var(--primary-color)]/40 text-[var(--text-primary)] shadow-md shadow-[var(--primary-color)]/10'
                  : 'bg-[var(--surface-muted)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] hover:border-white/15'
                }
              `}
            >
              {isActive && (
                <span className="absolute inset-0 bg-gradient-to-tr from-[var(--primary-color)]/5 to-[var(--secondary-color)]/5 pointer-events-none" />
              )}
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--primary-color)]' : ''}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Tab Description */}
      <div className="text-[10px] text-[var(--text-secondary)]/50 font-semibold uppercase tracking-wider">
        {TABS.find(t => t.id === activeTab)?.description}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'simulator' && <BestCardFinder />}
          {activeTab === 'analytics' && <RewardsAnalytics />}
          {activeTab === 'recommendations' && <CardRecommendations />}
          {activeTab === 'chat' && <AdvisorChat />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SmartCardAdvisor;
