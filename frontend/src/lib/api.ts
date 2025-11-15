/**
 * API Client for NCAA Basketball Monitor
 * Handles all API requests with authentication
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Make an authenticated API request
 */
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Unauthorized - redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Authentication endpoints
 */
export const auth = {
  async login(username: string, password: string) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }

    return response.json();
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  },
};

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
    const token = getAuthToken();
    window.open(`${API_URL}/api/export/live-log?token=${token}`, '_blank');
  },

  async downloadResults() {
    const token = getAuthToken();
    window.open(`${API_URL}/api/export/results?token=${token}`, '_blank');
  },
};
