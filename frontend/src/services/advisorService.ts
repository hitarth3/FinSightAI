const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getHeaders() {
  const token = localStorage.getItem('finsight_access_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export interface CardRankingItem {
  card_id: string;
  bank_name: string;
  card_name: string;
  nickname?: string;
  expected_rewards: number;
  reward_rate: number;
  available_limit: number;
  additional_savings: number;
  confidence_score: number;
  monthly_cap_remaining: number | null;
  utilization_pct: number;
  days_to_due_date: number;
}

export interface BestCardResponse {
  category: string;
  amount: number;
  best_card: CardRankingItem | null;
  alternative_card: CardRankingItem | null;
  fallback_card: CardRankingItem | null;
  rankings: CardRankingItem[];
  confidence_score: number;
  explanation: string;
}

export interface RewardAnalytics {
  monthly_cashback: number;
  annual_cashback: number;
  reward_points_earned: number;
  missed_rewards: number;
  best_performing_card: string;
  worst_performing_card: string;
  cap_usage_summary: Array<{ card_id: string; reward_earned: number; cap_used: number }>;
  annual_forecast: number;
}

export interface RewardSummary {
  month: string;
  cards_used: string;
  rewards_earned: number;
  rewards_missed: number;
  top_categories: string;
  top_merchants: string;
  annual_forecast: number;
}

export interface RecommendedCardItem {
  catalog_id: string;
  bank_name: string;
  card_name: string;
  annual_fee: number;
  estimated_annual_rewards: number;
  net_benefit: number;
  reward_type: string;
  official_url?: string;
}

export interface CardRecommendationResponse {
  recommended_card: RecommendedCardItem | null;
  reasoning: string;
  all_catalog_options: RecommendedCardItem[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MerchantLookupResponse {
  merchant: string;
  category: string;
  channel_type: string;
  found_in_db: boolean;
  ai_classified: boolean;
}

export const advisorService = {
  getBestCard: async (data: {
    merchant?: string;
    category?: string;
    amount: number;
  }): Promise<BestCardResponse> => {
    const res = await fetch(`${API_BASE}/api/advisor/best-card`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to identify best card');
    const json = await res.json();
    return json.data;
  },

  getRewardAnalytics: async (): Promise<RewardAnalytics> => {
    const res = await fetch(`${API_BASE}/api/advisor/reward-analytics`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch reward analytics');
    const json = await res.json();
    return json.data;
  },

  getRewardSummary: async (): Promise<RewardSummary[]> => {
    const res = await fetch(`${API_BASE}/api/advisor/reward-summary`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch reward summaries');
    const json = await res.json();
    return json.data;
  },

  recommendCard: async (): Promise<CardRecommendationResponse> => {
    const res = await fetch(`${API_BASE}/api/advisor/recommend-card`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch credit card recommendations');
    const json = await res.json();
    return json.data;
  },

  chatAdvisor: async (message: string, history: ChatMessage[]): Promise<string> => {
    const res = await fetch(`${API_BASE}/api/advisor/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) throw new Error('Failed to communicate with chat advisor');
    const json = await res.json();
    return json.data.reply;
  },

  merchantLookup: async (merchant: string): Promise<MerchantLookupResponse> => {
    const res = await fetch(`${API_BASE}/api/advisor/merchant-lookup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ merchant }),
    });
    if (!res.ok) throw new Error('Failed to resolve merchant');
    const json = await res.json();
    return json.data;
  },

  reseedCatalog: async (): Promise<number> => {
    const res = await fetch(`${API_BASE}/api/credit-card-catalog/reseed`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to reseed catalog');
    const json = await res.json();
    return json.data.cards_seeded;
  },
};
