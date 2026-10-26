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
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold backdrop-blur-md border tracking-wider uppercase",
        
        variant === 'cyan' && "badge-cyan shadow-[0_0_8px_rgba(6,182,212,0.15)]",
        
        variant === 'purple' && "badge-purple shadow-[0_0_8px_rgba(168,85,247,0.15)]",
        
        variant === 'success' && "bg-success/10 border border-success/20 text-success shadow-[0_0_8px_rgba(34,197,94,0.15)]",
        
        variant === 'error' && "bg-error/10 border border-error/20 text-error shadow-[0_0_8px_rgba(239,68,68,0.15)]",
        
        variant === 'warning' && "badge-warning shadow-[0_0_8px_rgba(234,179,8,0.15)]",
        
        variant === 'neutral' && "bg-[var(--surface-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)]",
        
        className
      )}
    >
      {children}
    </span>
  );
};
