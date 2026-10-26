import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { BrandingSection } from '../../../components/dashboard/BrandingSection';
import { LoginForm } from '../components/LoginForm';
import { MfaVerification } from '../components/MfaVerification';
import { SignUpPage } from './SignUpPage';
import { useAuth } from '../../../context/AuthContext';
import { GlassCard } from '../../../components/ui/GlassCard';
import { GlassButton } from '../../../components/ui/GlassButton';

export const LoginPage = ({ onExploreDemo }: { onExploreDemo: () => void }) => {
  const {
    state,
    user,
    isMfaRequired,
    isLoading,
    error,
    lockoutTimeLeft,
    login,
    verifyOtp,
    logout,
    resetSession,
    triggerTimeout,
    isAuthenticated
  } = useAuth();

  const [showSignUp, setShowSignUp] = useState(false);

  const handleLoginSubmit = (values: { email: string; password?: string }) => {
    login(values.email, values.password || '');
  };

  const handleMfaSubmit = (otp: string) => {
    verifyOtp(otp);
  };

  // Show the Sign-Up Page
  if (showSignUp) {
    return <SignUpPage onGoToLogin={() => setShowSignUp(false)} />;
  }

  return (
    <div className="auth-layout min-h-screen w-full flex flex-col lg:flex-row relative overflow-hidden">

      {/* 1. LEFT COLUMN: Premium AI Finance Branding Panel */}
      <div className="login-brand-panel w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-[var(--border-color)] relative z-10 flex flex-col justify-between">
        <BrandingSection />
      </div>

      {/* 2. RIGHT COLUMN: Central Auth Forms & Status Panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 lg:p-16 z-10 min-h-[500px]">
        <AnimatePresence mode="wait">
          {/* A. Account Lockout View */}
          {state === 'locked' ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[400px]"
            >
              <GlassCard className="text-center p-8 border border-error/25 shadow-[0_8px_32px_rgba(239,68,68,0.08)]" glow>
                <div className="w-14 h-14 rounded-full bg-error/10 border border-error/20 flex items-center justify-center mx-auto mb-5 text-error animate-bounce">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-3 leading-none">
                  Security Lockout Active
                </h3>
                <p className="text-xs text-textSecondaryDark leading-relaxed mb-6">
                  Too many failed authentication attempts. Access has been locked out to prevent brute-force attacks.
                </p>
                <div className="py-4 px-6 rounded-xl bg-error/5 border border-error/15 text-2xl font-black text-error mb-6 tracking-wider select-all font-mono">
                  Locked: {lockoutTimeLeft}s
                </div>
                <p className="text-[10px] text-textSecondaryDark/40">
                  Please wait until the countdown clears or authenticate via verified networks.
                </p>
              </GlassCard>
            </motion.div>
          ) :

          // B. Session Timeout View
          state === 'session_timeout' ? (
            <motion.div
              key="timeout"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[400px]"
            >
              <GlassCard className="text-center p-8 border border-yellow-500/20 shadow-[0_8px_32px_rgba(234,179,8,0.08)]" glow>
                <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-5 text-yellow-500">
                  <RefreshCw className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-3 leading-none">
                  Session Terminated
                </h3>
                <p className="text-xs text-textSecondaryDark leading-relaxed mb-6">
                  Your session ended after a period of inactivity. Sign in again to continue.
                </p>
                <GlassButton
                  fullWidth
                  onClick={resetSession}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  Back to sign in
                </GlassButton>
              </GlassCard>
            </motion.div>
          ) :

          // C. Multi-Factor Authentication View
          isMfaRequired ? (
            <motion.div
              key="mfa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-[420px]"
            >
              <MfaVerification
                email={user?.email || 'demo@finsight.ai'}
                onVerify={handleMfaSubmit}
                onBack={logout}
                isLoading={isLoading}
                errorMsg={error}
              />
            </motion.div>
          ) :

          // D. Primary Credentials Form View
          (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full max-w-[420px] flex flex-col items-center"
            >
              <LoginForm
                  onExploreDemo={onExploreDemo}
                onSubmit={handleLoginSubmit}
                isLoading={isLoading}
                errorMsg={error}
                onGoToSignUp={() => setShowSignUp(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
