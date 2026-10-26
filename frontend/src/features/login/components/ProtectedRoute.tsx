import React from 'react';
import { useAuth } from '../../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, fallback }) => {
  const { isAuthenticated, isMfaRequired } = useAuth();

  // If authenticated and MFA is cleared, show protected dashboard
  if (isAuthenticated && !isMfaRequired) {
    return <>{children}</>;
  }

  // Fallback to login card/page
  return <>{fallback}</>;
};
