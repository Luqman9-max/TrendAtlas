'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fetchWatchlist } from '@/lib/api';
import TrendCard from '@/components/TrendCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import Link from 'next/link';

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    fetchWatchlist()
      .then(res => setItems(res.data || []))
      .catch(() => setError('Failed to load watchlist'))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">
        <span className="gradient-text">Watchlist</span>
      </h1>
      <p className="text-text-muted text-sm mb-8">
        Trends you&apos;re tracking. {items.length > 0 && `${items.length} saved.`}
      </p>

      {/* Not signed in */}
      {!authLoading && !user && (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-5xl mb-4">⭐</div>
          <h2 className="text-lg font-semibold mb-2">Sign in to use Watchlist</h2>
          <p className="text-text-muted text-sm mb-6 max-w-md mx-auto">
            Save and track trends that matter to you across all platforms.
          </p>
          <Link
            href="/login"
            className="px-6 py-2.5 bg-accent/20 text-accent border border-accent/30 rounded-lg text-sm font-medium hover:bg-accent/30 transition-all inline-block"
          >
            Sign In to Get Started
          </Link>
        </div>
      )}

      {/* Loading */}
      {loading && user && <LoadingSkeleton count={3} />}

      {/* Error */}
      {error && (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-text-muted text-sm">{error}</p>
        </div>
      )}

      {/* Empty watchlist */}
      {!loading && !error && user && items.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-lg font-semibold mb-2">No watched trends yet</h2>
          <p className="text-text-muted text-sm mb-6">
            Click the ☆ button on any trend to add it to your watchlist.
          </p>
          <Link
            href="/"
            className="px-6 py-2.5 bg-accent/20 text-accent border border-accent/30 rounded-lg text-sm font-medium hover:bg-accent/30 transition-all inline-block"
          >
            Browse Trends
          </Link>
        </div>
      )}

      {/* Watchlist grid */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
              <TrendCard trend={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
