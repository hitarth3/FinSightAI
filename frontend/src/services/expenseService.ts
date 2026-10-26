import { API_BASE, apiFetch } from './apiClient';

function getHeaders() {
  const token = localStorage.getItem('finsight_access_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export const expenseService = {
  getExpenses: async () => {
    const res = await apiFetch(`${API_BASE}/api/expenses`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch expenses');
    const json = await res.json();
    return json.data;
  },

  createManualExpense: async (data: any) => {
    const res = await apiFetch(`${API_BASE}/api/expenses/manual`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create manual expense');
    const json = await res.json();
    return json.data;
  },

  uploadReceipt: async (file: File) => {
    const token = localStorage.getItem('finsight_access_token');
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiFetch(`${API_BASE}/api/expenses/upload`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });
    if (!res.ok) {
      const errorMsg = await res.json().then(j => j.detail || j.message).catch(() => 'Failed to parse receipt');
      throw new Error(errorMsg);
    }
    const json = await res.json();
    return json.data;
  },

  confirmReceipt: async (data: any) => {
    const res = await apiFetch(`${API_BASE}/api/expenses/confirm`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to confirm and save expense');
    const json = await res.json();
    return json.data;
  },

  updateExpense: async (id: string, data: any) => {
    const res = await apiFetch(`${API_BASE}/api/expenses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update expense');
    const json = await res.json();
    return json.data;
  },

  deleteExpense: async (id: string) => {
    const res = await apiFetch(`${API_BASE}/api/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete expense');
    const json = await res.json();
    return json.data;
  },

  getSummary: async () => {
    const res = await apiFetch(`${API_BASE}/api/expenses/analytics/summary`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch summary');
    const json = await res.json();
    return json.data;
  },

  getCategoryBreakdown: async () => {
    const res = await apiFetch(`${API_BASE}/api/expenses/analytics/category-breakdown`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch category breakdown');
    const json = await res.json();
    return json.data;
  },

  getMonthlyTrend: async () => {
    const res = await apiFetch(`${API_BASE}/api/expenses/analytics/monthly-trend`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch monthly trend');
    const json = await res.json();
    return json.data;
  },

  getTopMerchants: async () => {
    const res = await apiFetch(`${API_BASE}/api/expenses/analytics/top-merchants`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch top merchants');
    const json = await res.json();
    return json.data;
  },

  getInsights: async () => {
    const res = await apiFetch(`${API_BASE}/api/expenses/analytics/insights`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch insights');
    const json = await res.json();
    return json.data;
  },

  uploadStatement: async (file: File) => {
    const token = localStorage.getItem('finsight_access_token');
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiFetch(`${API_BASE}/api/expenses/statement/upload`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });
    if (!res.ok) {
      const errorMsg = await res.json().then(j => j.detail || j.message).catch(() => 'Failed to upload statement');
      throw new Error(errorMsg);
    }
    const json = await res.json();
    return json.data;
  },

  getStatementStatus: async (importId: string) => {
    const res = await apiFetch(`${API_BASE}/api/expenses/statement/${importId}/status`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch statement status');
    const json = await res.json();
    return json.data;
  },

  getStatementSummary: async (importId: string) => {
    const res = await apiFetch(`${API_BASE}/api/expenses/statement/${importId}/summary`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch statement summary');
    const json = await res.json();
    return json.data;
  },

  getStatementTransactions: async (importId: string) => {
    const res = await apiFetch(`${API_BASE}/api/expenses/statement/${importId}/transactions`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch statement transactions');
    const json = await res.json();
    return json.data;
  },

  updateStatementTransaction: async (importId: string, txId: string, data: any) => {
    const res = await apiFetch(`${API_BASE}/api/expenses/statement/${importId}/transactions/${txId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update statement transaction');
    const json = await res.json();
    return json.data;
  },

  deleteStatementTransaction: async (importId: string, txId: string) => {
    const res = await apiFetch(`${API_BASE}/api/expenses/statement/${importId}/transactions/${txId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete statement transaction');
    const json = await res.json();
    return json.data;
  },

  bulkSelectTransactions: async (importId: string, transactionIds: string[], isSelected: boolean) => {
    const res = await apiFetch(`${API_BASE}/api/expenses/statement/${importId}/transactions/bulk-select`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ transaction_ids: transactionIds, is_selected: isSelected }),
    });
    if (!res.ok) throw new Error('Failed to bulk select/deselect transactions');
    const json = await res.json();
    return json.data;
  },

  confirmStatementImport: async (importId: string, paymentMethod: string) => {
    const res = await apiFetch(`${API_BASE}/api/expenses/statement/${importId}/confirm`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ payment_method: paymentMethod }),
    });
    if (!res.ok) {
      const errorMsg = await res.json().then(j => j.detail || j.message).catch(() => 'Failed to confirm statement import');
      throw new Error(errorMsg);
    }
    const json = await res.json();
    return json.data;
  },

  overrideBankParser: async (importId: string, bankName: string) => {
    const res = await apiFetch(`${API_BASE}/api/expenses/statement/${importId}/override-bank`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ bank_name: bankName }),
    });
    if (!res.ok) {
      const errorMsg = await res.json().then(j => j.detail || j.message).catch(() => 'Failed to override bank parser');
      throw new Error(errorMsg);
    }
    const json = await res.json();
    return json.data;
  },

  bulkReclassify: async (transactionIds: string[], category?: string, nature?: string) => {
    const payload: any = { transaction_ids: transactionIds };
    if (category) payload.category = category;
    if (nature) payload.nature = nature;

    const res = await apiFetch(`${API_BASE}/api/expenses/reclassify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to bulk reclassify transactions');
    const json = await res.json();
    return json.data;
  },
};
