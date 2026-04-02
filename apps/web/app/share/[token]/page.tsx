'use client';

import { use, useEffect, useState } from 'react';
import { format } from 'date-fns';

export default function SharedGalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, setState] = useState<'loading' | 'password' | 'ready' | 'error'>('loading');
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shareInfo, setShareInfo] = useState<any>(null);
  const [content, setContent] = useState<any>(null);

  const base = process.env.NEXT_PUBLIC_API_URL;

  const load = async (pw?: string) => {
    const url = `${base}/share/${token}${pw ? `?password=${encodeURIComponent(pw)}` : ''}`;
    const res = await fetch(url);
    if (res.status === 401) {
      setState('password');
      return;
    }
    if (!res.ok) {
      setState('error');
      return;
    }
    const data = await res.json();
    setShareInfo(data.shareInfo);
    setContent(data.content);
    setState('ready');
  };

  useEffect(() => { load(); }, [token]);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setSubmitting(true);
    const res = await fetch(`${base}/share/${token}/validate-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (data.valid) {
      await load(password);
    } else {
      setPwError('Incorrect password.');
    }
    setSubmitting(false);
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900 mb-2">Link not found</p>
          <p className="text-sm text-gray-500">This share link may have expired or been revoked.</p>
        </div>
      </div>
    );
  }

  if (state === 'password') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl shadow p-8 w-full max-w-sm">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Protected Gallery</h1>
          <p className="text-sm text-gray-500 mb-5">Enter the password to view this shared gallery.</p>
          <form onSubmit={submitPassword} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Checking…' : 'View Gallery'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const photos: any[] = content?.photos ?? [];
  const building = content?.building;
  const project = content?.project;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {shareInfo?.title || building?.name || project?.name || 'Shared Gallery'}
              </h1>
              {shareInfo?.description && (
                <p className="text-sm text-gray-600 mt-0.5">{shareInfo.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Shared by {shareInfo?.createdBy?.firstName} {shareInfo?.createdBy?.lastName}
                {shareInfo?.createdAt && ` · ${format(new Date(shareInfo.createdAt), 'MMM d, yyyy')}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Building / Project info */}
          {(building || project) && (
            <div className="mt-4 flex gap-4 text-sm text-gray-600">
              {building && <span>🏢 {building.name}</span>}
              {project && <span>📋 {project.name}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {photos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No photos in this gallery.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((p: any) => (
              <a key={p.id} href={p.viewUrl ?? p.s3Url ?? '#'} target="_blank" rel="noreferrer" className="group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {p.viewUrl || p.thumbnailUrl ? (
                    <img
                      src={p.viewUrl ?? p.thumbnailUrl}
                      alt={p.fileName ?? 'photo'}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📷</div>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-gray-500 truncate">{p.fileName ?? p.id}</p>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-8 text-xs text-gray-400">
        Powered by FieldMind
      </div>
    </div>
  );
}
