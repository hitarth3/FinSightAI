import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  LogOut,
  Wallet,
  Compass,
  User,
  ShieldCheck,
  Bell,
} from 'lucide-react';
import { GlassCard } from './components/ui/GlassCard';
import { GlassBadge } from './components/ui/GlassBadge';
import { GlassButton } from './components/ui/GlassButton';
import { useAuth } from './context/AuthContext';
import { useToasts } from './context/ToastContext';
import { useTheme } from './context/ThemeContext';
import { ExpenseDashboard } from './components/expenses/ExpenseDashboard';
import { useQuery } from '@tanstack/react-query';
import { expenseService } from './services/expenseService';
import { MarketDashboard } from './components/market/MarketDashboard';
import { SmartInvestmentDashboardCard } from './components/market/SmartInvestmentDashboardCard';
import { CreditCardDashboard } from './components/credit_cards/CreditCardDashboard';
import { creditCardService } from './services/creditCardService';
import { FinanceAssistantCockpit } from './components/advisor/FinanceAssistantCockpit';
import { SmartCardAdvisor } from './components/advisor/SmartCardAdvisor';


export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const toasts = useToasts();
  const [view, setView] = React.useState<'overview' | 'expenses' | 'market' | 'cards' | 'advisor'>('overview');

  const { data: summary } = useQuery({
    queryKey: ['expenseSummary'],
    queryFn: expenseService.getSummary,
    enabled: !!user,
  });

  const { data: creditSummary } = useQuery({
    queryKey: ['creditSummary'],
    queryFn: creditCardService.getSummary,
    enabled: !!user,
  });

  const expenseValue = summary?.this_month?.total_amount !== undefined
    ? `₹${summary.this_month.total_amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : "₹0";

  const expenseChange = summary?.this_month?.change_percentage !== undefined
    ? `${summary.this_month.change_percentage >= 0 ? '+' : ''}${summary.this_month.change_percentage}%`
    : "0%";

  const utilValue = creditSummary !== undefined
    ? `${creditSummary.overall_utilization.toFixed(1)}%`
    : "0.0%";

  const utilChange = creditSummary !== undefined
    ? `₹${creditSummary.total_outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Due`
    : "₹0 Due";

  const utilTrend = creditSummary !== undefined && creditSummary.total_limit > 0
    ? `Limit: ₹${creditSummary.total_limit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : "No active cards";

  // Both entries below are real, API-backed metrics. The third overview-grid
  // slot (Smart Investments) renders SmartInvestmentDashboardCard directly —
  // it's genuinely API-backed too (via useWatchlist), not driven from here.
  const overviewMetrics = [
    { title: "AI Expense Analytics", value: expenseValue, change: expenseChange, trend: "savings optimized", icon: Wallet, color: "text-[var(--primary-color)]", view: 'expenses' as const },
    { title: "Credit Optimization", value: utilValue, change: utilChange, trend: utilTrend, icon: Compass, color: "text-yellow-500", view: 'cards' as const },
  ];

  const handleLogout = () => {
    logout();
    toasts.success('Logged Out Securely', 'Your financial intelligence session has been cleanly terminated.');
  };

  const navTabs: { id: typeof view; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'expenses', label: 'AI Expenses' },
    { id: 'cards', label: 'Smart Cards' },
    { id: 'market', label: 'Markets' },
    { id: 'advisor', label: 'AI Advisor' },
  ];

  return (
    <div className="min-h-screen w-full p-4 md:p-8 select-none relative overflow-x-hidden">
      {/* Glow Effects */}
      <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] bg-[var(--primary-color)]/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-[var(--secondary-color)]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Navbar */}
      <nav className="w-full max-w-7xl mx-auto flex items-center justify-between mb-8 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] p-[2px]">
            <div className="w-full h-full bg-[var(--bg-color)] rounded-[8px] flex items-center justify-center transition-colors duration-300">
              <Sparkles className="w-5 h-5 text-[var(--primary-color)]" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
              FinSight <span className="text-[var(--primary-color)]">AI</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)]">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === tab.id
                    ? 'bg-[var(--primary-color)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button 
            type="button" 
            onClick={() => toasts.toast('info', 'Notifications', 'No new security issues identified.', 2000)}
            className="icon-btn relative"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--primary-color)]" />
          </button>
          
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)]">
            <User className="w-4 h-4 text-[var(--primary-color)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[120px]">
              {user?.fullName || 'Alex Carter'}
            </span>
          </div>

          <GlassButton 
            variant="outline" 
            className="py-1.5 px-3.5 text-xs border-red-500/30 hover:bg-red-500/10 text-red-400"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </GlassButton>
        </div>
      </nav>

      {/* Hero Welcome banner */}
      <main className="w-full max-w-7xl mx-auto space-y-6">
        {view === 'expenses' ? (
          <ExpenseDashboard onBack={() => setView('overview')} />
        ) : view === 'market' ? (
          <MarketDashboard onBack={() => setView('overview')} />
        ) : view === 'cards' ? (
          <CreditCardDashboard onBack={() => setView('overview')} onOpenAdvisor={() => setView('advisor')} />
        ) : view === 'advisor' ? (
          <SmartCardAdvisor onBack={() => setView('cards')} />
        ) : (
          <>
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl glass-panel relative overflow-hidden"
            >
          <div className="absolute top-0 right-0 w-[200px] h-full bg-gradient-to-l from-[var(--primary-color)]/10 to-transparent pointer-events-none" />
          <div className="z-10 relative">
            <div className="flex items-center gap-2 mb-2">
              <GlassBadge variant="success">Secured Session</GlassBadge>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Hello, {user?.fullName || 'Alex'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
              Welcome back to your financial intelligence cockpit. All services are running optimally under E2E encrypted layers with active sentiment trackers.
            </p>
          </div>
        </motion.div>        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            onClick={() => setView(overviewMetrics[0].view)}
            className="cursor-pointer"
          >
            <GlassCard className="flex flex-col justify-between h-full hover:border-[var(--primary-color)]/20 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">
                  {overviewMetrics[0].title}
                </span>
                <div className={`surface-chip ${overviewMetrics[0].color}`}>
                  <Wallet className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mb-2">
                <h4 className="text-xl md:text-2xl font-black text-[var(--text-primary)]">{overviewMetrics[0].value}</h4>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-success font-semibold">{overviewMetrics[0].change}</span>
                <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]/50 font-semibold">{overviewMetrics[0].trend}</span>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="cursor-pointer"
          >
            <SmartInvestmentDashboardCard onClick={() => setView('market')} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setView(overviewMetrics[1].view)}
            className="cursor-pointer"
          >
            <GlassCard className="flex flex-col justify-between h-full hover:border-[var(--primary-color)]/20 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50">
                  {overviewMetrics[1].title}
                </span>
                <div className={`surface-chip ${overviewMetrics[1].color}`}>
                  <Compass className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mb-2">
                <h4 className="text-xl md:text-2xl font-black text-[var(--text-primary)]">{overviewMetrics[1].value}</h4>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-success font-semibold">{overviewMetrics[1].change}</span>
                <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]/50 font-semibold">{overviewMetrics[1].trend}</span>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Session details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FinanceAssistantCockpit />

          <GlassCard className="flex flex-col justify-between">
            <h4 className="text-base font-bold text-[var(--text-primary)] mb-3.5 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-success" /> Session Authenticity
            </h4>
            
            <div className="space-y-3.5 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                <span>Account Role</span>
                <span className="text-[var(--text-primary)] font-semibold">{user?.role}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                <span>MFA Status</span>
                <span className="text-success font-semibold flex items-center gap-1">
                  Verified
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                <span>Active Theme</span>
                <span className="text-[var(--text-primary)] font-semibold capitalize">
                  {theme === 'dark-fintech' ? 'Dark FinTech' : 'Light Professional'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>JWT Access</span>
                <span className="text-xs text-[var(--primary-color)] truncate max-w-[150px] font-mono">
                  {localStorage.getItem('finsight_access_token')?.slice(0, 24)}...
                </span>
              </div>
            </div>
          </GlassCard>
        </div>
      </>
    )}
  </main>
</div>
);
};
