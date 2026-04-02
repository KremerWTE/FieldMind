'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Building {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  buildingType?: string;
  healthScore?: number;
  projectCount?: number;
  photoCount?: number;
  createdAt: string;
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // New building modal
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', address: '' });
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState('');

  useEffect(() => { fetchBuildings(); }, [page]);

  const fetchBuildings = async () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/buildings?page=${page}&limit=${PAGE_SIZE}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setBuildings(Array.isArray(data) ? data : data.buildings ?? []);
        setTotal(data.totalCount ?? (Array.isArray(data) ? data.length : 0));
      }
    } finally {
      setLoading(false);
    }
  };

  const createBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewError('');
    setNewSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/buildings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      if (res.ok) {
        setShowNew(false);
        setNewForm({ name: '', address: '' });
        fetchBuildings();
      } else {
        const d = await res.json().catch(() => ({}));
        setNewError(d.message || 'Failed to create building.');
      }
    } catch {
      setNewError('Network error.');
    } finally {
      setNewSaving(false);
    }
  };

  const filtered = buildings.filter((b) =>
    search === '' ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.address.toLowerCase().includes(search.toLowerCase())
  );

  const healthColor = (score?: number) => {
    if (score == null) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buildings</h1>
          <p className="text-sm text-gray-500 mt-1">{total} properties managed</p>
        </div>
        <button
          onClick={() => { setShowNew(true); setNewError(''); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          + New Building
        </button>
      </div>

      {/* New Building Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Building</h2>
            <form onSubmit={createBuilding} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St Commercial"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={newForm.address}
                  onChange={(e) => setNewForm({ ...newForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St, Springfield, IL 62701"
                />
              </div>
              {newError && <p className="text-sm text-red-600">{newError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={newSaving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {newSaving ? 'Saving…' : 'Create Building'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search buildings…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">No buildings found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Building', 'Type', 'Health', 'Projects', 'Photos', ''].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-500">{b.address}{b.city ? `, ${b.city}` : ''}{b.state ? `, ${b.state}` : ''}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{b.buildingType ?? '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`text-sm font-semibold ${healthColor(b.healthScore)}`}>
                      {b.healthScore != null ? `${b.healthScore}%` : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{b.projectCount ?? '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{b.photoCount ?? '—'}</td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/buildings/${b.id}`} className="text-blue-600 hover:underline text-sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * PAGE_SIZE >= total}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
