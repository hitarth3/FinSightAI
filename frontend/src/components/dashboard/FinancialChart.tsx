import React, { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface DataPoint {
  time: string;
  value: number;
  aiValue: number;
}

export const FinancialChart: React.FC = () => {
  const chartData = useMemo<DataPoint[]>(() => {
    return [
      { time: '09:30', value: 3120, aiValue: 3120 },
      { time: '10:30', value: 3150, aiValue: 3180 },
      { time: '11:30', value: 3110, aiValue: 3240 },
      { time: '12:30', value: 3190, aiValue: 3310 },
      { time: '13:30', value: 3240, aiValue: 3420 },
      { time: '14:30', value: 3210, aiValue: 3510 },
      { time: '15:30', value: 3280, aiValue: 3640 },
    ];
  }, []);

  return (
    <div className="w-full h-full min-h-[160px] relative select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#00D4FF" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            stroke="var(--chart-axis)"
            tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="var(--chart-axis)"
            tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={['dataMin - 100', 'dataMax + 100']}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--chart-tooltip-bg)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--chart-tooltip-border)',
              borderRadius: '8px',
              fontSize: '11px',
              color: 'var(--chart-tooltip-text)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            }}
            itemStyle={{ color: 'var(--primary-color)' }}
            labelStyle={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}
          />
          
          {/* Baseline standard stock value */}
          <Area
            type="monotone"
            dataKey="value"
            stroke="#94A3B8"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fillOpacity={1}
            fill="url(#colorValue)"
            name="Index Avg"
            animationDuration={1500}
          />

          {/* Glowing AI enhanced recommendation value */}
          <Area
            type="monotone"
            dataKey="aiValue"
            stroke="url(#aiGradient)"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorAi)"
            name="FinSight Alpha"
            animationDuration={2000}
          />
          
          <defs>
            <linearGradient id="aiGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00D4FF" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
