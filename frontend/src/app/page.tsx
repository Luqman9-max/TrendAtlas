'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchTrends } from '@/lib/api';
import TrendCard from '@/components/TrendCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';

const platforms = ['all', 'github', 'reddit', 'google'];
const sortOptions = [
  { value: 'score', label: 'Top Score' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'name', label: 'Alphabetical' },
];

export default function Dashboard() {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState('all');
  const [sort, setSort] = useState('score');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [serverWaking, setServerWaking] = useState(false);

  const loadTrends = useCallback(async () => {
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => setServerWaking(true), 5000);

    try {
      const params: any = { page, sort, limit: 21 };
      if (platform !== 'all') params.platform = platform;
      if (search.trim()) params.search = search.trim();

      const result = await fetchTrends(params);
      setTrends(result.data || []);
      setPagination(result.pagination);
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Server is waking up. Please try again in a moment.');
      } else {
        setError('Failed to load trends. Is the backend running?');
      }
    } finally {
      clearTimeout(timer);
      setServerWaking(false);
      setLoading(false);
    }
  }, [page, platform, sort, search]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          <span className="gradient-text">Trending Now</span>
        </h1>
        <p className="text-text-muted text-sm md:text-base">
          Real-time trends from GitHub, Reddit, and Google — scored and ranked.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim">🔍</span>
          <input
            type="text"
            placeholder="Search trends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
          />
        </div>

        {/* Platform Filter */}
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => { setPlatform(p); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                platform === p
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent/50 cursor-pointer"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Server waking message */}
      {serverWaking && (
        <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex items-center gap-2 animate-fade-in">
          <span className="animate-spin">⏳</span>
          Server is waking up (free tier). This may take up to 30 seconds...
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-text-muted text-sm mb-4">{error}</p>
          <button
            onClick={loadTrends}
            className="px-4 py-2 bg-accent/20 text-accent border border-accent/30 rounded-lg text-sm font-medium hover:bg-accent/30 transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && <LoadingSkeleton count={6} />}

      {/* Empty State */}
      {!loading && !error && trends.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-4xl mb-4">📭</div>
          <h2 className="text-lg font-semibold mb-2">No trends found</h2>
          <p className="text-text-muted text-sm">
            {search ? `No results for "${search}". Try a different search.` : 'The pipeline hasn\'t run yet. Trends will appear after the first data fetch.'}
          </p>
        </div>
      )}

      {/* Trend Grid */}
      {!loading && !error && trends.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.map((trend, i) => (
              <div key={trend.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                <TrendCard trend={trend} />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ← Prev
              </button>
              <span className="text-sm text-text-dim">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
