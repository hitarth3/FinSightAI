import React from 'react';
import CategoryPieChart from './CategoryPieChart';
import ExpenseTrendChart from './ExpenseTrendChart';

export const ExpenseAnalytics: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CategoryPieChart />
      <ExpenseTrendChart />
    </div>
  );
};
export default ExpenseAnalytics;
