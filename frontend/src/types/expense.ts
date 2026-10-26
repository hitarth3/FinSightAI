/** Amounts are positive; nature describes how each transaction affects finances. */
export interface Expense {
  id: string;
  merchant: string;
  amount: number;
  category: string;
  nature: string;
  payment_method: string;
  expense_date: string;
  source_type: string;
  ai_confidence: number;
  notes: string | null;
  receipt_url: string | null;
  thumbnail_url: string | null;
}
