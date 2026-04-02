'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Photo {
  id: string;
  fileName?: string;
  s3Url?: string;
  thumbnailUrl?: string;
  aiStatus: string;
  capturedAt?: string;
  uploadedAt: string;
  buildingName?: string;
  projectName?: string;
}

type CameraStep = 'preview' | 'captured' | 'uploading' | 'done';

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ buildingId: '', projectId: '', aiStatus: '' });
  const [buildings, setBuildings] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStep, setCameraStep] = useState<CameraStep>('preview');
  const [cameraError, setCameraError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState('');
  const [camBuilding, setCamBuilding] = useState('');
  const [camProject, setCamProject] = useState('');
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Mobile fallback
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = () => localStorage.getItem('accessToken');
  const authH = (json = false) => ({
    Authorization: `Bearer ${token()}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  });
  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const h = authH();
    Promise.all([
      fetch(`${base}/buildings?limit=100`, { headers: h }).then((r) => r.json()),
      fetch(`${base}/projects`, { headers: h }).then((r) => r.json()),
    ]).then(([b, p]) => {
      setBuildings(Array.isArray(b) ? b : b.buildings ?? []);
      setProjects(Array.isArray(p) ? p : p.projects ?? []);
    });
    fetchPhotos();
  }, []);

  // Stop camera stream when modal closes
  useEffect(() => {
    if (!cameraOpen && streamRef) {
      streamRef.getTracks().forEach((t) => t.stop());
      setStreamRef(null);
    }
  }, [cameraOpen]);

  const fetchPhotos = async (f = filters) => {
    setLoading(true);
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''))
    );
    try {
      const res = await fetch(`${base}/photos?${params}`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setPhotos(Array.isArray(data) ? data : data.photos ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (updated: typeof filters) => {
    setFilters(updated);
    fetchPhotos(updated);
  };

  // ── Camera open ─────────────────────────────────────────────────
  const openCamera = async () => {
    setCameraError('');
    setUploadError('');
    setCapturedBlob(null);
    setCapturedDataUrl('');
    setCameraStep('preview');
    setCamBuilding('');
    setCamProject('');
    setCameraOpen(true);

    // Try getUserMedia (desktop + modern mobile)
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        setStreamRef(stream);
        // Attach after the modal renders
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        }, 50);
      } catch {
        // Fall back to file input
        setCameraError('Camera access denied. Use the button below to select a photo instead.');
      }
    } else {
      setCameraError('Live camera not supported in this browser. Use the button below.');
    }
  };

  const closeCamera = () => {
    setCameraOpen(false);
    setCameraStep('preview');
  };

  // ── Capture ──────────────────────────────────────────────────────
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setCapturedBlob(blob);
      setCapturedDataUrl(canvas.toDataURL('image/jpeg'));
      setCameraStep('captured');
      // Stop live stream — we have the shot
      streamRef?.getTracks().forEach((t) => t.stop());
      setStreamRef(null);
    }, 'image/jpeg', 0.92);
  };

  // Mobile file input fallback
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedBlob(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCapturedDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    setCameraStep('captured');
  };

  // ── Upload ───────────────────────────────────────────────────────
  const uploadPhoto = async () => {
    if (!capturedBlob || !camBuilding) {
      setUploadError('Please select a building before uploading.');
      return;
    }
    setCameraStep('uploading');
    setUploadError('');

    try {
      const fileName = `capture_${Date.now()}.jpg`;

      // Step 1: presign
      const presignRes = await fetch(`${base}/photos/presign-upload`, {
        method: 'POST',
        headers: authH(true),
        body: JSON.stringify({
          buildingId: camBuilding,
          projectId: camProject,
          filename: fileName,
          contentType: 'image/jpeg',
        }),
      });
      if (!presignRes.ok) throw new Error('Failed to get upload URL.');
      const { uploadUrl, photoId } = await presignRes.json();

      // Step 2: PUT to S3
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: capturedBlob,
      });
      if (!putRes.ok) throw new Error('Failed to upload to storage.');

      // Step 3: complete
      await fetch(`${base}/photos/complete-upload`, {
        method: 'POST',
        headers: authH(true),
        body: JSON.stringify({ photoId, capturedAt: new Date().toISOString() }),
      });

      setCameraStep('done');
      fetchPhotos();
    } catch (err: any) {
      setUploadError(err.message ?? 'Upload failed.');
      setCameraStep('captured');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !filters.buildingId) {
      // Need a building — open a quick building picker would be ideal,
      // but for now surface a simple alert if no building filter is active.
      if (!filters.buildingId) {
        alert('Select a building filter first, then use Upload to assign photos to that building.');
        return;
      }
    }
    for (const file of files) {
      try {
        const presignRes = await fetch(`${base}/photos/presign-upload`, {
          method: 'POST',
          headers: authH(true),
          body: JSON.stringify({
            buildingId: filters.buildingId,
            projectId: filters.projectId || undefined,
            filename: file.name,
            contentType: file.type || 'image/jpeg',
          }),
        });
        if (!presignRes.ok) continue;
        const { uploadUrl, photoId } = await presignRes.json();
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'image/jpeg' },
          body: file,
        });
        if (!putRes.ok) continue;
        await fetch(`${base}/photos/complete-upload`, {
          method: 'POST',
          headers: authH(true),
          body: JSON.stringify({ photoId, capturedAt: new Date().toISOString() }),
        });
      } catch {
        // continue with remaining files
      }
    }
    // reset input and refresh
    e.target.value = '';
    fetchPhotos();
  };

  const aiStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      Completed: 'bg-green-100 text-green-700',
      Processing: 'bg-blue-100 text-blue-700',
      Failed: 'bg-red-100 text-red-700',
      Pending: 'bg-gray-100 text-gray-600',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Photos</h1>
          <p className="text-sm text-gray-500 mt-1">{photos.length} photos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openCamera}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center gap-1.5"
          >
            <span>📷</span> Take Photo
          </button>
          <label className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-1.5">
            <span>↑</span> Upload
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filters.buildingId}
          onChange={(e) => applyFilters({ ...filters, buildingId: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All buildings</option>
          {buildings.map((b: any) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={filters.projectId}
          onChange={(e) => applyFilters({ ...filters, projectId: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All projects</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filters.aiStatus}
          onChange={(e) => applyFilters({ ...filters, aiStatus: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All AI statuses</option>
          <option value="Completed">AI Analyzed</option>
          <option value="Processing">Processing</option>
          <option value="Pending">Pending</option>
          <option value="Failed">Failed</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">No photos found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {photos.map((p) => (
            <Link key={p.id} href={`/photos/${p.id}`} className="group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                {p.thumbnailUrl || p.s3Url ? (
                  <img
                    src={p.thumbnailUrl ?? p.s3Url}
                    alt={p.fileName ?? 'photo'}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                    📷
                  </div>
                )}
                <span className={`absolute top-1.5 left-1.5 text-xs px-1.5 py-0.5 rounded font-medium ${aiStatusBadge(p.aiStatus)}`}>
                  {p.aiStatus}
                </span>
              </div>
              <div className="mt-1.5">
                <p className="text-xs font-medium text-gray-900 truncate">{p.fileName ?? p.id}</p>
                <p className="text-xs text-gray-400">
                  {p.capturedAt
                    ? format(new Date(p.capturedAt), 'MMM d, yyyy')
                    : format(new Date(p.uploadedAt), 'MMM d, yyyy')}
                </p>
                {p.buildingName && <p className="text-xs text-gray-500 truncate">{p.buildingName}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Camera Modal ── */}
      {cameraOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                {cameraStep === 'preview'   && 'Take Photo'}
                {cameraStep === 'captured'  && 'Review & Upload'}
                {cameraStep === 'uploading' && 'Uploading…'}
                {cameraStep === 'done'      && 'Upload Complete'}
              </h2>
              <button onClick={closeCamera} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {/* Preview step */}
            {cameraStep === 'preview' && (
              <div>
                {cameraError ? (
                  <div className="p-5">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md mb-4">
                      {cameraError}
                    </div>
                    <label className="block w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 text-center cursor-pointer">
                      Choose Photo from Device
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileInput}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="relative bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-h-72 object-contain"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex items-center justify-center gap-3">
                      <button
                        onClick={capturePhoto}
                        className="w-16 h-16 rounded-full bg-white border-4 border-gray-200 hover:bg-gray-50 flex items-center justify-center text-2xl shadow-lg"
                      >
                        📷
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Captured / metadata step */}
            {cameraStep === 'captured' && (
              <div>
                <img src={capturedDataUrl} alt="Captured" className="w-full max-h-64 object-contain bg-black" />
                <div className="p-5 space-y-3">
                  {uploadError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                      {uploadError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Building <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={camBuilding}
                      onChange={(e) => setCamBuilding(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a building…</option>
                      {buildings.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project (optional)</label>
                    <select
                      value={camProject}
                      onChange={(e) => setCamProject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No project</option>
                      {projects.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setCameraStep('preview'); setCapturedBlob(null); setCapturedDataUrl(''); openCamera(); }}
                      className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                    >
                      Retake
                    </button>
                    <button
                      onClick={uploadPhoto}
                      className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                      Upload Photo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Uploading */}
            {cameraStep === 'uploading' && (
              <div className="flex flex-col items-center justify-center py-12 px-5">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
                <p className="text-sm text-gray-600">Uploading photo…</p>
              </div>
            )}

            {/* Done */}
            {cameraStep === 'done' && (
              <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-base font-semibold text-gray-900 mb-1">Photo uploaded!</p>
                <p className="text-sm text-gray-500 mb-6">It's been queued for AI analysis.</p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => { setCameraStep('preview'); setCapturedBlob(null); setCapturedDataUrl(''); openCamera(); }}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                  >
                    Take Another
                  </button>
                  <button
                    onClick={closeCamera}
                    className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
