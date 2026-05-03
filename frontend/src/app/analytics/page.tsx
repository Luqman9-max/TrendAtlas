// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchAnalytics } from '@/lib/api';

// Dynamic imports for charting and maps to avoid SSR errors
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

const ComposableMap = dynamic(() => import('react-simple-maps').then(m => m.ComposableMap), { ssr: false });
const Geographies = dynamic(() => import('react-simple-maps').then(m => m.Geographies), { ssr: false });
const Geography = dynamic(() => import('react-simple-maps').then(m => m.Geography), { ssr: false });
const Marker = dynamic(() => import('react-simple-maps').then(m => m.Marker), { ssr: false });

// TopoJSON for the world map
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];

// Mock hotspots since GitHub/Reddit don't easily provide real-time geodata
const markers = [
  { markerOffset: -15, name: "San Francisco", coordinates: [-122.4194, 37.7749], fill: "#06b6d4" },
  { markerOffset: -15, name: "New York", coordinates: [-74.006, 40.7128], fill: "#8b5cf6" },
  { markerOffset: 15, name: "London", coordinates: [-0.1276, 51.5072], fill: "#f59e0b" },
  { markerOffset: 15, name: "Tokyo", coordinates: [139.6917, 35.6895], fill: "#10b981" },
  { markerOffset: 15, name: "Bengaluru", coordinates: [77.5946, 12.9716], fill: "#ec4899" },
  { markerOffset: 15, name: "Berlin", coordinates: [13.4050, 52.5200], fill: "#3b82f6" },
];

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics()
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="skeleton h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-lg" />)}
        </div>
        <div className="skeleton h-96 rounded-lg mb-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold mb-2 text-danger">⚠️ {error || 'No data'}</h2>
      </div>
    );
  }

  const { totalTrends, averageScore, platformCounts, platformAverages, categoryCounts } = data;

  // Format data for Recharts
  const platformData = Object.entries(platformCounts).map(([name, value]) => ({ name, value }));
  const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6 animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">
        <span className="gradient-text">Analytics Dashboard</span>
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5 border-l-4 border-l-cyan-500">
          <p className="text-text-dim text-xs font-semibold uppercase tracking-wider mb-1">Total Trends</p>
          <p className="text-3xl font-bold">{totalTrends}</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-l-purple-500">
          <p className="text-text-dim text-xs font-semibold uppercase tracking-wider mb-1">Avg Global Score</p>
          <p className="text-3xl font-bold">{averageScore}</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-l-amber-500">
          <p className="text-text-dim text-xs font-semibold uppercase tracking-wider mb-1">GitHub Avg</p>
          <p className="text-3xl font-bold">{platformAverages.github || 0}</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-l-emerald-500">
          <p className="text-text-dim text-xs font-semibold uppercase tracking-wider mb-1">Reddit Avg</p>
          <p className="text-3xl font-bold">{platformAverages.reddit || 0}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6 h-80 flex flex-col">
          <h2 className="text-lg font-semibold mb-2">Trends by Platform</h2>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={platformData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {platformData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 h-80 flex flex-col">
          <h2 className="text-lg font-semibold mb-2">Category Distribution</h2>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Global Map */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Global Activity Map</h2>
          <span className="badge bg-surface-hover border border-border text-xs">Simulated Data</span>
        </div>
        <div className="w-full bg-surface-hover/50 rounded-lg overflow-hidden flex items-center justify-center border border-border">
          <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: "100%", height: "400px" }}>
            <Geographies geography={geoUrl}>
              {({ geographies }: { geographies: any }) =>
                geographies.map((geo: any) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="var(--surface)"
                    stroke="var(--border)"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "var(--surface-hover)", outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>
            {markers.map(({ name, coordinates, markerOffset, fill }) => (
              <Marker key={name} coordinates={coordinates as [number, number]}>
                <circle r={6} fill={fill} stroke="#fff" strokeWidth={1.5} className="animate-pulse" />
                <text textAnchor="middle" y={markerOffset} style={{ fontFamily: "Inter, sans-serif", fill: "var(--text-muted)", fontSize: "10px", fontWeight: "600" }}>
                  {name}
                </text>
              </Marker>
            ))}
          </ComposableMap>
        </div>
      </div>

    </div>
  );
}
