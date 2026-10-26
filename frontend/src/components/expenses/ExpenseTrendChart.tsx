import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenseService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GlassCard } from '../ui/GlassCard';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ErrorState } from '../ui/ErrorState';

export const ExpenseTrendChart: React.FC = () => {
  const { data: trend, isLoading, error } = useQuery({
    queryKey: ['monthlyTrend'],
    queryFn: expenseService.getMonthlyTrend,
  });

  if (isLoading) {
    return <LoadingSkeleton shape="rows" rows={3} className="h-64 flex flex-col justify-center" />;
  }

  if (error || !trend) {
    return <ErrorState title="Cash Flow Trend" message="Failed to load monthly trend." />;
  }

  return (
    <GlassCard className="flex flex-col h-full justify-between" glow>
      <div>
        <h4 className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]/60 mb-4 pb-2 border-b border-[var(--border-color)]">
          Cash Flow Trend (Last 12 Months)
        </h4>

        {trend.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-[var(--text-secondary)]/40">
            No historical records found.
          </div>
        ) : (
          <div className="h-56 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  {/* Income Gradient - Emerald/Green */}
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                  {/* Expenses Gradient - Red */}
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                  {/* Investments Gradient - Yellow */}
                  <linearGradient id="colorInvestments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EAB308" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="var(--chart-axis)" 
                  tick={{ fill: 'var(--chart-axis)', fontSize: 9 }}
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="var(--chart-axis)" 
                  tick={{ fill: 'var(--chart-axis)', fontSize: 9 }}
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--chart-tooltip-bg)', 
                    borderColor: 'var(--chart-tooltip-border)',
                    borderRadius: '12px',
                    color: 'var(--chart-tooltip-text)',
                    fontSize: '11px',
                    backdropFilter: 'blur(8px)',
                  }} 
                  formatter={(value: any) => [`₹${value.toLocaleString()}`]}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle" 
                  iconSize={8}
                  wrapperStyle={{ fontSize: '9px', paddingBottom: '10px', color: 'var(--text-secondary)' }}
                />
                {/* 1. Income Line/Area */}
                <Area 
                  type="monotone" 
                  name="Income"
                  dataKey="income" 
                  stroke="#22C55E" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                />
                {/* 2. Expenses Line/Area */}
                <Area 
                  type="monotone" 
                  name="Expenses"
                  dataKey="expenses" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorExpenses)" 
                />
                {/* 3. Investments Line/Area */}
                <Area 
                  type="monotone" 
                  name="Investments"
                  dataKey="investments" 
                  stroke="#EAB308" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorInvestments)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
export default ExpenseTrendChart;
