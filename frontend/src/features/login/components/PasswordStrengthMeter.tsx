import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface PasswordStrengthMeterProps {
  password?: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '' }) => {
  const evaluateStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-[var(--surface-raised)]', textColor: 'text-[var(--text-secondary)]/50', checks: { length: false, upper: false, lower: false, number: false, special: false } };

    const hasMinLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);

    let score = 0;
    if (hasMinLength) score += 1;
    if (hasUpper) score += 1;
    if (hasLower) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;

    let label = 'Weak';
    let color = 'bg-error'; // Red
    let textColor = 'text-error';
    let segments = 1;

    if (score === 3 || score === 4) {
      label = 'Medium';
      color = 'bg-yellow-500';
      textColor = 'text-yellow-500';
      segments = 2;
    } else if (score === 5) {
      label = 'Strong';
      color = 'bg-success';
      textColor = 'text-success';
      segments = 3;
    }

    return {
      score: segments,
      label,
      color,
      textColor,
      checks: {
        length: hasMinLength,
        upper: hasUpper,
        lower: hasLower,
        number: hasNumber,
        special: hasSpecial
      }
    };
  };

  const strength = evaluateStrength(password);

  if (!password) return null;

  return (
    <div className="w-full mt-2 mb-4 px-1 select-none animate-fadeIn">
      {/* Label and Score Indicators */}
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="text-[var(--text-secondary)]/80 font-medium">
          Password Strength:
        </span>
        <span className={cn("font-bold uppercase tracking-wider text-[10px]", strength.textColor)}>
          {strength.label}
        </span>
      </div>

      {/* Progress Segments (3-tier) */}
      <div className="grid grid-cols-3 gap-1.5 h-1.5 mb-3 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
        {[1, 2, 3].map(index => (
          <div
            key={index}
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              index <= strength.score ? strength.color : "bg-[var(--surface-raised)]"
            )}
          />
        ))}
      </div>

      {/* Checklist (5 criteria) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[9px] text-[var(--text-secondary)]/90">
        <div className="flex items-center gap-1.5">
          {strength.checks.length ? (
            <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-secondary)]/30 shrink-0" />
          )}
          <span>Minimum 8 Characters</span>
        </div>
        <div className="flex items-center gap-1.5">
          {strength.checks.upper ? (
            <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-secondary)]/30 shrink-0" />
          )}
          <span>Uppercase Letter (A-Z)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {strength.checks.lower ? (
            <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-secondary)]/30 shrink-0" />
          )}
          <span>Lowercase Letter (a-z)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {strength.checks.number ? (
            <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-secondary)]/30 shrink-0" />
          )}
          <span>Number (0-9)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {strength.checks.special ? (
            <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-secondary)]/30 shrink-0" />
          )}
          <span>Special Character (!@#$)</span>
        </div>
      </div>
    </div>
  );
};
