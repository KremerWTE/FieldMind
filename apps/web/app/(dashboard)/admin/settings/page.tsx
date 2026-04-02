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

  const token = () => localStorage.getItem('accessToken');
  const h = (json = false) => ({
    Authorization: `Bearer ${token()}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  });

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/team`, { headers: h() }).then((r) => r.ok ? r.json() : null),
      fetch(`${API_URL}/profile`, { headers: h() }).then((r) => r.ok ? r.json() : null),
    ]).then(([t, u]) => {
      setTeam(t);
      setUser(u);
      setEditName(t?.name ?? '');
    }).finally(() => setLoading(false));
  }, []);

  const isAdmin = user?.role === 'Admin';

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
