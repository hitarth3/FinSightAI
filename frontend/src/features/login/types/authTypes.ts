export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  lastLogin: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  requiresMfa?: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: UserProfile;
  error?: string;
  message?: string;
}

export interface OtpVerificationRequest {
  email: string;
  otp: string;
  userId?: string;
}

export interface SessionInfo {
  token: string;
  user: UserProfile;
  expiresAt: number; // timestamp
}

export type AuthState = 
  | 'initializing'
  | 'idle'
  | 'validatingOtp'
  | 'validating'
  | 'login_success'
  | 'mfa'
  | 'verified'
  | 'locked'
  | 'session_timeout';
