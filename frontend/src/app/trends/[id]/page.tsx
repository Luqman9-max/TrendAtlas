'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { fetchTrendDetail } from '@/lib/api';
import ScoreGauge from '@/components/ScoreGauge';

const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });

const platformColors: Record<string, string> = {
  github: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  reddit: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  google: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export default function TrendDetailPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchTrendDetail(params.id as string);
        setData(result);
      } catch { setError('Failed to load trend details'); }
      finally { setLoading(false); }
    }
    load();
  }, [params.id]);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
      <div className="skeleton h-8 w-48 mb-4" />
      <div className="skeleton h-4 w-96 mb-8" />
      <div className="glass-card p-8"><div className="skeleton h-[300px] w-full rounded-lg" /></div>
    </div>
  );

  if (error || !data) return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-center">
      <div className="text-4xl mb-4">😕</div>
      <h2 className="text-lg font-semibold mb-2">Trend not found</h2>
      <Link href="/" className="text-accent text-sm">← Back to dashboard</Link>
    </div>
  );

  const { trend, score, scoreHistory, snapshots, insights } = data;
  const chartData = (scoreHistory || []).map((s: any) => ({
    time: new Date(s.calculated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: s.composite_score, popularity: s.popularity, velocity: s.velocity,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6 animate-fade-in">
      <Link href="/" className="text-text-muted hover:text-accent text-sm mb-4 inline-block">← Back</Link>

      <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{trend.name}</h1>
          {trend.description && <p className="text-text-muted text-sm mb-3">{trend.description}</p>}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`badge border ${platformColors[trend.platform] || ''}`}>{trend.platform}</span>
            <span className="badge bg-surface-hover text-text-muted border border-border">{trend.category}</span>
            {trend.url && <a href={trend.url} target="_blank" rel="noopener noreferrer" className="badge bg-accent-muted text-accent border border-accent/30">🔗 Source</a>}
          </div>
          {insights?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {insights.map((ins: any, i: number) => (
                <span key={i} className="badge bg-surface border border-border text-text-muted" title={ins.description}>{ins.label}</span>
              ))}
            </div>
          )}
        </div>
        {score && (
          <div className="glass-card p-6 flex items-center gap-6">
            <ScoreGauge score={score.composite_score} size={100} />
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[['Popularity', score.popularity], ['Velocity', score.velocity], ['Engagement', score.engagement], ['Cross-Platform', score.cross_platform]].map(([label, val]) => (
                <div key={label as string}><span className="text-text-dim text-xs">{label}</span><p className="font-semibold">{Math.round(val as number)}</p></div>
              ))}
            </div>
          </div>
        )}
      </div>

      {chartData.length > 1 && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Score History</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="popularity" stroke="#8b5cf6" strokeWidth={1} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Details</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[['First Seen', trend.first_seen_at ? new Date(trend.first_seen_at).toLocaleDateString() : '—'],
            ['Updated', trend.updated_at ? new Date(trend.updated_at).toLocaleDateString() : '—'],
            ['Data Points', snapshots?.length || 0],
            ['Platform', trend.platform]].map(([label, val]) => (
            <div key={label as string}><dt className="text-text-dim text-xs">{label}</dt><dd className="font-medium capitalize">{String(val)}</dd></div>
          ))}
        </dl>
      </div>
    </div>
  );
}
