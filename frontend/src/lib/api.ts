/**
 * API Client for NCAA Basketball Monitor
 * Handles all API requests
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Make an API request
 */
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Games endpoints
 */
export const games = {
  async getLive() {
    return apiRequest('/api/games/live');
  },

  async getTriggered() {
    return apiRequest('/api/games/triggered');
  },

  async getCompleted(limit: number = 50) {
    return apiRequest(`/api/stats/results?limit=${limit}`);
  },

  async getHistory(gameId: string) {
    return apiRequest(`/api/games/${gameId}/history`);
  },

  async getAISummary(gameId: string) {
    return apiRequest(`/api/games/${gameId}/ai-summary`, {
      method: 'POST',
    });
  },

  async getUpcoming(hoursAhead: number = 24) {
    return apiRequest(`/api/games/upcoming?hours_ahead=${hoursAhead}`);
  },
};

/**
 * Stats endpoints
 */
export const stats = {
  async getPerformance() {
    return apiRequest('/api/stats/performance');
  },

  async getResults(limit: number = 50) {
    return apiRequest(`/api/stats/results?limit=${limit}`);
  },

  async refresh() {
    return apiRequest('/api/stats/refresh', { method: 'POST' });
  },
};

/**
 * Admin endpoints
 */
export const admin = {
  async getUsers() {
    return apiRequest('/api/admin/users');
  },

  async createUser(username: string, password: string, isAdmin: boolean = false) {
    return apiRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, is_admin: isAdmin }),
    });
  },

  async deleteUser(username: string) {
    return apiRequest(`/api/admin/users/${username}`, {
      method: 'DELETE',
    });
  },

  async getConfig() {
    return apiRequest('/api/admin/config');
  },

  async updateWeights(weights: Record<string, number>) {
    return apiRequest('/api/admin/config/weights', {
      method: 'POST',
      body: JSON.stringify(weights),
    });
  },
};

/**
 * Export endpoints
 */
export const exports = {
  async downloadLiveLog() {
    window.open(`${API_URL}/api/export/live-log`, '_blank');
  },

  async downloadResults() {
    window.open(`${API_URL}/api/export/results`, '_blank');
  },
};
