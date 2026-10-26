import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, Mail, User, ShieldAlert } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { GlassInput } from '../../../components/ui/GlassInput';
import { GlassButton } from '../../../components/ui/GlassButton';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { useToasts } from '../../../context/ToastContext';
import { authService } from '../services/authService';
import { useAuth } from '../../../context/AuthContext';
import { BrandingSection } from '../../../components/dashboard/BrandingSection';

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

interface SignUpPageProps {
  onGoToLogin: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onGoToLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toasts = useToasts();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const passwordValue = watch('password');

  const onFormSubmit = async (data: SignUpFormValues) => {
    setIsLoading(true);
    try {
      const result = await authService.register({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });

      if (result.success && result.user) {
        toasts.success('Account Created!', `Welcome to FinSightAI, ${result.user.fullName}!`);
        // Auto-login after registration
        await login(data.email, data.password);
      } else {
        toasts.error('Registration Failed', result.error || 'Could not create account.');
      }
    } catch (err: any) {
      toasts.error('Network Error', 'Failed to connect to registration service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative overflow-hidden select-none">
      {/* LEFT: Branding Panel */}
      <div className="login-brand-panel w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-[var(--border-color)] relative z-10 flex flex-col justify-between">
        <BrandingSection />
      </div>

      {/* RIGHT: Sign Up Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 lg:p-16 z-10 min-h-[500px]">
        <GlassCard className="w-full max-w-[420px] shadow-glass relative p-6 md:p-8" glow>
          {/* Header */}
          <div className="text-center mb-8 select-none">
            <h3 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2 leading-none">
              Create Account
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-none">
              Join FinSightAI and unlock your financial intelligence
            </p>
          </div>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {/* Full Name */}
            <GlassInput
              label="Full Name"
              type="text"
              error={errors.fullName?.message}
              icon={<User className="w-4 h-4" />}
              {...register('fullName')}
              autoComplete="name"
              required
            />

            {/* Email */}
            <GlassInput
              label="Email Address"
              type="email"
              error={errors.email?.message}
              icon={<Mail className="w-4 h-4" />}
              {...register('email')}
              autoComplete="email"
              required
            />

            {/* Password */}
            <div className="relative">
              <GlassInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                error={errors.password?.message}
                icon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)] p-1 rounded transition-colors duration-200 cursor-pointer focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                {...register('password')}
                autoComplete="new-password"
                required
              />
            </div>

            <PasswordStrengthMeter password={passwordValue} />

            {/* Confirm Password */}
            <div className="relative">
              <GlassInput
                label="Confirm Password"
                type={showConfirm ? 'text' : 'password'}
                error={errors.confirmPassword?.message}
                icon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)] p-1 rounded transition-colors duration-200 cursor-pointer focus:outline-none"
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                {...register('confirmPassword')}
                autoComplete="new-password"
                required
              />
            </div>

            {/* Terms */}
            <p className="text-[10px] text-[var(--text-secondary)]/60 text-center leading-relaxed">
              By creating an account you agree to our{' '}
              <span className="text-[var(--primary-color)] cursor-pointer hover:underline">Terms of Service</span>
              {' '}and{' '}
              <span className="text-[var(--primary-color)] cursor-pointer hover:underline">Privacy Policy</span>.
            </p>

            <GlassButton
              type="submit"
              fullWidth
              isLoading={isLoading}
            >
              Create My Account
            </GlassButton>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-6 select-none">
            <p className="text-xs text-[var(--text-secondary)]">
              Already have an account?{' '}
              <button
                onClick={onGoToLogin}
                className="text-[var(--primary-color)] hover:underline font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] rounded p-0.5"
              >
                Sign In
              </button>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
