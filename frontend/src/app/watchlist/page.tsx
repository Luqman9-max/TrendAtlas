'use client';

export default function WatchlistPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">
        <span className="gradient-text">Watchlist</span>
      </h1>
      <p className="text-text-muted text-sm mb-8">
        Save trends to track them over time. Sign in to access your watchlist.
      </p>

      {/* Placeholder — will be wired with auth in Phase 6-7 */}
      <div className="text-center py-16 animate-fade-in">
        <div className="text-5xl mb-4">⭐</div>
        <h2 className="text-lg font-semibold mb-2">Your Watchlist</h2>
        <p className="text-text-muted text-sm mb-6 max-w-md mx-auto">
          Sign in to save and track trends that matter to you. Get notified when their scores change significantly.
        </p>
        <button className="px-6 py-2.5 bg-accent/20 text-accent border border-accent/30 rounded-lg text-sm font-medium hover:bg-accent/30 transition-all">
          Sign In to Get Started
        </button>
      </div>
    </div>
  );
}
