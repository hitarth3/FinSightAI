import React, { createContext, useContext, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { authMachine } from '../features/login/machine/authMachine';
import { authService } from '../features/login/services/authService';
import { UserProfile } from '../features/login/types/authTypes';
import { useToasts } from './ToastContext';
import { securityLogger } from '../utils/securityLogger';

interface AuthContextType {
  state: any;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isMfaRequired: boolean;
  isLoading: boolean;
  error: string | null;
  lockoutTimeLeft: number;
  login: (email: string, pass: string, googleToken?: string) => Promise<void>;
  verifyOtp: (otp: string, trustDevice: boolean) => Promise<void>;
  logout: () => void;
  resetSession: () => void;
  triggerTimeout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, send] = useMachine(authMachine);
  const toasts = useToasts();

  const context = snapshot.context;
  const isState = (val: string) => snapshot.matches(val);

  // 1. JWT Storage & Lifecycle triggers
  useEffect(() => {
    if (isState('verified') && context.user) {
      localStorage.setItem('finsight_user', JSON.stringify(context.user));
    } else if (isState('idle')) {
      localStorage.removeItem('finsight_access_token');
      localStorage.removeItem('finsight_refresh_token');
      localStorage.removeItem('finsight_user');
    }
  }, [snapshot.value, context.user]);

  // 2. Lockout Countdown Tick (1 second interval)
  useEffect(() => {
    let timer: any;
    if (isState('locked') && context.lockoutTimeLeft > 0) {
      timer = setInterval(() => {
        send({ type: 'TICK_LOCKOUT' });
      }, 1000);
    } else if (isState('locked') && context.lockoutTimeLeft === 0) {
      send({ type: 'UNLOCK' });
      toasts.toast('info', 'Account Unlocked', 'Rate limit lockout period completed. You can try signing in again.', 4000);
    }
    return () => clearInterval(timer);
  }, [snapshot.value, context.lockoutTimeLeft]);

  // 4. Handle global unauthorized API calls
  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn('[Security] Unauthorized response detected. Terminating session.');
      logout();
      toasts.toast('error', 'Session Terminated', 'Your credentials could not be validated. Please log in again.');
    };
    window.addEventListener('unauthorized-api-call', handleUnauthorized);
    return () => {
      window.removeEventListener('unauthorized-api-call', handleUnauthorized);
    };
  }, []);

  // 3. Resolve the real session-restore check once on mount (the machine's
  // own guard validates any existing localStorage token/user before deciding
  // whether to land in 'verified' or 'idle') — no artificial delay or splash
  // screen gates this.
  useEffect(() => {
    send({ type: 'INIT_COMPLETE' });
  }, []);

  const login = async (email: string, pass: string, googleToken?: string) => {
    send({ type: 'SUBMIT_LOGIN', email });

    try {
      // Google OAuth sentinel path — skip password validation
      const isGoogleAuth = pass === '__GOOGLE_AUTH__';
      const response = isGoogleAuth
        ? await authService.googleLogin(email, googleToken || '')
        : await authService.login({ email, password: pass });

      if (response.success) {
        if (response.accessToken) {
          localStorage.setItem('finsight_access_token', response.accessToken);
        }
        if (response.refreshToken) {
          localStorage.setItem('finsight_refresh_token', response.refreshToken);
        }
        send({
          type: 'LOGIN_SUCCESS',
          user: response.user!,
          mfaRequired: response.requiresMfa || false
        });
        const msg = isGoogleAuth
          ? 'Google account connected successfully.'
          : 'MFA OTP code dispatched to secure mailbox.';
        toasts.success('Credentials Validated', msg);
      } else {
        send({ type: 'LOGIN_FAILURE', error: response.error || 'Authentication failed' });
        toasts.error('Authentication Failed', response.error || 'Invalid username or password.');

        // Handle Lockout Trigger on failed attempts
        const attemptsLimit = Number(import.meta.env.VITE_RATE_LIMIT_ATTEMPTS) || 3;
        if (context.failedAttempts + 1 >= attemptsLimit) {
          const lockoutSecs = 30;
          send({ type: 'TRIGGER_LOCKOUT', duration: lockoutSecs });
          securityLogger.log('RATE_LIMIT_LOCK', `Account rate-limited. Blocked for ${lockoutSecs}s for ${email}`);
          toasts.error('Rate Limit Exceeded', `Too many failed attempts. Locked for ${lockoutSecs}s.`);
        }
      }
    } catch (err: any) {
      send({ type: 'LOGIN_FAILURE', error: err.message || 'Server error' });
      toasts.error('Network Error', 'Failed to communicate with authentication services.');
    }
  };

  const verifyOtp = async (otp: string, trustDevice: boolean) => {
    send({ type: 'SUBMIT_OTP' });

    try {
      const response = await authService.verifyOtp({ 
        email: context.email, 
        otp, 
        trustDevice,
        userId: context.user?.id
      });

      if (response.success) {
        if (response.accessToken) {
          localStorage.setItem('finsight_access_token', response.accessToken);
        }
        if (response.refreshToken) {
          localStorage.setItem('finsight_refresh_token', response.refreshToken);
        }
        send({ type: 'OTP_SUCCESS', user: response.user! });
        toasts.success('Verification Complete', 'Access granted to secure intelligence session.');
        
        if (trustDevice) {
          toasts.toast('success', 'Device Trusted', 'This device has been authorized for 30 days.', 3000);
        }
      } else {
        send({ type: 'OTP_FAILURE', error: response.error || 'Invalid OTP code' });
        toasts.error('MFA Verification Failed', response.error || 'Incorrect OTP code entered.');
      }
    } catch (err: any) {
      send({ type: 'OTP_FAILURE', error: err.message || 'Server error' });
      toasts.error('Network Error', 'Failed to connect to verification servers.');
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('finsight_refresh_token');
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    send({ type: 'LOGOUT' });
  };

  const resetSession = () => {
    send({ type: 'RESET_SESSION' });
  };

  const triggerTimeout = () => {
    if (isState('verified') || isState('mfa') || isState('validatingOtp')) {
      send({ type: 'TRIGGER_TIMEOUT' });
      securityLogger.log('SESSION_TIMEOUT', `Session auto-terminated due to user inactivity.`);
      toasts.warning('Session Expired', 'You have been logged out due to inactivity.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        state: snapshot.value,
        user: context.user,
        isAuthenticated: isState('verified') || isState('mfa') || isState('validatingOtp'),
        isMfaRequired: isState('mfa') || isState('validatingOtp'),
        isLoading: isState('validating') || isState('validatingOtp') || isState('initializing'),
        error: context.error,
        lockoutTimeLeft: context.lockoutTimeLeft,
        login,
        verifyOtp,
        logout,
        resetSession,
        triggerTimeout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
