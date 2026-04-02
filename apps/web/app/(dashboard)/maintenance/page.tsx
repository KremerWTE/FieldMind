'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function MaintenancePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Open');

  const token = () => localStorage.getItem('accessToken');
  const h = () => ({ Authorization: `Bearer ${token()}` });
  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => { fetchEvents(); }, [severityFilter, statusFilter]);

  const fetchEvents = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (severityFilter) params.set('severity', severityFilter);
    if (statusFilter) params.set('status', statusFilter);
    try {
      const res = await fetch(`${base}/buildings/maintenance-events?${params}`, { headers: h() });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } finally {
      setLoading(false);
    }
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

  const statusBadge = (st: string) => {
    const map: Record<string, string> = {
      Open: 'bg-red-50 text-red-700 border border-red-200',
      Monitoring: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      Resolved: 'bg-green-50 text-green-700 border border-green-200',
    };
    return map[st] ?? 'bg-gray-50 text-gray-600 border border-gray-200';
  };

  const criticalCount = events.filter((e) => e.severity === 'Critical' && e.status === 'Open').length;
  const openCount = events.filter((e) => e.status === 'Open').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Events</h1>
          <p className="text-sm text-gray-500 mt-1">
            {openCount} open · {criticalCount > 0 && (
              <span className="text-red-600 font-medium">{criticalCount} critical</span>
            )}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Open', value: events.filter((e) => e.status === 'Open').length, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
            { label: 'Monitoring', value: events.filter((e) => e.status === 'Monitoring').length, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
            { label: 'Resolved', value: events.filter((e) => e.status === 'Resolved').length, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
            { label: 'Critical', value: events.filter((e) => e.severity === 'Critical').length, color: 'text-red-700', bg: 'bg-white border-gray-200' },
          ].map((card) => (
            <div key={card.label} className={`border rounded-lg p-4 ${card.bg}`}>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="Open">Open</option>
          <option value="Monitoring">Monitoring</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">No maintenance events found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Building', 'Issue', 'Severity', 'Type', 'Status', 'Source', 'Date'].map((col) => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((e: any) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    {e.buildingId ? (
                      <Link href={`/buildings/${e.buildingId}`} className="text-sm text-blue-600 hover:underline font-medium">
                        {e.buildingName ?? '—'}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{e.title}</p>
                    {e.description && (
                      <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{e.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadge(e.severity)}`}>
                      {e.severity}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{e.type}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(e.status)}`}>
                      {e.status}
                    </span>
                    {e.status === 'Resolved' && e.resolvedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(e.resolvedAt), 'MMM d')}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{e.detectedBy ?? '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {e.createdAt ? format(new Date(e.createdAt), 'MMM d, yyyy') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
