import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, Mail, ShieldAlert } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { GlassInput } from '../../../components/ui/GlassInput';
import { GlassButton } from '../../../components/ui/GlassButton';
import { useToasts } from '../../../context/ToastContext';
import { authService } from '../services/authService';
import { useAuth } from '../../../context/AuthContext';

// Strong Validation Schema using Zod
const loginSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (data: LoginFormValues) => void;
  isLoading: boolean;
  errorMsg?: string | null;
  onGoToSignUp: () => void;
  onExploreDemo: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  isLoading,
  errorMsg,
  onGoToSignUp,
  onExploreDemo,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const toasts = useToasts();
  const { login } = useAuth();

  useEffect(() => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return;
    // Dynamically load Google GSI client library
    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) {
      initGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      initGoogleButton();
    };

    return () => {
      // Don't remove - keep script for reuse
    };
  }, []);

  const initGoogleButton = () => {
    const google = (window as any).google;
    if (!google) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not set');
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        try {
          // Decode the JWT credential from Google to get email
          const base64Url = response.credential.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          const email = payload.email;

          if (!email) {
            toasts.error('Google Sign-In Failed', 'Could not retrieve email from Google.');
            return;
          }

          toasts.toast('info', 'Google Sign-In', `Authenticating ${email}...`, 2000);

          // Delegate Google login to AuthContext (which will fetch/set JWTs and transition state)
          await login(email, '__GOOGLE_AUTH__', response.credential);
        } catch (err) {
          console.error('Failed to process Google credential', err);
          toasts.error('Google Sign-In Error', 'Failed to process Google authentication.');
        }
      },
      auto_select: false
    });

    const btnEl = document.getElementById('google-signin-btn');
    if (btnEl && btnEl.childElementCount === 0) {
      google.accounts.id.renderButton(btnEl, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 356
      });
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  });



  const onFormSubmit = (data: LoginFormValues) => {
    onSubmit(data);
  };

  return (
    <GlassCard className="login-form-card w-full max-w-[440px] relative p-6 md:p-8" glow>
      {/* Header */}
      <div className="text-left mb-8">
        <h3 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mb-2 leading-snug">
          Your next chapter starts here.
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-snug">
          Sign in to your personal finance workspace.
        </p>
      </div>

      {errorMsg && (
        <div
          className="mb-5 p-3 rounded-lg bg-error/15 border border-error/30 text-xs text-error font-medium flex gap-2 items-center animate-shake"
          role="alert"
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {/* Email Field */}
        <GlassInput
          label="Email Address"
          type="email"
          error={errors.email?.message}
          icon={<Mail className="w-4 h-4" />}
          {...register('email')}
          autoComplete="email"
          required
        />

        {/* Password Field */}
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
                className="text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)] p-1 rounded transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            {...register('password')}
            autoComplete="current-password"
            required
          />
        </div>



        <GlassButton
          type="submit"
          fullWidth
          isLoading={isLoading}
        >
          Sign in
        </GlassButton>
      </form>

      {/* Social Logins */}
      {import.meta.env.VITE_GOOGLE_CLIENT_ID && <div className="mt-6 select-none">
        <div className="relative flex items-center justify-center mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-color)]" />
          </div>
          <span className="relative px-3 bg-[var(--bg-color)] transition-colors duration-300 text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">
            Or Continue With Google
          </span>
        </div>

        {/* Real Google Sign-In button rendered by GSI library */}
        <div className="flex flex-col items-center justify-center w-full">
          <div
            id="google-signin-btn"
            className="w-full flex justify-center hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 min-h-[44px]"
          />
        </div>
      </div>

      }
      {/* Create Account Link */}
      <div className="text-center mt-6 select-none">
        <p className="text-xs text-[var(--text-secondary)]">
          Don't have an account?{' '}
          <button
            onClick={onGoToSignUp}
            className="text-[var(--primary-color)] hover:underline font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] rounded p-0.5"
          >
            Create Account
          </button>
        </p>
      </div>
      <div className="demo-entry"><span>Just taking a look?</span><button type="button" onClick={onExploreDemo}>Explore the demo <span aria-hidden="true">↗</span></button><small>No signup required · Fictional sample data</small></div>
    </GlassCard>
  );
};
