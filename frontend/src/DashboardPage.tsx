import { lazy, Suspense, useState } from 'react';
import { LayoutDashboard, Receipt, CreditCard, ChartNoAxesCombined, Sparkles, LogOut, ArrowUpRight, Menu, X, Plus, CalendarDays } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { ThemeToggle } from './components/ThemeToggle';
import { Overview, type DashboardView } from './components/dashboard/Overview';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const ExpenseDashboard = lazy(() => import('./components/expenses/ExpenseDashboard').then(m => ({ default: m.ExpenseDashboard })));
const CreditCardDashboard = lazy(() => import('./components/credit_cards/CreditCardDashboard').then(m => ({ default: m.CreditCardDashboard })));
const MarketDashboard = lazy(() => import('./components/market/MarketDashboard').then(m => ({ default: m.MarketDashboard })));
const SmartCardAdvisor = lazy(() => import('./components/advisor/SmartCardAdvisor').then(m => ({ default: m.SmartCardAdvisor })));
const FinanceAssistant = lazy(() => import('./components/advisor/FinanceAssistantCockpit').then(m => ({ default: m.FinanceAssistantCockpit })));

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'cards', label: 'Credit cards', icon: CreditCard },
  { id: 'market', label: 'Markets', icon: ChartNoAxesCombined },
  { id: 'advisor', label: 'AI assistant', icon: Sparkles },
] as const;

export const DashboardPage = ({ demo = false, onExitDemo }: { demo?: boolean; onExitDemo?: () => void }) => {
  const { user, logout } = useAuth();
  const [view, setView] = useState<DashboardView>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = (next: DashboardView) => { setView(next); setMobileOpen(false); window.scrollTo({ top: 0 }); };
  const name = demo ? 'Alex Morgan' : user?.fullName || user?.email?.split('@')[0] || 'there';
  const selected = navigation.find(item => item.id === view)!;
  const date = demo ? 'October 2026' : new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return <div className="dashboard-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <a href="#" className="brand-lockup" onClick={event => { event.preventDefault(); navigate('overview'); }}><span className="brand-symbol"><ChartNoAxesCombined size={22} /></span><span>finsight<span className="brand-ai">AI</span></span></a>
      <button className="mobile-sidebar-close icon-btn" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button>
      <div className="workspace-label"><span className="workspace-avatar">P</span><div>Personal workspace<small>{demo ? 'Sample account' : 'Your financial overview'}</small></div></div>
      <p className="sidebar-section-label">WORKSPACE</p>
      <nav aria-label="Main navigation">{navigation.filter(item => !demo || !['market', 'advisor'].includes(item.id)).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} aria-current={view === id ? 'page' : undefined} className={`nav-item ${view === id ? 'active' : ''}`}><Icon size={19} strokeWidth={1.7} /><span>{label}</span>{id === 'advisor' && <span className="nav-ai">AI</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Sparkles size={20} /><strong>Make sense of your money.</strong><p>One place for your expenses, cards, and financial insights.</p></div><button className="account-button" onClick={demo ? onExitDemo : logout}><span className="account-avatar">{name.slice(0, 1).toUpperCase()}</span><span><strong>{name}</strong><small>{demo ? 'Exit sample workspace' : 'Sign out'}</small></span><LogOut size={17} /></button></div>
    </aside>
    <div className="dashboard-body"><header className="app-topbar"><div className="breadcrumb"><button className="mobile-menu icon-btn" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={21} /></button><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{selected.label}</strong></div><div className="topbar-actions"><span className="workspace-status"><i /> {demo ? 'Sample workspace' : 'Personal account'}</span><ThemeToggle inline /><span className="topbar-avatar" aria-label={name}>{name.slice(0, 1).toUpperCase()}</span></div></header>
      <main id="main-content" className="dashboard-main">
        {demo && <div className="demo-banner"><span><strong>You’re exploring the demo.</strong> All figures are fictional. No account needed.</span><button onClick={onExitDemo}>Use my own data <ArrowUpRight size={15} /></button></div>}
        <div className="page-intro"><div><p className="eyebrow">YOUR MONEY, IN FOCUS</p><h1>{view === 'overview' ? `Welcome back, ${name.split(' ')[0]}` : selected.label}<span className="heading-dot">.</span></h1><p>{view === 'overview' ? 'A little clarity for your next financial decision.' : view === 'expenses' ? 'Every transaction tells part of your story.' : view === 'cards' ? 'Understand your balances, limits, and rewards.' : view === 'market' ? 'Follow the market. Keep your goals in sight.' : 'Explore your finances with a little assistance.'}</p></div><div className="intro-actions"><span className="date-pill"><CalendarDays size={15} />{date}</span>{view === 'overview' && <button className="primary-action" onClick={() => navigate('expenses')}><Plus size={17} />Manage expenses</button>}</div></div>
        <ErrorBoundary key={view}><Suspense fallback={<div className="data-message" role="status">Loading {selected.label.toLowerCase()}…</div>}>
          {demo || view === 'overview' ? <Overview demo={demo} view={view} onNavigate={navigate} /> : view === 'expenses' ? <ExpenseDashboard onBack={() => navigate('overview')} /> : view === 'cards' ? <CreditCardDashboard onBack={() => navigate('overview')} onOpenAdvisor={() => navigate('advisor')} /> : view === 'market' ? <MarketDashboard onBack={() => navigate('overview')} /> : <div className="space-y-6"><FinanceAssistant /><SmartCardAdvisor onBack={() => navigate('cards')} /></div>}
        </Suspense></ErrorBoundary>
        <footer className="dashboard-footer"><span>FinSight AI · A clearer view of your finances</span><span>{demo ? 'Illustrative data · October 2026' : 'Insights are informational, not financial advice.'}</span></footer>
      </main>
    </div>
  </div>;
};
