'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export default function ShareLinksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // New link modal
  const [showNew, setShowNew] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [newForm, setNewForm] = useState({
    scope: 'building',
    scopeId: '',
    title: '',
    description: '',
    password: '',
    expiresAt: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newLink, setNewLink] = useState<{ shareUrl: string; token: string } | null>(null);

  const token = () => localStorage.getItem('accessToken');
  const h = (json = false) => ({
    Authorization: `Bearer ${token()}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  });
  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetchLinks();
    Promise.all([
      fetch(`${base}/buildings?limit=100`, { headers: h() }).then((r) => r.json()),
      fetch(`${base}/projects`, { headers: h() }).then((r) => r.json()),
    ]).then(([b, p]) => {
      setBuildings(Array.isArray(b) ? b : b.buildings ?? []);
      setProjects(Array.isArray(p) ? p : p.projects ?? []);
    }).catch(() => {});
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    const res = await fetch(`${base}/share/links`, { headers: h() });
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links ?? []);
    }
    setLoading(false);
  };

  const createLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.scopeId) { setCreateError('Please select a building or project.'); return; }
    setCreateError('');
    setCreating(true);
    try {
      const res = await fetch(`${base}/share/links`, {
        method: 'POST',
        headers: h(true),
        body: JSON.stringify({
          scope: newForm.scope,
          scopeId: newForm.scopeId,
          title: newForm.title || undefined,
          description: newForm.description || undefined,
          password: newForm.password || undefined,
          expiresAt: newForm.expiresAt || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewLink({ shareUrl: data.shareUrl, token: data.shareLink.token });
        fetchLinks();
      } else {
        const d = await res.json().catch(() => ({}));
        setCreateError(d.error ?? 'Failed to create link.');
      }
    } catch {
      setCreateError('Network error.');
    } finally {
      setCreating(false);
    }
  };

  const revokeLink = async (linkToken: string) => {
    if (!confirm('Revoke this share link? It will stop working immediately.')) return;
    const res = await fetch(`${base}/share/links/${linkToken}`, {
      method: 'DELETE',
      headers: h(),
    });
    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l.token !== linkToken));
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const scopeOptions = newForm.scope === 'building' ? buildings : projects;

  const resetModal = () => {
    setShowNew(false);
    setNewLink(null);
    setCreateError('');
    setNewForm({ scope: 'building', scopeId: '', title: '', description: '', password: '', expiresAt: '' });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Share Links</h1>
          <p className="text-sm text-gray-500 mt-1">Create public gallery links for buildings, projects, or folders</p>
        </div>
        <button
          onClick={() => { setShowNew(true); setNewLink(null); setCreateError(''); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          + New Share Link
        </button>
      </div>

      {/* New Link Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            {newLink ? (
              /* Success state */
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Link Created!</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Share URL</p>
                  <p className="text-sm font-mono text-gray-900 break-all">{newLink.shareUrl}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyUrl(newLink.shareUrl)}
                    className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    {copied === newLink.shareUrl ? 'Copied!' : 'Copy URL'}
                  </button>
                  <button
                    onClick={resetModal}
                    className="flex-1 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              /* Create form */
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">New Share Link</h2>
                <form onSubmit={createLink} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                    <select
                      value={newForm.scope}
                      onChange={(e) => setNewForm({ ...newForm, scope: e.target.value, scopeId: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="building">Building</option>
                      <option value="project">Project</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {newForm.scope === 'building' ? 'Building' : 'Project'} *
                    </label>
                    <select
                      required
                      value={newForm.scopeId}
                      onChange={(e) => setNewForm({ ...newForm, scopeId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select…</option>
                      {scopeOptions.map((o: any) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                    <input
                      type="text"
                      value={newForm.title}
                      onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                      placeholder="Q2 Roof Inspection Photos"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password (optional)</label>
                      <input
                        type="password"
                        value={newForm.password}
                        onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
                        placeholder="Leave blank for public"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expires (optional)</label>
                      <input
                        type="date"
                        value={newForm.expiresAt}
                        onChange={(e) => setNewForm({ ...newForm, expiresAt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>

                  {createError && <p className="text-sm text-red-600">{createError}</p>}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {creating ? 'Creating…' : 'Create Link'}
                    </button>
                    <button
                      type="button"
                      onClick={resetModal}
                      className="flex-1 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Links list */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : links.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">No share links yet.</p>
          <p className="text-gray-400 text-xs mt-1">Create one to share a building or project gallery publicly.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Title / Scope', 'URL', 'Views', 'Expires', 'Status', ''].map((col) => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {links.map((l: any) => (
                <tr key={l.id} className={`hover:bg-gray-50 ${l.isExpired ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{l.title || '(untitled)'}</p>
                    <p className="text-xs text-gray-500 capitalize">{l.scope} · {l.hasPassword ? '🔒 Password' : 'Public'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-600 truncate max-w-[200px]">{l.shareUrl}</span>
                      <button
                        onClick={() => copyUrl(l.shareUrl)}
                        className="text-xs text-blue-600 hover:underline flex-shrink-0"
                      >
                        {copied === l.shareUrl ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {l.viewCount ?? 0}
                    {l.lastAccessedAt && (
                      <p className="text-xs text-gray-400">
                        Last: {format(new Date(l.lastAccessedAt), 'MMM d')}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {l.expiresAt ? format(new Date(l.expiresAt), 'MMM d, yyyy') : 'Never'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      l.isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {l.isExpired ? 'Expired' : 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => revokeLink(l.token)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Revoke
                    </button>
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
