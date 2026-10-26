/** Fixed, fictional data. Never sent to the API or mixed with a signed-in account. */
export const demoSummary = {
  this_month: { total_amount: 32450, total_income: 85000, net_cashflow: 52550, savings_rate: 61.8, expense_count: 24, change_percentage: -12.4, total_investments: 15000 },
};
export const demoCredit = { total_limit: 200000, total_outstanding: 18640, available_credit: 181360, overall_utilization: 9.32, expected_rewards: 0 };
export const demoTrend = [
  { month: 'May', income: 75000, expenses: 38000 }, { month: 'Jun', income: 75000, expenses: 42000 },
  { month: 'Jul', income: 82000, expenses: 35600 }, { month: 'Aug', income: 82000, expenses: 41200 },
  { month: 'Sep', income: 85000, expenses: 37050 }, { month: 'Oct', income: 85000, expenses: 32450 },
];
export const demoCategories = { RENT: 15000, SHOPPING: 6250, FOOD: 4800, TRAVEL: 3600, UTILITIES: 2800 };
export const demoExpenses = [
  { id: 'sample-1', merchant: 'Blue Tokai Coffee', category: 'FOOD', amount: 480, expense_date: '2026-10-24', payment_method: 'UPI', nature: 'EXPENSE' },
  { id: 'sample-2', merchant: 'October salary', category: 'SALARY', amount: 85000, expense_date: '2026-10-23', payment_method: 'BANK_TRANSFER', nature: 'INCOME' },
  { id: 'sample-3', merchant: 'Amazon', category: 'SHOPPING', amount: 2499, expense_date: '2026-10-22', payment_method: 'CREDIT_CARD', nature: 'EXPENSE' },
  { id: 'sample-4', merchant: 'Uber', category: 'TRAVEL', amount: 340, expense_date: '2026-10-21', payment_method: 'UPI', nature: 'EXPENSE' },
  { id: 'sample-5', merchant: 'Apartment rent', category: 'RENT', amount: 15000, expense_date: '2026-10-01', payment_method: 'BANK_TRANSFER', nature: 'EXPENSE' },
];
