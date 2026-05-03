'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { fetchTrends, fetchCompareTrends } from '@/lib/api';

const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981'];

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-8"><div className="skeleton h-8 w-48 mb-4" /><div className="skeleton h-[350px] w-full rounded-lg" /></div>}>
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [compareData, setCompareData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Load from URL params
  useEffect(() => {
    const ids = searchParams.get('ids');
    if (ids) setSelectedIds(ids.split(',').map(Number).filter(Boolean));
  }, [searchParams]);

  // Search for trends to add
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const result = await fetchTrends({ search: search.trim(), limit: 8 });
        setSearchResults(result.data || []);
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch comparison data
  useEffect(() => {
    if (selectedIds.length < 2) { setCompareData(null); return; }
    setLoading(true);
    fetchCompareTrends(selectedIds)
      .then(setCompareData)
      .catch(() => setCompareData(null))
      .finally(() => setLoading(false));
  }, [selectedIds]);

  const addTrend = (id: number) => {
    if (selectedIds.length >= 4 || selectedIds.includes(id)) return;
    setSelectedIds([...selectedIds, id]);
    setSearch('');
    setSearchResults([]);
  };

  const removeTrend = (id: number) => setSelectedIds(selectedIds.filter(i => i !== id));

  // Build unified chart data
  const chartData: any[] = [];
  if (compareData?.series) {
    const allTimestamps = new Set<string>();
    Object.values(compareData.series).forEach((s: any) => s.forEach((p: any) => allTimestamps.add(p.timestamp)));
    const sorted = Array.from(allTimestamps).sort();
    sorted.forEach(ts => {
      const point: any = { time: new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
      compareData.trends.forEach((t: any) => {
        const match = compareData.series[t.id]?.find((s: any) => s.timestamp === ts);
        point[t.name] = match?.popularity || null;
      });
      chartData.push(point);
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-2"><span className="gradient-text">Compare Trends</span></h1>
      <p className="text-text-muted text-sm mb-6">Select 2–4 trends to compare side by side.</p>

      {/* Search & Add */}
      <div className="relative mb-6">
        <input type="text" placeholder="Search trends to add..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-accent/50" />
        {searchResults.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg overflow-hidden shadow-xl">
            {searchResults.filter(t => !selectedIds.includes(t.id)).slice(0, 5).map((t: any) => (
              <button key={t.id} onClick={() => addTrend(t.id)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-hover flex justify-between items-center">
                <span className="truncate">{t.name}</span>
                <span className="text-xs text-text-dim ml-2">{t.platform}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {selectedIds.length === 0 && <p className="text-text-dim text-sm">No trends selected yet.</p>}
        {compareData?.trends?.map((t: any, i: number) => (
          <span key={t.id} className="badge border border-border bg-surface text-foreground pr-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
            {t.name}
            <button onClick={() => removeTrend(t.id)} className="ml-1 text-text-dim hover:text-danger text-xs px-1">✕</button>
          </span>
        ))}
      </div>

      {/* Chart */}
      {loading && <div className="glass-card p-8"><div className="skeleton h-[350px] w-full rounded-lg" /></div>}

      {!loading && chartData.length > 0 && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Popularity Over Time</h2>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Legend />
                {compareData?.trends?.map((t: any, i: number) => (
                  <Line key={t.id} type="monotone" dataKey={t.name} stroke={COLORS[i]} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Score comparison cards */}
      {compareData?.trends && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {compareData.trends.map((t: any, i: number) => (
            <div key={t.id} className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                <h3 className="font-semibold truncate">{t.name}</h3>
              </div>
              {t.latestScore ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-text-dim text-xs">Score</span><p className="font-bold text-lg">{Math.round(t.latestScore.composite_score)}</p></div>
                  <div><span className="text-text-dim text-xs">Velocity</span><p className="font-semibold">{Math.round(t.latestScore.velocity)}</p></div>
                  <div><span className="text-text-dim text-xs">Popularity</span><p className="font-semibold">{Math.round(t.latestScore.popularity)}</p></div>
                  <div><span className="text-text-dim text-xs">Engagement</span><p className="font-semibold">{Math.round(t.latestScore.engagement)}</p></div>
                </div>
              ) : <p className="text-text-dim text-sm">No score data yet</p>}
            </div>
          ))}
        </div>
      )}

      {selectedIds.length > 0 && selectedIds.length < 2 && (
        <div className="text-center py-8 text-text-dim text-sm">Add at least one more trend to compare.</div>
      )}
    </div>
  );
}
