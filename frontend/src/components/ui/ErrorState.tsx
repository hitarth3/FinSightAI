import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { GlassCard } from './GlassCard';

interface ErrorStateProps {
  title?: string;
  /** User-facing message only — never pass a raw error/exception string here. */
  message: string;
  onRetry?: () => void;
  bare?: boolean;
  className?: string;
}

/**
 * Shared error placeholder for failed data fetches. Reference pattern:
 * SmartInvestmentDashboardCard.tsx's "Portfolio Sync Failed" block.
 *
 * Always pass a friendly, specific `message` — never the raw error/exception
 * text (stack traces, backend `detail` strings) that some screens were
 * displaying directly to the user.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something Went Wrong',
  message,
  onRetry,
  bare = false,
  className,
}) => {
  const content = (
    <div className={cn('flex flex-col items-start text-left', className)}>
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-[10px] uppercase font-bold tracking-widest text-error">
          {title}
        </span>
        <div className="p-2 bg-error/10 rounded-lg text-error shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
      </div>
      <p className="text-xs text-error/90 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-[10px] uppercase tracking-wider font-bold text-error hover:underline focus:outline-none focus:ring-1 focus:ring-error rounded"
        >
          Try Again
        </button>
      )}
    </div>
  );

  if (bare) return content;

  return (
    <GlassCard className="flex flex-col justify-between h-full p-5 border-error/20 bg-error/5">
      {content}
    </GlassCard>
  );
};

export default ErrorState;
