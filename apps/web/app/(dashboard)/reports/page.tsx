'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [form, setForm] = useState({
    type: 'building',
    entityId: '',
    dateFrom: '',
    dateTo: '',
    includeAI: true,
    includeMaintenanceEvents: true,
    includeHealthStats: true,
  });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [genSuccess, setGenSuccess] = useState('');

  const token = () => localStorage.getItem('accessToken');
  const h = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });
  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetchAll();
  }, []);

  // Poll every 5 s while any report is Processing or Pending
  useEffect(() => {
    const hasPending = reports.some((r) => r.status === 'Processing' || r.status === 'Pending');
    if (!hasPending) return;
    const id = setInterval(fetchReports, 5000);
    return () => clearInterval(id);
  }, [reports]);

  const fetchReports = async () => {
    const res = await fetch(`${base}/reports`, { headers: h() });
    if (res.ok) {
      const d = await res.json();
      setReports(d.reports ?? []);
    }
  };

  const fetchAll = async () => {
    const [repRes, bRes, pRes] = await Promise.all([
      fetch(`${base}/reports`, { headers: h() }),
      fetch(`${base}/buildings?limit=100`, { headers: h() }),
      fetch(`${base}/projects`, { headers: h() }),
    ]);
    if (repRes.ok) {
      const d = await repRes.json();
      setReports(d.reports ?? []);
    }
    if (bRes.ok) {
      const d = await bRes.json();
      setBuildings(Array.isArray(d) ? d : d.buildings ?? []);
    }
    if (pRes.ok) {
      const d = await pRes.json();
      setProjects(Array.isArray(d) ? d : d.projects ?? []);
    }
    setLoading(false);
  };

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenError('');
    setGenSuccess('');
    if (!form.entityId) {
      setGenError('Please select a building or project.');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`${base}/reports/generate`, {
        method: 'POST',
        headers: h(),
        body: JSON.stringify({
          type: form.type,
          entityId: form.entityId,
          dateFrom: form.dateFrom || undefined,
          dateTo: form.dateTo || undefined,
          includeAI: form.includeAI,
          includeMaintenanceEvents: form.includeMaintenanceEvents,
          includeHealthStats: form.includeHealthStats,
        }),
      });
      if (res.ok) {
        setGenSuccess('Report queued! It will appear in the list below when ready.');
        fetchAll();
      } else {
        const d = await res.json().catch(() => ({}));
        setGenError(d.error ?? 'Failed to start report.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const deleteReport = async (jobId: string) => {
    await fetch(`${base}/reports/${jobId}`, { method: 'DELETE', headers: h() });
    setReports((prev) => prev.filter((r) => r.id !== jobId));
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Completed: 'bg-green-100 text-green-700',
      Processing: 'bg-blue-100 text-blue-700',
      Pending: 'bg-yellow-100 text-yellow-700',
      Failed: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  };

  const entityOptions = form.type === 'building' ? buildings : projects;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Generate and download PDF reports</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Generate form */}
        <div className="col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Generate New Report</h2>

            {genError && (
              <div className="mb-3 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">{genError}</div>
            )}
            {genSuccess && (
              <div className="mb-3 p-2 bg-green-50 text-green-700 text-xs rounded border border-green-200">{genSuccess}</div>
            )}

            <form onSubmit={generate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Report Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value, entityId: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="building">Building</option>
                  <option value="project">Project</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {form.type === 'building' ? 'Building' : 'Project'}
                </label>
                <select
                  value={form.entityId}
                  onChange={(e) => setForm({ ...form, entityId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                >
                  <option value="">Select…</option>
                  {entityOptions.map((o: any) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                  <input
                    type="date"
                    value={form.dateFrom}
                    onChange={(e) => setForm({ ...form, dateFrom: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                  <input
                    type="date"
                    value={form.dateTo}
                    onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-700">Include</p>
                {[
                  ['includeAI', 'AI Analysis'],
                  ['includeMaintenanceEvents', 'Maintenance Events'],
                  ['includeHealthStats', 'Health Stats'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? 'Generating…' : 'Generate Report'}
              </button>
            </form>
          </div>
        </div>

        {/* Reports list */}
        <div className="col-span-2">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Reports</h2>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
              <p className="text-sm text-gray-500">No reports yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Type', 'Entity', 'Status', 'Created', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reports.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 capitalize">{r.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">
                        {r.type === 'building' || r.type === 'Building'
                          ? buildings.find((b: any) => b.id === r.entityId)?.name ?? r.entityId
                          : projects.find((p: any) => p.id === r.entityId)?.name ?? r.entityId}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(r.status)}`}>
                          {r.status}
                        </span>
                        {r.errorMessage && (
                          <p className="text-xs text-red-600 mt-0.5">{r.errorMessage}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {r.createdAt ? format(new Date(r.createdAt), 'MMM d, h:mm a') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          {r.hasDownload && r.downloadUrl && (
                            <a
                              href={r.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Download
                            </a>
                          )}
                          <button
                            onClick={() => deleteReport(r.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
