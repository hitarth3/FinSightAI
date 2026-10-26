import { LoginRequest, LoginResponse, OtpVerificationRequest, UserProfile } from '../types/authTypes';
import { securityLogger } from '../../../utils/securityLogger';

import { API_BASE, publicFetch } from '../../../services/apiClient';

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { email, password } = credentials;

    if (!email || !password) {
      securityLogger.log('LOGIN_FAILURE', `Attempt failed: Missing email or password for ${email || 'unknown'}`);
      return { success: false, error: 'Email and password are required.' };
    }

    try {
      const response = await publicFetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          device_name: 'web-browser'
        })
      });

      const resJson = await response.json();
      if (!response.ok) {
        securityLogger.log('LOGIN_FAILURE', `Invalid credentials attempt for ${email}`);
        return { success: false, error: resJson.message || resJson.detail || 'Incorrect email or password.' };
      }

      const payload = resJson.data;
      securityLogger.log('LOGIN_ATTEMPT', `Successful credentials authentication for ${email}`);

      if (payload.requires_mfa) {
        return {
          success: true,
          requiresMfa: true,
          user: {
            id: payload.user_id,
            email,
            fullName: '',
            role: 'FinSightAI Member',
            lastLogin: ''
          }
        };
      }

      // Load user profile safely
      let userData = {
        id: payload.user_id || '',
        email: email,
        fullName: '',
        role: 'FinSightAI Member',
        lastLogin: new Date().toLocaleDateString()
      };

      try {
        const meResponse = await publicFetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${payload.access_token}` }
        });
        if (meResponse.ok) {
          const meJson = await meResponse.json();
          if (meJson?.data) {
            userData = {
              id: meJson.data.id || userData.id,
              email: meJson.data.email || userData.email,
              fullName: meJson.data.full_name || '',
              role: 'FinSightAI Member',
              lastLogin: new Date().toLocaleDateString()
            };
          }
        }
      } catch (meErr) {
        console.warn('Profile sync fallback:', meErr);
      }

      return {
        success: true,
        requiresMfa: false,
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        user: userData
      };
    } catch (err) {
      securityLogger.log('LOGIN_FAILURE', `Network error during login for ${email}`);
      return { success: false, error: 'Failed to connect to authentication server.' };
    }
  },

  // Called directly by GoogleAuth flow — bypasses password check
  googleLogin: async (email: string, googleCredential: string): Promise<LoginResponse> => {
    try {
      const response = await publicFetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: googleCredential,
          email: email,
          device_name: 'google-oauth'
        })
      });

      const resJson = await response.json();
      if (!response.ok) {
        securityLogger.log('LOGIN_FAILURE', `Google OAuth login failed for ${email}`);
        return { success: false, error: resJson.message || resJson.detail || 'Google authentication failed.' };
      }

      const payload = resJson.data;
      securityLogger.log('LOGIN_ATTEMPT', `Google OAuth authentication for ${email}`);

      // Load user profile safely
      let userData = {
        id: payload.user_id || '',
        email: email,
        fullName: '',
        role: 'FinSightAI Member',
        lastLogin: new Date().toLocaleDateString()
      };

      try {
        const meResponse = await publicFetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${payload.access_token}` }
        });
        if (meResponse.ok) {
          const meJson = await meResponse.json();
          if (meJson?.data) {
            userData = {
              id: meJson.data.id || userData.id,
              email: meJson.data.email || userData.email,
              fullName: meJson.data.full_name || '',
              role: 'FinSightAI Member',
              lastLogin: new Date().toLocaleDateString()
            };
          }
        }
      } catch (meErr) {
        console.warn('Profile sync fallback:', meErr);
      }

      return {
        success: true,
        requiresMfa: false,
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        user: userData
      };
    } catch (err) {
      return { success: false, error: 'Failed to connect to Google authentication server.' };
    }
  },

  register: async (data: { fullName: string; email: string; password: string }): Promise<LoginResponse> => {
    if (!data.email || !data.password || !data.fullName) {
      return { success: false, error: 'All fields are required.' };
    }
    if (data.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }

    try {
      const response = await publicFetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.fullName,
          email: data.email,
          password: data.password,
          monthly_income: 0.0,
          risk_profile: 'Moderate'
        })
      });

      const resJson = await response.json();
      if (!response.ok) {
        return { success: false, error: resJson.message || resJson.detail || 'Registration failed.' };
      }

      const user = resJson.data;
      securityLogger.log('LOGIN_ATTEMPT', `New account registered for ${data.email}`);

      return {
        success: true,
        requiresMfa: false,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: 'FinSightAI Member',
          lastLogin: new Date().toLocaleDateString()
        }
      };
    } catch (err) {
      return { success: false, error: 'Failed to connect to registration server.' };
    }
  },

  verifyOtp: async (req: OtpVerificationRequest): Promise<LoginResponse> => {
    if (!req.userId) {
      return { success: false, error: 'User reference missing.' };
    }

    try {
      const response = await publicFetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: req.userId,
          otp_code: req.otp,
          device_name: 'web-browser'
        })
      });

      const resJson = await response.json();
      if (!response.ok) {
        securityLogger.log('MFA_FAILURE', `Invalid OTP code entered for user ${req.userId}`);
        return { success: false, error: resJson.message || resJson.detail || 'Incorrect verification code.' };
      }

      const payload = resJson.data;
      securityLogger.log('MFA_VERIFICATION', `MFA OTP successfully verified for user ${req.userId}`);

      // Load user profile safely
      let userData = {
        id: req.userId,
        email: req.email || '',
        fullName: '',
        role: 'FinSightAI Member',
        lastLogin: new Date().toLocaleDateString()
      };

      try {
        const meResponse = await publicFetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${payload.access_token}` }
        });
        if (meResponse.ok) {
          const meJson = await meResponse.json();
          if (meJson?.data) {
            userData = {
              id: meJson.data.id || userData.id,
              email: meJson.data.email || userData.email,
              fullName: meJson.data.full_name || '',
              role: 'FinSightAI Member',
              lastLogin: new Date().toLocaleDateString()
            };
          }
        }
      } catch (meErr) {
        console.warn('Profile sync fallback:', meErr);
      }

      return {
        success: true,
        requiresMfa: false,
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        user: userData
      };
    } catch (err) {
      return { success: false, error: 'Failed to connect to verification server.' };
    }
  },

  logout: async (token: string): Promise<void> => {
    try {
      await publicFetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refresh_token: token
        })
      });
      securityLogger.log('SESSION_TIMEOUT', `Clean logout initiated.`);
    } catch (err) {
      console.error('Failed to request server-side logout', err);
    }
  }
};
