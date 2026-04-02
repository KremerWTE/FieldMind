'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  status: string;
  buildingName?: string;
  buildingId?: string;
  address?: string;
  description?: string;
  createdAt: string;
  photoCount?: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // New project modal
  const [showNew, setShowNew] = useState(false);
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [newForm, setNewForm] = useState({ name: '', buildingId: '', status: 'Active' });
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState('');

  useEffect(() => { fetchProjects(); }, [statusFilter]);

  const fetchProjects = async () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    const params = statusFilter ? `?status=${statusFilter}` : '';
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : data.projects ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = async () => {
    setNewError('');
    if (buildings.length === 0) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/buildings?limit=100`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (res.ok) {
        const d = await res.json();
        setBuildings(Array.isArray(d) ? d : d.buildings ?? []);
      }
    }
    setShowNew(true);
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewError('');
    setNewSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      if (res.ok) {
        setShowNew(false);
        setNewForm({ name: '', buildingId: '', status: 'Active' });
        fetchProjects();
      } else {
        const d = await res.json().catch(() => ({}));
        setNewError(d.message || 'Failed to create project.');
      }
    } catch {
      setNewError('Network error.');
    } finally {
      setNewSaving(false);
    }
  };

  const filtered = projects.filter(
    (p) =>
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.buildingName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Active: 'bg-green-100 text-green-700',
      Completed: 'bg-blue-100 text-blue-700',
      OnHold: 'bg-yellow-100 text-yellow-700',
      Cancelled: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">{projects.length} total projects</p>
        </div>
        <button
          onClick={openNewModal}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>

      {/* New Project Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Project</h2>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Roof Inspection Q2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building *</label>
                <select
                  required
                  value={newForm.buildingId}
                  onChange={(e) => setNewForm({ ...newForm, buildingId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a building…</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={newForm.status}
                  onChange={(e) => setNewForm({ ...newForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="OnHold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              {newError && <p className="text-sm text-red-600">{newError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={newSaving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {newSaving ? 'Saving…' : 'Create Project'}
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

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="search"
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="OnHold">On Hold</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">No projects found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Project', 'Building', 'Status', 'Photos', 'Created', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-gray-500 truncate max-w-xs">{p.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {p.buildingId ? (
                      <Link href={`/buildings/${p.buildingId}`} className="text-sm text-blue-600 hover:underline">
                        {p.buildingName ?? '—'}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{p.photoCount ?? '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {format(new Date(p.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline text-sm">
                      View
                    </Link>
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
