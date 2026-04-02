'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

type Tab = 'overview' | 'photos' | 'maintenance' | 'health';

export default function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [building, setBuilding] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [healthStats, setHealthStats] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem('accessToken');
  const headers = () => ({ Authorization: `Bearer ${token()}` });
  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const loadBuilding = async () => {
      const res = await fetch(`${base}/buildings/${id}`, { headers: headers() });
      if (res.ok) setBuilding(await res.json());
      setLoading(false);
    };
    loadBuilding();
  }, [id]);

  useEffect(() => {
    if (tab === 'photos' && photos.length === 0) {
      fetch(`${base}/buildings/${id}/photos?limit=100`, { headers: headers() })
        .then((r) => r.json())
        .then((d) => setPhotos(Array.isArray(d) ? d : d.photos ?? []));
    }
    if (tab === 'maintenance' && maintenance.length === 0) {
      fetch(`${base}/buildings/${id}/maintenance-events`, { headers: headers() })
        .then((r) => r.json())
        .then((d) => setMaintenance(Array.isArray(d) ? d : d.events ?? []));
    }
    if (tab === 'health' && healthStats.length === 0) {
      fetch(`${base}/buildings/${id}/health-stats`, { headers: headers() })
        .then((r) => r.json())
        .then((d) => setHealthStats(Array.isArray(d) ? d : d.stats ?? []));
    }
  }, [tab]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!building) {
    return (
      <div className="p-8 text-center text-gray-500">Building not found.</div>
    );
  }

  const healthColor = (score?: number) => {
    if (score == null) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const severityBadge = (sev: string) => {
    const map: Record<string, string> = {
      Critical: 'bg-red-100 text-red-700',
      High: 'bg-orange-100 text-orange-700',
      Medium: 'bg-yellow-100 text-yellow-700',
      Low: 'bg-green-100 text-green-700',
    };
    return map[sev] ?? 'bg-gray-100 text-gray-600';
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'photos', label: 'Photos' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'health', label: 'Health Stats' },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/buildings" className="hover:text-gray-900">Buildings</Link>
          <span>/</span>
          <span className="text-gray-900">{building.name}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{building.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {building.address}{building.city ? `, ${building.city}` : ''}{building.state ? `, ${building.state}` : ''}
            </p>
          </div>
          {building.healthScore != null && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Health Score</p>
              <p className={`text-3xl font-bold ${healthColor(building.healthScore)}`}>
                {building.healthScore}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Building Details</h2>
            <dl className="space-y-3">
              {[
                ['Type', building.buildingType],
                ['Year Built', building.yearBuilt],
                ['Square Footage', building.squareFootage ? `${building.squareFootage.toLocaleString()} sq ft` : null],
                ['Floors', building.floors],
                ['Units', building.units],
                ['Owner', building.ownerName],
                ['Owner Email', building.ownerEmail],
                ['Owner Phone', building.ownerPhone],
              ].map(([label, value]) =>
                value != null ? (
                  <div key={label as string} className="flex justify-between">
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="text-sm font-medium text-gray-900">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Notes</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {building.notes || 'No notes.'}
            </p>
          </div>
        </div>
      )}

      {/* Photos */}
      {tab === 'photos' && (
        <div>
          {photos.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {photos.map((p: any) => (
                <Link key={p.id} href={`/photos/${p.id}`}>
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                    {p.thumbnailUrl || p.s3Url ? (
                      <img
                        src={p.thumbnailUrl ?? p.s3Url}
                        alt={p.fileName ?? 'photo'}
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No preview
                      </div>
                    )}
                    {p.aiStatus === 'Completed' && (
                      <span className="absolute top-1.5 right-1.5 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                        AI
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 truncate">{p.fileName ?? p.id}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Maintenance */}
      {tab === 'maintenance' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {maintenance.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No maintenance events.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Title', 'Severity', 'Status', 'Date', 'Source'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {maintenance.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{m.title}</p>
                      {m.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{m.description}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadge(m.severity)}`}>
                        {m.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{m.status}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {m.createdAt ? format(new Date(m.createdAt), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{m.source ?? 'Manual'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Health Stats */}
      {tab === 'health' && (
        <div>
          {healthStats.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No health data recorded.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Metric', 'Value', 'Recorded At', 'Source'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {healthStats.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.metricType}</td>
                      <td className="px-5 py-3 text-sm text-gray-900">{s.value}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {s.recordedAt ? format(new Date(s.recordedAt), 'MMM d, yyyy h:mm a') : '—'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{s.source ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
