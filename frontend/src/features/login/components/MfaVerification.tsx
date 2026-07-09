import React, { useRef, useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, KeySquare } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { GlassButton } from '../../../components/ui/GlassButton';
import { useToasts } from '../../../context/ToastContext';
import { cn } from '../../../utils/cn';

interface MfaVerificationProps {
  email: string;
  onVerify: (otp: string, trustDevice: boolean) => void;
  onBack: () => void;
  isLoading: boolean;
  errorMsg?: string | null;
}

export const MfaVerification: React.FC<MfaVerificationProps> = ({
  email,
  onVerify,
  onBack,
  isLoading,
  errorMsg,
}) => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [trustDevice, setTrustDevice] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const toasts = useToasts();

  useEffect(() => {
    // Focus first element on boot
    setTimeout(() => {
      if (inputsRef.current[0]) {
        inputsRef.current[0].focus();
      }
    }, 100);
  }, []);

  const handleChange = (element: HTMLInputElement, index: number) => {
    const value = element.value.replace(/[^0-9]/g, '');
    if (!value) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Shift focus forward if input is filled and has a next box
    if (index < 5 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      
      // If active field is empty, shift focus back first
      if (!otp[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
        newOtp[index - 1] = '';
      } else {
        newOtp[index] = '';
      }
      
      setOtp(newOtp);
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    
    if (pasteData.length >= 6) {
      const pasteOtp = pasteData.slice(0, 6).split('');
      setOtp(pasteOtp);
      inputsRef.current[5]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    
    if (otpCode.length < 6) {
      toasts.warning('Incomplete Code', 'Please fill in all 6 verification digits.');
      return;
    }

    onVerify(otpCode, trustDevice);
  };

  return (
    <GlassCard className="w-full max-w-[420px] shadow-glass relative p-6 md:p-8" glow>
      {/* Header and Back navigation */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
          aria-label="Back to login credentials"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]/50">
          MFA Authentication
        </span>
      </div>

      <div className="text-center mb-6 select-none">
        <div className="w-12 h-12 rounded-full bg-[var(--accent-glow-secondary)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-4 text-[var(--primary-color)]">
          <KeySquare className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
          Verify Your Identity
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          We've sent a 6-digit security OTP to <br />
          <span className="text-[var(--text-primary)] font-semibold">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* OTP Input Fields */}
        <div className="flex justify-between gap-2 max-w-sm mx-auto" onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={el => { inputsRef.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(e.target, idx)}
              onKeyDown={e => handleKeyDown(e, idx)}
              className={cn(
                "w-12 h-14 bg-[var(--surface-muted)] border border-[var(--border-color)] text-center text-xl font-bold text-[var(--text-primary)] rounded-xl focus:outline-none transition-all select-all",
                activeIndex === idx && "border-[var(--primary-color)] shadow-[0_0_10px_var(--accent-glow)]",
                errorMsg && "border-error focus:border-error"
              )}
              onFocus={() => setActiveIndex(idx)}
              onBlur={() => setActiveIndex(-1)}
              required
              aria-label={`Digit ${idx + 1}`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="text-center text-xs text-error font-medium animate-shake">
            {errorMsg}
          </div>
        )}

        {/* --- ENHANCEMENT 3: Trust This Device Checkbox --- */}
        <div className="flex items-center gap-2 px-1 select-none">
          <label className="relative flex items-center gap-2.5 cursor-pointer group text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={e => setTrustDevice(e.target.checked)}
              className="peer sr-only"
            />
            {/* Custom styled glassmorphic box */}
            <div className="w-5 h-5 rounded-md border border-[var(--border-color)] bg-[var(--surface-subtle)] peer-checked:border-[var(--primary-color)] peer-checked:bg-[var(--accent-glow)] flex items-center justify-center transition-all duration-300 group-hover:border-[var(--primary-color)]/50">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--primary-color)] scale-0 peer-checked:scale-100 transition-transform duration-300" />
            </div>
            <span>Trust this device for 30 days</span>
          </label>
        </div>

        <GlassButton
          type="submit"
          fullWidth
          isLoading={isLoading}
          disabled={otp.some(d => !d)}
        >
          Verify OTP Code
        </GlassButton>
      </form>

      <div className="text-center mt-6">
        <p className="text-[10px] text-[var(--text-secondary)]/50 select-none">
          Haven't received your OTP code?{' '}
          <button 
            type="button" 
            onClick={() => toasts.toast('info', 'Code Resent', 'A new mock validation OTP code has been dispatched.', 3000)}
            className="text-[var(--primary-color)] hover:underline font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] rounded p-0.5"
          >
            Resend Code
          </button>
        </p>
      </div>
    </GlassCard>
  );
};
