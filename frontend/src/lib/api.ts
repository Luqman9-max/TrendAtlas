import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30s to handle Render cold starts
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor to attach auth token
api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const { getAccessToken } = await import('@/lib/auth');
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.warn('[API] Request timed out — backend may be waking up');
    }
    return Promise.reject(error);
  }
);

// --- Trends API ---

export async function fetchTrends(params: {
  page?: number;
  limit?: number;
  platform?: string;
  category?: string;
  sort?: string;
  order?: string;
  search?: string;
} = {}) {
  const { data } = await api.get('/trends', { params });
  return data;
}

export async function fetchTrendDetail(id: string | number) {
  const { data } = await api.get(`/trends/${id}`);
  return data;
}

export async function fetchTopTrends(limit = 10) {
  const { data } = await api.get('/trends/top', { params: { limit } });
  return data;
}

export async function fetchCompareTrends(ids: number[]) {
  const { data } = await api.get('/trends/compare', {
    params: { ids: ids.join(',') },
  });
  return data;
}

export async function fetchHealthCheck() {
  const { data } = await api.get('/health');
  return data;
}

export async function triggerPipeline() {
  const { data } = await api.post('/admin/fetch');
  return data;
}

// --- Watchlist API ---

export async function fetchWatchlist() {
  const { data } = await api.get('/watchlist');
  return data;
}

export async function addToWatchlist(trendId: number) {
  const { data } = await api.post('/watchlist', { trendId });
  return data;
}

export async function removeFromWatchlist(trendId: number) {
  const { data } = await api.delete(`/watchlist/${trendId}`);
  return data;
}

export async function checkWatchlist(trendId: number) {
  const { data } = await api.get(`/watchlist/check/${trendId}`);
  return data;
}

// --- Analytics API ---
export async function fetchAnalytics() {
  const { data } = await api.get('/analytics');
  return data;
}

export default api;

