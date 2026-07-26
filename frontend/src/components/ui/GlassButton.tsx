import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  isLoading = false,
  className,
  children,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!buttonRef.current || isLoading) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setRipples(prev => [...prev, { id: Date.now(), x, y }]);
  };

  const removeRipple = (id: number) => {
    setRipples(prev => prev.filter(r => r.id !== id));
  };

  return (
    <motion.button
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      whileHover={{ scale: props.disabled || isLoading ? 1 : 1.01 }}
      whileTap={{ scale: props.disabled || isLoading ? 1 : 0.98 }}
      className={cn(
        "relative overflow-hidden font-medium min-h-[var(--button-height)] py-2.5 px-6 rounded-[var(--radius-button)] flex items-center justify-center transition-all duration-300 gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-color)]",
        fullWidth && "w-full",
        
        variant === 'primary' && "bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white shadow-glow-accent focus:ring-[var(--primary-color)]",
        
        variant === 'secondary' && "bg-[var(--surface-raised)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus:ring-[var(--primary-color)]",
        
        variant === 'outline' && "bg-transparent border border-[var(--primary-color)] text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 focus:ring-[var(--primary-color)]",
        
        (props.disabled || isLoading) && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props as any}
    >
      {/* Ripple elements */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-[var(--text-primary)]/15 pointer-events-none animate-ripple"
          style={{
            left: ripple.x - 24,
            top: ripple.y - 24,
            width: 48,
            height: 48,
          }}
          onAnimationEnd={() => removeRipple(ripple.id)}
        />
      ))}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}

      <span className={cn(isLoading ? "opacity-0 pointer-events-none" : "opacity-100")}>{children}</span>
    </motion.button>
  );
};
