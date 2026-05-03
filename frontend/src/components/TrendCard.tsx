'use client';

import Link from 'next/link';

interface TrendCardProps {
  trend: {
    id: number;
    name: string;
    slug: string;
    platform: string;
    category: string;
    description?: string;
    score?: {
      composite_score: number;
      popularity: number;
      velocity: number;
      engagement: number;
    } | null;
  };
}

const platformColors: Record<string, string> = {
  github: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  reddit: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  google: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const platformIcons: Record<string, string> = {
  github: '🐙',
  reddit: '🔴',
  google: '🔍',
};

export default function TrendCard({ trend }: TrendCardProps) {
  const score = trend.score?.composite_score ?? 0;
  const velocity = trend.score?.velocity ?? 50;

  // Score color
  const scoreColor =
    score >= 70 ? 'text-emerald-400' :
    score >= 40 ? 'text-cyan-400' :
    'text-slate-400';

  // Velocity indicator
  const velocityIcon = velocity > 60 ? '↑' : velocity < 40 ? '↓' : '→';
  const velocityColor =
    velocity > 60 ? 'text-emerald-400' :
    velocity < 40 ? 'text-red-400' :
    'text-slate-400';

  return (
    <Link href={`/trends/${trend.id}`}>
      <div className="glass-card p-5 cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-accent transition-colors">
              {trend.name}
            </h3>
            {trend.description && (
              <p className="text-xs text-text-dim mt-1 line-clamp-2">
                {trend.description}
              </p>
            )}
          </div>
          <div className={`text-2xl font-bold ${scoreColor} ml-3`}>
            {Math.round(score)}
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`badge border ${platformColors[trend.platform] || 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
            {platformIcons[trend.platform] || '📌'} {trend.platform}
          </span>
          <span className="badge bg-surface-hover text-text-muted border border-border">
            {trend.category}
          </span>
        </div>

        {/* Metrics bar */}
        <div className="flex items-center justify-between text-xs text-text-dim">
          <div className="flex items-center gap-3">
            <span>Pop: {trend.score?.popularity ?? '—'}</span>
            <span>Eng: {trend.score?.engagement ?? '—'}</span>
          </div>
          <span className={`font-medium ${velocityColor}`}>
            {velocityIcon} {velocity > 50 ? '+' : ''}{Math.round(velocity - 50)}
          </span>
        </div>

        {/* Score bar */}
        <div className="mt-3 h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(score, 100)}%`,
              background: score >= 70
                ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                : score >= 40
                ? 'linear-gradient(90deg, #06b6d4, #8b5cf6)'
                : 'linear-gradient(90deg, #64748b, #94a3b8)',
            }}
          />
        </div>
      </div>
    </Link>
  );
}
