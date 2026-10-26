import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenseService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { GlassCard } from '../ui/GlassCard';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ErrorState } from '../ui/ErrorState';

export const CategoryPieChart: React.FC = () => {
  const { data: breakdown, isLoading, error } = useQuery({
    queryKey: ['categoryBreakdown'],
    queryFn: expenseService.getCategoryBreakdown,
  });

  if (isLoading) {
    return <LoadingSkeleton shape="rows" rows={3} className="h-64 flex flex-col justify-center" />;
  }

  if (error || !breakdown) {
    return <ErrorState title="Category Distribution" message="Failed to load category breakdown." />;
  }

  const chartData = Object.entries(breakdown as Record<string, number>).map(([key, val]) => ({
    name: key.replace('_', ' '),
    value: val,
  })).filter(item => item.value > 0);


  const COLORS = [
    '#3b82f6', 
    '#10b981', 
    '#ec4899', 
    '#f59e0b', 
    '#8b5cf6', 
    '#06b6d4', 
    '#f43f5e', 
    '#14b8a6', 
    '#84cc16', 
    '#a855f7', 
    '#64748b'  
  ];

  return (
    <GlassCard className="flex flex-col h-full justify-between" glow>
      <div>
        <h4 className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]/60 mb-4 pb-2 border-b border-[var(--border-color)]">
          Category Distribution
        </h4>
        
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-[var(--text-secondary)]/40">
            No transaction records found.
          </div>
        ) : (
          <div className="h-48 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--chart-tooltip-bg)', 
                    borderColor: 'var(--chart-tooltip-border)',
                    borderRadius: '12px',
                    color: 'var(--chart-tooltip-text)',
                    fontSize: '11px'
                  }} 
                  formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Total Spent']}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', color: 'var(--text-secondary)', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
export default CategoryPieChart;
