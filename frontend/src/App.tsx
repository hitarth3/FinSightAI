import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BackgroundEffects } from './components/ui/BackgroundEffects';
import { ThemeToggle } from './components/ThemeToggle';
import { LoginPage } from './features/login/pages/LoginPage';
import { DashboardPage } from './DashboardPage';
import { ProtectedRoute } from './features/login/components/ProtectedRoute';
import { GuestRoute } from './features/login/components/GuestRoute';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { state, user } = useAuth();
  const rqQueryClient = useQueryClient();

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    try {
      const channel = supabase
        .channel('realtime-watchlist-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'stocks' },
          (payload) => {
            console.log('Watchlist real-time change:', payload);
            rqQueryClient.invalidateQueries({ queryKey: ['watchlist'] });
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    } catch (err) {
      console.warn('Realtime subscription skipped:', err);
    }
  }, [user, rqQueryClient]);

  // Session-restore check resolves synchronously against localStorage (see
  // AuthContext.tsx) — this state is transient for a single render, not a
  // gate for a splash screen.
  if (state === 'initializing') {
    return null;
  }

  return (
    <div className="relative w-full min-h-screen text-[var(--text-primary)] select-none">
      {/* Dynamic particles and gridlines globally behind everything */}
      <BackgroundEffects />

      {/* Floating Theme Switcher */}
      <ThemeToggle />

      {/* Route protection coordinate */}
      <ProtectedRoute fallback={
        <GuestRoute fallback={<DashboardPage />}>
          <LoginPage />
        </GuestRoute>
      }>
        <DashboardPage />
      </ProtectedRoute>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;


