'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TeamSettingsPage() {
  const [team, setTeam] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // PropTrax integration state
  const [ptxConfig, setPtxConfig] = useState<{ hasApiKey: boolean; apiKeyPreview: string | null; webhookUrl: string | null } | null>(null);
  const [ptxWebhookUrl, setPtxWebhookUrl] = useState('');
  const [ptxSaving, setPtxSaving] = useState(false);
  const [ptxMsg, setPtxMsg] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

  const token = () => localStorage.getItem('accessToken');
  const h = (json = false) => ({
    Authorization: `Bearer ${token()}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  });

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/team`, { headers: h() }).then((r) => r.ok ? r.json() : null),
      fetch(`${API_URL}/profile`, { headers: h() }).then((r) => r.ok ? r.json() : null),
      fetch(`${API_URL}/team/proptrax-config`, { headers: h() }).then((r) => r.ok ? r.json() : null),
    ]).then(([t, u, ptx]) => {
      setTeam(t);
      setUser(u);
      setEditName(t?.name ?? '');
      if (ptx) {
        setPtxConfig(ptx);
        setPtxWebhookUrl(ptx.webhookUrl ?? '');
      }
    }).finally(() => setLoading(false));
  }, []);

  const isAdmin = user?.role === 'Admin';

  const savePtxWebhookUrl = async () => {
    setPtxSaving(true);
    setPtxMsg('');
    try {
      const res = await fetch(`${API_URL}/team/proptrax-config`, {
        method: 'PUT',
        headers: h(true),
        body: JSON.stringify({ webhookUrl: ptxWebhookUrl }),
      });
      if (res.ok) {
        setPtxMsg('Webhook URL saved.');
        setPtxConfig((prev) => prev ? { ...prev, webhookUrl: ptxWebhookUrl || null } : null);
      }
    } finally {
      setPtxSaving(false);
    }
  };

  const regenerateApiKey = async () => {
    if (!confirm('Regenerate the PropTrax API key? The existing key will stop working immediately.')) return;
    setPtxSaving(true);
    setPtxMsg('');
    try {
      const res = await fetch(`${API_URL}/team/proptrax-config/regenerate-key`, {
        method: 'POST',
        headers: h(),
      });
      if (res.ok) {
        const data = await res.json();
        setNewApiKey(data.apiKey);
        setPtxConfig((prev) => prev ? { ...prev, hasApiKey: true, apiKeyPreview: data.apiKey.slice(0, 8) + '...' } : null);
        setPtxMsg('');
      }
    } finally {
      setPtxSaving(false);
    }
  };

  const saveTeamName = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`${API_URL}/team`, {
        method: 'PATCH',
        headers: h(true),
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTeam((prev: any) => ({ ...prev, name: updated.name }));
        setSaveMsg('Saved.');
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Team Settings</h1>

      {/* Team info card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Team</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team name</label>
            {editing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={saveTeamName}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditName(team?.name ?? ''); }}
                  className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-900">{team?.name}</span>
                {isAdmin && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
            {saveMsg && <p className="text-xs text-green-600 mt-1">{saveMsg}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team slug</label>
            <span className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">{team?.slug}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Members</label>
            <span className="text-sm text-gray-900">{team?.memberCount ?? '—'} active</span>
          </div>

          {team?.createdAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
              <span className="text-sm text-gray-600">{format(new Date(team.createdAt), 'MMMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">People</h2>
        <div className="space-y-2">
          <Link href="/users" className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">
            <span className="font-medium text-gray-800">Manage users</span>
            <span className="text-gray-400">→</span>
          </Link>
          {isAdmin && (
            <Link href="/users/invite" className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">
              <span className="font-medium text-gray-800">Invite a user</span>
              <span className="text-gray-400">→</span>
            </Link>
          )}
        </div>
      </div>

      {/* PropTrax Integration */}
      {isAdmin && ptxConfig !== null && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">PropTrax Integration</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">API</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Allow PropTrax to pull building data, AI photo analysis, and maintenance events via the FieldMind API.
          </p>

          <div className="space-y-4">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              {newApiKey ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800 font-medium mb-1">Copy this key — it will not be shown again.</p>
                  <code className="text-xs font-mono text-yellow-900 break-all">{newApiKey}</code>
                  <button onClick={() => { navigator.clipboard.writeText(newApiKey); }} className="mt-2 text-xs text-blue-600 hover:underline block">
                    Copy to clipboard
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 font-mono">
                    {ptxConfig.hasApiKey ? ptxConfig.apiKeyPreview : 'No key generated'}
                  </span>
                  <button
                    onClick={regenerateApiKey}
                    disabled={ptxSaving}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-gray-700 disabled:opacity-50"
                  >
                    {ptxConfig.hasApiKey ? 'Regenerate key' : 'Generate key'}
                  </button>
                </div>
              )}
            </div>

            {/* Webhook URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
              <p className="text-xs text-gray-400 mb-2">
                FieldMind will POST to this URL when photos are analyzed or issues are detected.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={ptxWebhookUrl}
                  onChange={(e) => setPtxWebhookUrl(e.target.value)}
                  placeholder="https://proptrax.io/webhooks/fieldmind"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={savePtxWebhookUrl}
                  disabled={ptxSaving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {ptxSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
              {ptxMsg && <p className="text-xs text-green-600 mt-1">{ptxMsg}</p>}
            </div>

            {/* API reference */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1">PropTrax API endpoints</p>
              <div className="text-xs text-gray-400 space-y-0.5 font-mono">
                <p>GET /proptrax/ping</p>
                <p>GET /proptrax/buildings</p>
                <p>GET /proptrax/buildings/:id/analysis</p>
                <p>GET /proptrax/buildings/:id/issues</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Pass <code className="bg-gray-100 px-1 rounded">X-Api-Key: {'<key>'}</code> on every request.</p>
            </div>
          </div>
        </div>
      )}

      {/* Account */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Your account</h2>
        <div className="space-y-2">
          <Link href="/profile" className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">
            <span className="font-medium text-gray-800">Edit profile</span>
            <span className="text-gray-400">→</span>
          </Link>
          <div className="px-4 py-3 rounded-lg border border-gray-200 text-sm">
            <span className="text-gray-500">Signed in as</span>{' '}
            <span className="font-medium text-gray-900">{user?.email}</span>
            <span className="ml-2 text-xs text-gray-400 capitalize">({user?.role})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
