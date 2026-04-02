'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderPhotos, setFolderPhotos] = useState<any[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  const token = () => localStorage.getItem('accessToken');
  const h = () => ({ Authorization: `Bearer ${token()}` });
  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const load = async () => {
      const [projRes, foldersRes] = await Promise.all([
        fetch(`${base}/projects/${id}`, { headers: h() }),
        fetch(`${base}/projects/${id}/folders`, { headers: h() }),
      ]);
      if (projRes.ok) setProject(await projRes.json());
      if (foldersRes.ok) {
        const data = await foldersRes.json();
        setFolders(Array.isArray(data) ? data : data.folders ?? []);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const loadFolderPhotos = async (folderId: string) => {
    setSelectedFolder(folderId);
    setPhotosLoading(true);
    const res = await fetch(`${base}/photos?folderId=${folderId}`, { headers: h() });
    if (res.ok) {
      const data = await res.json();
      setFolderPhotos(Array.isArray(data) ? data : data.photos ?? []);
    }
    setPhotosLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!project) return <div className="p-8 text-gray-500">Project not found.</div>;

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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/projects" className="hover:text-gray-900">Projects</Link>
          <span>/</span>
          <span className="text-gray-900">{project.name}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-gray-500 mt-1">{project.description}</p>
            )}
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusBadge(project.status)}`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          ['Building', project.buildingName, project.buildingId ? `/buildings/${project.buildingId}` : null],
          ['Created', project.createdAt ? format(new Date(project.createdAt), 'MMM d, yyyy') : '—', null],
          ['Folders', folders.length, null],
        ].map(([label, value, href]) => (
          <div key={label as string} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">{label}</p>
            {href ? (
              <Link href={href as string} className="text-sm font-semibold text-blue-600 hover:underline mt-1 block">
                {value ?? '—'}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-gray-900 mt-1">{value ?? '—'}</p>
            )}
          </div>
        ))}
      </div>

      {/* Folders + Photos */}
      <div className="flex gap-6">
        {/* Folder list */}
        <div className="w-56 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Folders</h2>
          {folders.length === 0 ? (
            <p className="text-xs text-gray-500">No folders yet.</p>
          ) : (
            <ul className="space-y-1">
              {folders.map((f: any) => (
                <li key={f.id}>
                  <button
                    onClick={() => loadFolderPhotos(f.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedFolder === f.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    📁 {f.name}
                    {f.photoCount != null && (
                      <span className="ml-1 text-xs text-gray-400">({f.photoCount})</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Photo grid */}
        <div className="flex-1">
          {!selectedFolder ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center">
              <p className="text-sm text-gray-500">Select a folder to view photos.</p>
            </div>
          ) : photosLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : folderPhotos.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center">
              <p className="text-sm text-gray-500">No photos in this folder.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {folderPhotos.map((p: any) => (
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
      </div>
    </div>
  );
}
