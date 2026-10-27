import React from 'react';
import { cn } from '../../utils/cn';

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'purple' | 'success' | 'error' | 'neutral' | 'warning';
  className?: string;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = 'cyan',
  className,
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        
        variant === 'cyan' && "badge-cyan",
        
        variant === 'purple' && "badge-purple",
        
        variant === 'success' && "bg-success/10 border border-success/20 text-success",
        
        variant === 'error' && "bg-error/10 border border-error/20 text-error",
        
        variant === 'warning' && "badge-warning",
        
        variant === 'neutral' && "bg-[var(--surface-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)]",
        
        className
      )}
    >
      {children}
    </span>
  );
};
