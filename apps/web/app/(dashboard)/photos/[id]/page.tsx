'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function PhotoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [photo, setPhoto] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activePanel, setActivePanel] = useState<'ai' | 'metadata' | 'comments' | 'tasks'>('ai');

  const token = () => localStorage.getItem('accessToken');
  const h = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });
  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const load = async () => {
      const [photoRes, tasksRes] = await Promise.all([
        fetch(`${base}/photos/${id}`, { headers: h() }),
        fetch(`${base}/photos/${id}/tasks`, { headers: h() }),
      ]);
      if (photoRes.ok) {
        const data = await photoRes.json();
        setPhoto(data);
        // Notes may be included in photo detail
        if (data.notes) setNotes(Array.isArray(data.notes) ? data.notes : []);
      }
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(Array.isArray(data) ? data : data.tasks ?? []);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/photos/${id}/notes`, {
        method: 'POST',
        headers: h(),
        body: JSON.stringify({ content: newNote }),
      });
      if (res.ok) {
        const note = await res.json();
        setNotes((prev) => [...prev, note]);
        setNewNote('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (!photo) return <div className="p-8 text-gray-500">Photo not found.</div>;

  const aiAnnotations: any[] = photo.aiAnnotations ?? photo.annotations ?? [];
  const maxSeverity = aiAnnotations.length
    ? Math.max(...aiAnnotations.map((a: any) => a.severityScore ?? 0))
    : null;

  const severityColor = (score: number) => {
    if (score >= 8) return 'text-red-600 bg-red-50';
    if (score >= 5) return 'text-orange-600 bg-orange-50';
    if (score >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const panelTabs = [
    { key: 'ai', label: `AI Analysis${aiAnnotations.length ? ` (${aiAnnotations.length})` : ''}` },
    { key: 'metadata', label: 'Metadata' },
    { key: 'comments', label: `Comments${notes.length ? ` (${notes.length})` : ''}` },
    { key: 'tasks', label: `Tasks${tasks.length ? ` (${tasks.length})` : ''}` },
  ] as const;

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/photos" className="hover:text-gray-900">Photos</Link>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-xs">{photo.fileName ?? id}</span>
      </div>

      <div className="flex gap-8">
        {/* Photo */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-100 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
            {photo.s3Url || photo.thumbnailUrl ? (
              <img
                src={photo.s3Url ?? photo.thumbnailUrl}
                alt={photo.fileName ?? 'photo'}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-gray-400 text-4xl">📷</span>
            )}
          </div>

          {/* Status bar */}
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                photo.aiStatus === 'Completed'
                  ? 'bg-green-100 text-green-700'
                  : photo.aiStatus === 'Processing'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              AI: {photo.aiStatus}
            </span>
            {maxSeverity != null && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor(maxSeverity)}`}>
                Max severity: {maxSeverity}/10
              </span>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-96 flex-shrink-0">
          {/* Panel tabs */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex gap-4">
              {panelTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActivePanel(t.key)}
                  className={`py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activePanel === t.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* AI Analysis */}
          {activePanel === 'ai' && (
            <div className="space-y-3">
              {aiAnnotations.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {photo.aiStatus === 'Completed'
                    ? 'No issues detected.'
                    : 'AI analysis not yet complete.'}
                </p>
              ) : (
                aiAnnotations.map((a: any, i: number) => (
                  <div key={a.id ?? i} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">{a.category ?? a.issueType ?? 'Issue'}</p>
                      {a.severityScore != null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${severityColor(a.severityScore)}`}>
                          {a.severityScore}/10
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-xs text-gray-600 mt-1">{a.description}</p>
                    )}
                    {a.recommendation && (
                      <div className="mt-2 bg-blue-50 rounded p-2">
                        <p className="text-xs text-blue-700">
                          <strong>Recommendation:</strong> {a.recommendation}
                        </p>
                      </div>
                    )}
                    {a.confidence != null && (
                      <p className="text-xs text-gray-400 mt-1">Confidence: {Math.round(a.confidence * 100)}%</p>
                    )}
                  </div>
                ))
              )}
              {photo.aiSummary && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-700 mb-1">AI Summary</p>
                  <p className="text-sm text-gray-700">{photo.aiSummary}</p>
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          {activePanel === 'metadata' && (
            <dl className="space-y-2.5">
              {[
                ['File Name', photo.fileName],
                ['S3 Key', photo.s3Key],
                ['Content Type', photo.contentType],
                ['File Size', photo.fileSize ? `${(photo.fileSize / 1024).toFixed(1)} KB` : null],
                ['Dimensions', photo.width && photo.height ? `${photo.width} × ${photo.height}` : null],
                ['Building', photo.buildingName],
                ['Project', photo.projectName],
                ['Folder', photo.folderName],
                ['Captured At', photo.capturedAt ? format(new Date(photo.capturedAt), 'MMM d, yyyy h:mm a') : null],
                ['Uploaded At', photo.uploadedAt ? format(new Date(photo.uploadedAt), 'MMM d, yyyy h:mm a') : null],
                ['Uploaded By', photo.uploadedByName ?? photo.uploadedBy?.fullName],
                ['Latitude', photo.geoLat],
                ['Longitude', photo.geoLng],
                ['Camera Make', photo.cameraMake],
                ['Camera Model', photo.cameraModel],
                ['Orientation', photo.orientation],
                ['Maintenance Event', photo.maintenanceEventId],
                ['AI Status', photo.aiStatus],
                ['AI Processed At', photo.aiProcessedAt ? format(new Date(photo.aiProcessedAt), 'MMM d, yyyy h:mm a') : null],
              ]
                .filter(([, v]) => v != null)
                .map(([label, value]) => (
                  <div key={label as string} className="flex justify-between gap-4">
                    <dt className="text-xs text-gray-500 flex-shrink-0">{label}</dt>
                    <dd className="text-xs font-medium text-gray-900 text-right break-all">{value as string}</dd>
                  </div>
                ))}
            </dl>
          )}

          {/* Comments */}
          {activePanel === 'comments' && (
            <div className="flex flex-col h-full">
              <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-sm text-gray-500">No comments yet. Add the first one.</p>
                ) : (
                  notes.map((n: any, i: number) => (
                    <div key={n.id ?? i} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-900">
                          {n.userName ?? n.user?.fullName ?? 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {n.createdAt ? format(new Date(n.createdAt), 'MMM d, h:mm a') : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{n.content ?? n.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment */}
              <div className="mt-auto">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a comment…"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={addNote}
                  disabled={submitting || !newNote.trim()}
                  className="mt-2 w-full py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Posting…' : 'Post Comment'}
                </button>
              </div>
            </div>
          )}

          {/* Tasks */}
          {activePanel === 'tasks' && (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-500">No tasks assigned to this photo.</p>
              ) : (
                tasks.map((t: any, i: number) => (
                  <div key={t.id ?? i} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${
                        t.status === 'Done' ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`} />
                      <div>
                        <p className={`text-sm font-medium ${t.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {t.title ?? t.description}
                        </p>
                        {t.assigneeName && (
                          <p className="text-xs text-gray-500 mt-0.5">Assigned to: {t.assigneeName}</p>
                        )}
                        {t.dueDate && (
                          <p className="text-xs text-gray-500">Due: {format(new Date(t.dueDate), 'MMM d, yyyy')}</p>
                        )}
                      </div>
                      <span className={`ml-auto text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                        t.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
