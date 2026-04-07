'use client';

import { useEffect, useState, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CATEGORIES = ['fuel', 'materials', 'equipment', 'meals', 'tolls', 'parking', 'other'];

interface Receipt {
  id: string;
  fileName: string;
  fileUrl: string;
  amount: number | null;
  vendor: string | null;
  category: string | null;
  description: string | null;
  receiptDate: string;
  createdAt: string;
  uploadedBy: { id: string; firstName: string; lastName: string };
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

function canUpload(role: string) {
  return role === 'Admin' || role === 'PM';
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    amount: '',
    vendor: '',
    category: 'other',
    description: '',
    buildingId: '',
    receiptDate: new Date().toISOString().split('T')[0],
  });

  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const user = getUser();
    setRole(user.role || '');
    fetchReceipts();
    fetchBuildings();
  }, []);

  const token = () => localStorage.getItem('accessToken') || '';

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/receipts?limit=50`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReceipts(data.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const res = await fetch(`${API_URL}/buildings?limit=100`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBuildings(data.data ?? []);
      }
    } catch {}
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Please select a file.'); return; }

    setUploading(true);
    setError('');
    setSuccess('');

    const fd = new FormData();
    fd.append('file', file);
    if (form.amount) fd.append('amount', form.amount);
    if (form.vendor) fd.append('vendor', form.vendor);
    fd.append('category', form.category);
    if (form.description) fd.append('description', form.description);
    if (form.buildingId) fd.append('buildingId', form.buildingId);
    fd.append('receiptDate', form.receiptDate);

    try {
      const res = await fetch(`${API_URL}/receipts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess('Receipt uploaded successfully.');
        setShowUpload(false);
        setForm({ amount: '', vendor: '', category: 'other', description: '', buildingId: '', receiptDate: new Date().toISOString().split('T')[0] });
        if (fileRef.current) fileRef.current.value = '';
        fetchReceipts();
      } else {
        setError(data.message || 'Upload failed.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this receipt?')) return;
    const res = await fetch(`${API_URL}/receipts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) fetchReceipts();
  };

  const totalAmount = receipts.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} · Total: ${totalAmount.toFixed(2)}
          </p>
        </div>
        {canUpload(role) && (
          <button
            onClick={() => { setShowUpload(true); setError(''); setSuccess(''); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            + Upload Receipt
          </button>
        )}
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
          {success}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Upload Receipt</h2>
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  required
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP or PDF · Max 10MB</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.receiptDate}
                    onChange={e => setForm(f => ({ ...f, receiptDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Store or vendor name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                  <select
                    value={form.buildingId}
                    onChange={e => setForm(f => ({ ...f, buildingId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— None —</option>
                    {buildings.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipts Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">No receipts yet</p>
          {canUpload(role) && <p className="text-sm">Click "Upload Receipt" to add one.</p>}
          {!canUpload(role) && <p className="text-sm">Only the boss or shift leader can upload receipts.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Vendor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Uploaded By</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">File</th>
                {canUpload(role) && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receipts.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(r.receiptDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.vendor || '—'}</td>
                  <td className="px-4 py-3">
                    {r.category ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                        {r.category}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {r.amount != null ? `$${Number(r.amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.uploadedBy.firstName} {r.uploadedBy.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`${API_URL}${r.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      {r.fileName.length > 20 ? r.fileName.slice(0, 20) + '…' : r.fileName}
                    </a>
                  </td>
                  {canUpload(role) && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
