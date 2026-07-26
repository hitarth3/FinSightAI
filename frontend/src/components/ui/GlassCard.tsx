import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  className,
  children,
  glow = false,
  ...props
}) => {
  return (
    <motion.div
      className={cn(
        "glass-panel rounded-[var(--radius-card)] p-6 relative overflow-hidden",
        glow && "before:absolute before:inset-0 before:bg-gradient-to-tr before:from-[var(--accent-glow)] before:to-transparent before:opacity-30 before:pointer-events-none",
        className
      )}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
