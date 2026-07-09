import React from 'react';
import { useAuth } from '../../../context/AuthContext';

interface GuestRouteProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export const GuestRoute: React.FC<GuestRouteProps> = ({ children, fallback }) => {
  const { isAuthenticated, isMfaRequired } = useAuth();

  // If authenticated and MFA is cleared, redirect to verified dashboard page
  if (isAuthenticated && !isMfaRequired) {
    return <>{fallback}</>;
  }

  // Else, show guest elements (e.g. login cards)
  return <>{children}</>;
};
