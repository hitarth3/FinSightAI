import { createMachine, assign } from 'xstate';
import { UserProfile } from '../types/authTypes';

interface AuthContext {
  email: string;
  user: UserProfile | null;
  error: string | null;
  failedAttempts: number;
  lockoutTimeLeft: number; // in seconds
  mfaRequired: boolean;
}

type AuthEvent =
  | { type: 'INIT_COMPLETE' }
  | { type: 'SUBMIT_LOGIN'; email: string }
  | { type: 'LOGIN_VALIDATING' }
  | { type: 'LOGIN_SUCCESS'; user: UserProfile; mfaRequired: boolean }
  | { type: 'LOGIN_FAILURE'; error: string }
  | { type: 'SUBMIT_OTP' }
  | { type: 'OTP_SUCCESS'; user: UserProfile }
  | { type: 'OTP_FAILURE'; error: string }
  | { type: 'OTP_BACK' }
  | { type: 'TRIGGER_LOCKOUT'; duration: number }
  | { type: 'TICK_LOCKOUT' }
  | { type: 'UNLOCK' }
  | { type: 'TRIGGER_TIMEOUT' }
  | { type: 'RESET_SESSION' }
  | { type: 'LOGOUT' };

export const authMachine = createMachine(
  {
    id: 'auth',
    initial: 'initializing',
    types: {} as {
      context: AuthContext;
      events: AuthEvent;
    },
    context: {
      email: '',
      user: null,
      error: null,
      failedAttempts: 0,
      lockoutTimeLeft: 0,
      mfaRequired: true,
    },
    states: {
      initializing: {
        on: {
          INIT_COMPLETE: [
            {
              target: 'verified',
              guard: () => {
                const token = localStorage.getItem('finsight_access_token');
                const user = localStorage.getItem('finsight_user');
                return !!token && !!user;
              },
              actions: assign({
                user: () => {
                  try {
                    return JSON.parse(localStorage.getItem('finsight_user') || 'null');
                  } catch {
                    return null;
                  }
                },
                mfaRequired: false
              })
            },
            { target: 'idle' }
          ],
        },
      },
      idle: {
        entry: assign({
          error: null,
        }),
        on: {
          SUBMIT_LOGIN: {
            target: 'validating',
            actions: assign({ email: ({ event }) => event.email }),
          },
          TRIGGER_LOCKOUT: {
            target: 'locked',
            actions: assign({ lockoutTimeLeft: ({ event }) => event.duration }),
          },
        },
      },
      validating: {
        on: {
          LOGIN_SUCCESS: [
            {
              target: 'mfa',
              guard: ({ event }) => event.mfaRequired,
              actions: assign({
                user: ({ event }) => event.user,
                mfaRequired: true,
                error: null,
                failedAttempts: 0,
              }),
            },
            {
              target: 'verified',
              actions: assign({
                user: ({ event }) => event.user,
                mfaRequired: false,
                error: null,
                failedAttempts: 0,
              }),
            },
          ],
          LOGIN_FAILURE: {
            target: 'idle',
            actions: assign({
              error: ({ event }) => event.error,
              failedAttempts: ({ context }) => context.failedAttempts + 1,
            }),
          },
        },
      },
      mfa: {
        on: {
          SUBMIT_OTP: { target: 'validatingOtp' },
          OTP_BACK: { target: 'idle' },
          TRIGGER_TIMEOUT: { target: 'session_timeout' },
        },
      },
      validatingOtp: {
        on: {
          OTP_SUCCESS: {
            target: 'verified',
            actions: assign({
              user: ({ event }) => event.user,
              error: null,
            }),
          },
          OTP_FAILURE: {
            target: 'mfa',
            actions: assign({
              error: ({ event }) => event.error,
            }),
          },
        },
      },
      verified: {
        on: {
          TRIGGER_TIMEOUT: { target: 'session_timeout' },
          LOGOUT: { target: 'idle', actions: assign({ user: null, email: '' }) },
        },
      },
      locked: {
        on: {
          TICK_LOCKOUT: {
            actions: assign({
              lockoutTimeLeft: ({ context }) => Math.max(0, context.lockoutTimeLeft - 1),
            }),
          },
          UNLOCK: {
            target: 'idle',
            actions: assign({
              lockoutTimeLeft: 0,
              failedAttempts: 0,
              error: null,
            }),
          },
        },
      },
      session_timeout: {
        on: {
          RESET_SESSION: {
            target: 'idle',
            actions: assign({
              user: null,
              email: '',
              error: 'Session timed out due to inactivity.',
            }),
          },
        },
      },
    },
  }
);
