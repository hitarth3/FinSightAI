import React, { useState, useEffect, useId } from 'react';
import { cn } from '../../utils/cn';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  icon,
  rightElement,
  className,
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState((value || props.defaultValue || '') as string);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setLocalValue(value as string);
    }
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setLocalValue(e.target.value);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setLocalValue(e.target.value);
    if (onBlur) onBlur(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    if (onChange) onChange(e);
  };

  const hasValue = (value !== undefined && value !== null && value !== '') ||
                    (localValue !== undefined && localValue !== null && localValue !== '');

  return (
    <div className="relative w-full mb-6 group">
      <div
        className={cn(
          "relative flex items-center min-h-[var(--input-height)] rounded-[var(--radius-control)] glass-input-field overflow-hidden transition-all duration-300",
          isFocused && "border-[var(--primary-color)] shadow-[0_0_12px_var(--accent-glow)]",
          error && "border-error focus-within:border-error focus-within:shadow-[0_0_12px_rgba(239,68,68,0.2)]",
          className
        )}
      >
        {icon && (
          <div className="pl-4 text-[var(--icon-muted)] group-focus-within:text-[var(--primary-color)] transition-colors duration-300">
            {icon}
          </div>
        )}

        <input
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "w-full bg-transparent px-4 focus:outline-none transition-all duration-200 text-[var(--text-primary)]",
            label ? "py-4 pt-6 pb-2 text-base" : "py-3.5 text-sm",
            icon && "pl-3",
            rightElement && "pr-12"
          )}
          {...props}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />

        {/* Floating Label */}
        {label && (
          <label htmlFor={inputId}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 text-sm",
              icon && "left-11",
              (isFocused || hasValue) 
                ? "top-3 text-[10px] text-[var(--primary-color)] translate-y-0 uppercase font-semibold tracking-wider" 
                : "text-[var(--text-secondary)] opacity-70"
            )}
          >
            {label}
          </label>
        )}

        {rightElement && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <span 
          className="block mt-1.5 ml-2 text-xs text-error font-medium tracking-wide animate-pulse"
          id={`${inputId}-error`}
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
};
