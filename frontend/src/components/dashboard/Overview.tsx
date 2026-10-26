import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Wallet, CreditCard, TrendingUp, Sparkles, Search, Receipt, RefreshCw } from 'lucide-react';
import { expenseService } from '../../services/expenseService';
import { creditCardService } from '../../services/creditCardService';
import { demoSummary, demoCredit, demoTrend, demoCategories, demoExpenses } from '../../demo/overview';

export type DashboardView = 'overview' | 'expenses' | 'cards' | 'market' | 'advisor';
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const humanize = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
const palette = ['#258577', '#91b8a7', '#e3b76c', '#829ab9', '#bec9c3'];

interface Transaction { id: string; merchant: string; category: string; amount: number; expense_date: string; payment_method: string; nature?: string }

function LoadError({ retry }: { retry: () => void }) {
  return <div className="data-message" role="alert"><p>We couldn’t load this information.</p><button className="text-action" onClick={retry}><RefreshCw size={14} /> Try again</button></div>;
}

export function Overview({ demo = false, view = 'overview', onNavigate }: { demo?: boolean; view?: DashboardView; onNavigate: (view: DashboardView) => void }) {
  const [search, setSearch] = useState('');
  const scope = demo ? 'demo' : 'account';
  const summary = useQuery({ queryKey: ['expenseSummary', scope], queryFn: demo ? async () => demoSummary : expenseService.getSummary });
  const credit = useQuery({ queryKey: ['creditSummary', scope], queryFn: demo ? async () => demoCredit : creditCardService.getSummary });
  const trend = useQuery<{ month: string; income: number; expenses: number }[]>({ queryKey: ['monthlyTrend', scope], queryFn: demo ? async () => demoTrend : expenseService.getMonthlyTrend });
  const categories = useQuery<Record<string, number>>({ queryKey: ['categoryBreakdown', scope], queryFn: demo ? async () => demoCategories : expenseService.getCategoryBreakdown });
  const transactions = useQuery<Transaction[]>({ queryKey: ['expenses', scope], queryFn: demo ? async () => demoExpenses : expenseService.getExpenses });
  const month = summary.data?.this_month;
  const breakdown = Object.entries(categories.data || {}).filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1]);
  const total = breakdown.reduce((sum, [, amount]) => sum + amount, 0);
  const recent = [...(transactions.data || [])].sort((a, b) => b.expense_date.localeCompare(a.expense_date)).filter(item => `${item.merchant} ${item.category}`.toLowerCase().includes(search.toLowerCase())).slice(0, view === 'expenses' ? 50 : 5);
  const showValue = (value: number | undefined, error: boolean) => error ? 'Unavailable' : value === undefined ? '—' : money(value);
  const metrics = [
    { label: 'Income this month', value: showValue(month?.total_income, summary.isError), note: 'From recorded transactions', icon: ArrowDownLeft, style: 'mint' },
    { label: 'Monthly spending', value: showValue(month?.total_amount, summary.isError), note: month?.change_percentage != null ? `${Math.abs(month.change_percentage).toFixed(1)}% ${month.change_percentage <= 0 ? 'less' : 'more'} than last month` : 'Your recorded expenses', icon: ArrowUpRight, style: 'sand' },
    { label: 'Net cash flow', value: showValue(month?.net_cashflow, summary.isError), note: 'Income minus expenses', icon: Wallet, style: 'blue' },
    { label: 'Credit outstanding', value: showValue(credit.data?.total_outstanding, credit.isError), note: credit.data ? `${credit.data.overall_utilization.toFixed(1)}% of your total limit` : 'Across your added cards', icon: CreditCard, style: 'lilac' },
  ];
  return <div className="overview-stack">
    {view === 'overview' && <>
      <div className="metric-grid" aria-busy={summary.isPending}>
        {metrics.map(({ label, value, note, icon: Icon, style }) => <article className="metric-card" key={label}><div className="metric-top"><span>{label}</span><span className={`metric-icon ${style}`}><Icon size={18} /></span></div><strong>{value}</strong><p>{note}</p></article>)}
      </div>
      {(summary.isError || credit.isError) && <LoadError retry={() => { void summary.refetch(); void credit.refetch(); }} />}
      <div className="overview-charts">
        <section className="finance-panel cashflow-panel">
          <div className="panel-heading"><div><h2>Cash flow</h2><p>Your income and spending, side by side</p></div><span className="subtle-tag">{demo ? 'May – Oct 2026' : 'Last 12 months'}</span></div>
          <div className="chart-legend"><span><i style={{ background: '#258577' }} /> Income</span><span><i style={{ background: '#dcb679' }} /> Expenses</span></div>
          {trend.isError ? <LoadError retry={() => void trend.refetch()} /> : trend.isPending ? <div className="chart-placeholder" role="status">Loading cash flow…</div> : !trend.data?.some(item => item.income || item.expenses) ? <div className="chart-placeholder"><TrendingUp size={28} /><p>Add transactions to see your cash flow over time.</p></div> : <div className="overview-chart" role="img" aria-label="Monthly income and expense trend in Indian rupees">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend.data} margin={{ top: 12, right: 10, left: -12, bottom: 0 }}>
              <defs><linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#258577" stopOpacity={0.16} /><stop offset="100%" stopColor="#258577" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--border-color)" strokeDasharray="4 5" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} dy={12} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => money(value)} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-primary)' }} />
              <Area type="monotone" name="Income" dataKey="income" stroke="#258577" strokeWidth={2.5} fill="url(#income-fill)" isAnimationActive={false} />
              <Area type="monotone" name="Expenses" dataKey="expenses" stroke="#dcb679" strokeWidth={2.5} fill="transparent" isAnimationActive={false} />
            </AreaChart></ResponsiveContainer>
          </div>}
        </section>
        <section className="finance-panel spending-panel"><div className="panel-heading"><div><h2>Spending breakdown</h2><p>Where your money goes · all records</p></div></div>
          {categories.isError ? <LoadError retry={() => void categories.refetch()} /> : categories.isPending ? <div className="chart-placeholder" role="status">Loading categories…</div> : !total ? <div className="chart-placeholder"><Receipt size={28} /><p>Your spending categories will appear here.</p></div> : <><div className="spending-total"><strong>{money(total)}</strong><span>total expenses</span></div><div className="spending-bar" aria-hidden="true">{breakdown.map(([name, amount], i) => <span key={name} style={{ width: `${amount / total * 100}%`, background: palette[i % palette.length] }} />)}</div><div className="category-list">{breakdown.slice(0, 5).map(([name, amount], i) => <div key={name}><span><i style={{ background: palette[i % palette.length] }} />{humanize(name)}</span><strong>{money(amount)}</strong><small>{Math.round(amount / total * 100)}%</small></div>)}</div></>}
        </section>
      </div>
    </>}
    {view === 'cards' ? <section className="finance-panel"><div className="panel-heading"><div><h2>Your credit at a glance</h2><p>Fictional card balances for this sample workspace</p></div><CreditCard size={24} /></div><div className="metric-grid">{[['Total limit', demoCredit.total_limit], ['Outstanding', demoCredit.total_outstanding], ['Available credit', demoCredit.available_credit]].map(([label, amount]) => <article className="metric-card" key={label}><p>{label}</p><strong>{money(Number(amount))}</strong></article>)}</div><p className="demo-explanation">Sign in to add your own cards, track due dates, and compare reward rules. This preview does not make changes to an account.</p></section> : <div className={view === 'overview' ? 'overview-bottom' : ''}>
      <section className="finance-panel transactions-panel">
        <div className="panel-heading"><div><h2>{view === 'expenses' ? 'Sample transactions' : 'Recent transactions'}</h2><p>{demo ? 'A selection of fictional transactions' : 'Your latest financial activity'}</p></div>{view === 'overview' && <button className="text-action" onClick={() => onNavigate('expenses')}>View all <ArrowRight size={15} /></button>}</div>
        {view === 'expenses' && <label className="transaction-search"><Search size={16} /><input aria-label="Search transactions" placeholder="Search merchant or category" value={search} onChange={event => setSearch(event.target.value)} /></label>}
        {transactions.isError ? <LoadError retry={() => void transactions.refetch()} /> : transactions.isPending ? <div className="data-message" role="status">Loading transactions…</div> : !recent.length ? <div className="data-message"><Receipt size={28} /><p>{search ? 'No transactions match your search.' : 'Your first transaction is the start of a clearer picture.'}</p>{!search && <button className="text-action" onClick={() => onNavigate('expenses')}>Add an expense <ArrowRight size={15} /></button>}</div> : <div className="transaction-scroll"><table className="overview-table"><thead><tr><th>Transaction</th><th>Date</th><th>Amount</th></tr></thead><tbody>{recent.map(item => <tr key={item.id}><td><div className="transaction-name"><span className={`transaction-icon ${item.nature === 'INCOME' ? 'mint' : 'neutral'}`}>{item.nature === 'INCOME' ? <ArrowDownLeft size={17} /> : <Receipt size={17} />}</span><div><strong>{item.merchant}</strong><small>{humanize(item.category)}</small></div></div></td><td>{new Date(`${item.expense_date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td><td className={item.nature === 'INCOME' ? 'positive' : ''}>{item.nature === 'INCOME' ? '+' : '−'}{money(item.amount)}</td></tr>)}</tbody></table></div>}
      </section>
      {view === 'overview' && <aside className="insight-panel"><span className="insight-eyebrow"><Sparkles size={16} /> A LITTLE MORE CLARITY</span><h2>Small habits.<br />A bigger picture.</h2><p>{month?.total_income > 0 ? `You’ve recorded ${money(month.total_income)} in income this month. Review your spending to understand what’s left over.` : 'Track daily expenses, review your categories, and build a clearer view of your finances.'}</p><button onClick={() => onNavigate('expenses')}>Explore your expenses <ArrowUpRight size={17} /></button><div className="insight-footnote">Based on recorded transactions</div></aside>}
    </div>}
  </div>;
}
