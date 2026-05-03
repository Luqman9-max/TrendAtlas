'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { addToWatchlist, removeFromWatchlist, checkWatchlist } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface WatchButtonProps {
  trendId: number;
  size?: 'sm' | 'md';
}

export default function WatchButton({ trendId, size = 'sm' }: WatchButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isWatched, setIsWatched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkWatchlist(trendId)
      .then(res => setIsWatched(res.isWatched))
      .catch(() => {});
  }, [user, trendId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if inside a Link
    e.stopPropagation();

    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      if (isWatched) {
        await removeFromWatchlist(trendId);
        setIsWatched(false);
      } else {
        await addToWatchlist(trendId);
        setIsWatched(true);
      }
    } catch (err) {
      console.error('Watchlist toggle failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = size === 'md'
    ? 'px-4 py-2 text-sm gap-2'
    : 'px-2.5 py-1.5 text-xs gap-1';

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center rounded-lg font-medium transition-all disabled:opacity-50 ${sizeClasses} ${
        isWatched
          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
          : 'bg-surface-hover text-text-muted border border-border hover:text-foreground hover:border-text-dim'
      }`}
    >
      <span>{isWatched ? '★' : '☆'}</span>
      {isWatched ? 'Watching' : 'Watch'}
    </button>
  );
}
