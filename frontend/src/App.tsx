import { lazy, Suspense, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeToggle } from './components/ThemeToggle';
import { LoginPage } from './features/login/pages/LoginPage';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ApiError } from './services/apiClient';

const DashboardPage = lazy(() => import('./DashboardPage').then(module => ({ default: module.DashboardPage })));
const queryClient = new QueryClient({ defaultOptions: { queries: {
  refetchOnWindowFocus: false,
  staleTime: 30_000,
  retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1,
} } });

function AppContent() {
  const { state, isAuthenticated } = useAuth();
  const [demo, setDemo] = useState(false);
  if (state === 'initializing') return <div className="app-loading" role="status">Opening your workspace…</div>;
  return <Suspense fallback={<div className="app-loading" role="status">Loading your workspace…</div>}>
    {isAuthenticated || demo ? <DashboardPage key={demo ? 'demo' : 'account'} demo={demo} onExitDemo={() => setDemo(false)} /> : <><ThemeToggle /><LoginPage onExploreDemo={() => setDemo(true)} /></>}
  </Suspense>;
}

export default function App() {
  return <ErrorBoundary><QueryClientProvider client={queryClient}><MotionConfig reducedMotion="user"><ThemeProvider><ToastProvider><AuthProvider><AppContent /></AuthProvider></ToastProvider></ThemeProvider></MotionConfig></QueryClientProvider></ErrorBoundary>;
}
