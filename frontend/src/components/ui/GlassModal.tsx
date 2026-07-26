import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { cn } from '../../utils/cn';

interface GlassModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'md',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "w-full z-10 max-h-[90vh] overflow-y-auto",
              size === 'sm' && "max-w-md",
              size === 'md' && "max-w-xl",
              size === 'lg' && "max-w-3xl",
              size === 'xl' && "max-w-5xl",
              size === '2xl' && "max-w-7xl"
            )}
          >
            <GlassCard className={cn("border border-[var(--border-color)] shadow-glass", className)}>
              <div className="flex items-center justify-between mb-6 border-b border-[var(--border-color)] pb-4">
                <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  {title}
                </h3>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="icon-btn p-1 focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                    aria-label="Close modal"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="text-[var(--text-secondary)]">
                {children}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
