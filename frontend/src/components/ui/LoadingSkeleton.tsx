import React from 'react';
import { cn } from '../../utils/cn';
import { GlassCard } from './GlassCard';

interface LoadingSkeletonProps {
  /** Number of skeleton rows/lines to render (ignored for shape="card"). */
  rows?: number;
  /** Visual shape of the skeleton content. */
  shape?: 'card' | 'rows' | 'circle';
  /** Wrap the skeleton in a GlassCard. Set false when the parent already provides one. */
  bare?: boolean;
  className?: string;
  /** Minimum height, matching the loaded content's card so layout doesn't shift. */
  minHeight?: number;
}

/**
 * Shared loading placeholder — replaces the ad hoc `animate-pulse` blocks that
 * were previously hand-rolled per component (each with slightly different
 * markup/wording). Reference pattern: SmartInvestmentDashboardCard.tsx.
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows = 3,
  shape = 'card',
  bare = false,
  className,
  minHeight,
}) => {
  const content = (
    <div
      className={cn('animate-pulse', shape !== 'card' && 'space-y-3', className)}
      style={minHeight ? { minHeight } : undefined}
      role="status"
      aria-label="Loading"
    >
      {shape === 'card' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="h-3 w-32 bg-[var(--surface-raised)] rounded" />
            <div className="p-2 bg-[var(--surface-subtle)] rounded-lg h-9 w-9" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-44 bg-[var(--surface-raised)] rounded" />
            <div className="h-4 w-28 bg-[var(--surface-raised)] rounded" />
          </div>
        </>
      )}

      {shape === 'rows' &&
        Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="h-4 w-full bg-[var(--surface-raised)] rounded" />
        ))}

      {shape === 'circle' && (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[var(--surface-raised)] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 bg-[var(--surface-raised)] rounded" />
            <div className="h-3 w-1/3 bg-[var(--surface-subtle)] rounded" />
          </div>
        </div>
      )}
    </div>
  );

  if (bare) return content;

  return (
    <GlassCard className={cn('flex flex-col justify-between h-full p-5', minHeight && undefined)}>
      {content}
    </GlassCard>
  );
};

export default LoadingSkeleton;
