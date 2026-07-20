const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getHeaders() {
  const token = localStorage.getItem('finsight_access_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export interface CreditCardCatalog {
  id: string;
  bank_name: string;
  card_name: string;
  card_type?: string;
  joining_fee?: number;
  annual_fee?: number;
  reward_type?: string;
  reward_rules_json?: any;
  lounge_access?: string;
  fuel_benefits?: string;
  reward_conversion?: string;
  official_url?: string;
  created_at: string;
}

export interface UserCreditCard {
  id: string;
  user_id: string;
  catalog_id: string;
  credit_limit: number;
  outstanding: number;
  billing_date: number;
  due_date: string;
  nickname?: string;
  created_at: string;
  catalog?: CreditCardCatalog;
}

export interface CreditCardSummary {
  total_limit: number;
  total_outstanding: number;
  available_credit: number;
  overall_utilization: number;
  expected_rewards: number;
}

export interface CreditCardInsight {
  type: string;
  message: string;
  card_id?: string;
}

export const creditCardService = {
  getCards: async (): Promise<UserCreditCard[]> => {
    const res = await fetch(`${API_BASE}/api/credit-cards`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch credit cards');
    const json = await res.json();
    return json.data;
  },

  createCard: async (data: {
    catalog_id: string;
    credit_limit: number;
    outstanding: number;
    billing_date: number;
    due_date: string;
    nickname?: string;
  }): Promise<UserCreditCard> => {
    const res = await fetch(`${API_BASE}/api/credit-cards`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorMsg = await res.json().then(j => j.detail || j.message).catch(() => 'Failed to add card');
      throw new Error(errorMsg);
    }
    const json = await res.json();
    return json.data;
  },

  updateCard: async (id: string, data: {
    credit_limit?: number;
    outstanding?: number;
    billing_date?: number;
    due_date?: string;
    nickname?: string;
  }): Promise<UserCreditCard> => {
    const res = await fetch(`${API_BASE}/api/credit-cards/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorMsg = await res.json().then(j => j.detail || j.message).catch(() => 'Failed to update card');
      throw new Error(errorMsg);
    }
    const json = await res.json();
    return json.data;
  },

  deleteCard: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/api/credit-cards/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete credit card');
  },

  getCatalog: async (): Promise<CreditCardCatalog[]> => {
    const res = await fetch(`${API_BASE}/api/credit-card-catalog`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch card catalog');
    const json = await res.json();
    return json.data;
  },

  getSummary: async (): Promise<CreditCardSummary> => {
    const res = await fetch(`${API_BASE}/api/credit-card-summary`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch credit card summary');
    const json = await res.json();
    return json.data;
  },

  getInsights: async (): Promise<CreditCardInsight[]> => {
    const res = await fetch(`${API_BASE}/api/credit-card-insights`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch credit card insights');
    const json = await res.json();
    return json.data;
  },
};
