import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from '../../utils/cn';
import { GlassCard } from './GlassCard';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  bare?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Shared "no data yet" placeholder. Reference pattern:
 * SmartInvestmentDashboardCard.tsx's "No Assets Tracked" block.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  bare = false,
  className,
  onClick,
}) => {
  const content = (
    <div className={cn('flex flex-col justify-between h-full text-left', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-color)] text-[var(--text-secondary)]">
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <div className="my-auto">
        <p className="text-xs text-[var(--text-primary)] font-bold mb-1">{title}</p>
        {description && (
          <p className="text-[10px] text-[var(--text-secondary)]/60 leading-relaxed">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-color)]">
          <span className="text-[9px] uppercase tracking-wider text-[var(--primary-color)] font-bold">
            {action.label} &rarr;
          </span>
        </div>
      )}
    </div>
  );

  if (bare) return content;

  return (
    <GlassCard
      onClick={action ? action.onClick : onClick}
      className={cn(
        'flex flex-col justify-between h-full p-5 min-h-[220px]',
        (action || onClick) && 'cursor-pointer hover:border-[var(--primary-color)]/20 transition-all duration-300'
      )}
    >
      {content}
    </GlassCard>
  );
};

export default EmptyState;
