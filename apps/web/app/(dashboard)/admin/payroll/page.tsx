'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
} from 'date-fns';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Entry {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  clockIn: string;
  clockOut: string | null;
  location: string;
  notes: string | null;
  isApproved: boolean;
  durationHours: number | null;
}

interface EmployeeSummary {
  userId: string;
  fullName: string;
  email: string;
  totalHours: number;
  entryCount: number;
  approvedCount: number;
  entries: Entry[];
}

interface PayrollPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: 'Draft' | 'Approved' | 'Submitted';
  submittedAt: string | null;
  submittedById: string | null;
}

type EditState = { entryId: string; clockIn: string; clockOut: string; location: string; notes: string };

export default function AdminPayrollPage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [summary, setSummary] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<EditState | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const token = () => localStorage.getItem('accessToken');
  const authH = (json = false) => ({
    Authorization: `Bearer ${token()}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  });
  const base = process.env.NEXT_PUBLIC_API_URL;

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const from = format(weekStart, 'yyyy-MM-dd');
  const to = format(weekEnd, 'yyyy-MM-dd');

  const loadWeek = useCallback(async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    setExpandedUser(null);
    setEditEntry(null);

    // Load or create the period + load summary in parallel
    const [periodRes, summaryRes] = await Promise.all([
      fetch(`${base}/time/payroll-periods/get-or-create`, {
        method: 'POST',
        headers: authH(true),
        body: JSON.stringify({ periodStart: weekStart.toISOString() }),
      }),
      fetch(`${base}/time/summary?from=${from}&to=${to}`, { headers: authH() }),
    ]);

    if (periodRes.ok) setPeriod(await periodRes.json());
    if (summaryRes.ok) {
      const d = await summaryRes.json();
      setSummary(d.summary ?? []);
    }
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  // ── Period actions ─────────────────────────────────────────────────────────

  const approvePeriod = async () => {
    if (!period) return;
    setActionLoading('approve');
    const res = await fetch(`${base}/time/payroll-periods/${period.id}/approve`, {
      method: 'POST', headers: authH(),
    });
    if (res.ok) {
      setPeriod(await res.json());
      setMessage({ type: 'success', text: 'Period approved.' });
    }
    setActionLoading('');
  };

  const submitPeriod = async () => {
    if (!period) return;
    setActionLoading('submit');
    setConfirmSubmit(false);
    const res = await fetch(`${base}/time/payroll-periods/${period.id}/submit`, {
      method: 'POST', headers: authH(),
    });
    if (res.ok) {
      setPeriod(await res.json());
      setMessage({ type: 'success', text: 'Payroll submitted successfully!' });
    } else {
      const d = await res.json().catch(() => ({}));
      setMessage({ type: 'error', text: d.message ?? 'Failed to submit.' });
    }
    setActionLoading('');
  };

  const reopenPeriod = async () => {
    if (!period) return;
    setActionLoading('reopen');
    const res = await fetch(`${base}/time/payroll-periods/${period.id}/reopen`, {
      method: 'POST', headers: authH(),
    });
    if (res.ok) {
      setPeriod(await res.json());
      setMessage({ type: 'success', text: 'Period reopened.' });
    }
    setActionLoading('');
  };

  // ── Entry actions ─────────────────────────────────────────────────────────

  const approveEntry = async (entryId: string) => {
    const res = await fetch(`${base}/time/entries/${entryId}/approve`, {
      method: 'POST', headers: authH(),
    });
    if (res.ok) {
      const updated: Entry = await res.json();
      setSummary((prev) =>
        prev.map((s) => ({
          ...s,
          entries: s.entries.map((e) => (e.id === entryId ? { ...e, isApproved: updated.isApproved } : e)),
          approvedCount: s.entries.filter((e) => (e.id === entryId ? updated.isApproved : e.isApproved)).length,
        }))
      );
    }
  };

  const startEditEntry = (e: Entry) => {
    setEditEntry({
      entryId: e.id,
      clockIn: format(new Date(e.clockIn), "yyyy-MM-dd'T'HH:mm"),
      clockOut: e.clockOut ? format(new Date(e.clockOut), "yyyy-MM-dd'T'HH:mm") : '',
      location: e.location,
      notes: e.notes ?? '',
    });
  };

  const saveEditEntry = async () => {
    if (!editEntry) return;
    const res = await fetch(`${base}/time/entries/${editEntry.entryId}`, {
      method: 'PUT',
      headers: authH(true),
      body: JSON.stringify({
        clockIn: new Date(editEntry.clockIn).toISOString(),
        clockOut: editEntry.clockOut ? new Date(editEntry.clockOut).toISOString() : null,
        location: editEntry.location,
        notes: editEntry.notes || null,
      }),
    });
    if (res.ok) {
      const updated: Entry = await res.json();
      setSummary((prev) =>
        prev.map((s) => ({
          ...s,
          entries: s.entries.map((e) => (e.id === editEntry.entryId ? { ...e, ...updated } : e)),
          totalHours: s.entries
            .map((e) => (e.id === editEntry.entryId ? updated : e))
            .reduce((sum, e) => sum + (e.durationHours ?? 0), 0),
        }))
      );
      setEditEntry(null);
    }
  };

  const deleteEntry = async (entryId: string, userId: string) => {
    if (!confirm('Delete this time entry?')) return;
    const res = await fetch(`${base}/time/entries/${entryId}`, {
      method: 'DELETE', headers: authH(),
    });
    if (res.ok) {
      setSummary((prev) =>
        prev
          .map((s) =>
            s.userId !== userId
              ? s
              : {
                  ...s,
                  entries: s.entries.filter((e) => e.id !== entryId),
                  entryCount: s.entryCount - 1,
                  totalHours: s.entries
                    .filter((e) => e.id !== entryId)
                    .reduce((sum, e) => sum + (e.durationHours ?? 0), 0),
                }
          )
          .filter((s) => s.entries.length > 0)
      );
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const grandTotal = summary.reduce((sum, s) => sum + s.totalHours, 0);
  const isLocked = period?.status === 'Submitted';
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const hoursForUserDay = (emp: EmployeeSummary, day: Date) =>
    emp.entries
      .filter((e) => e.clockOut && isSameDay(parseISO(e.clockIn), day))
      .reduce((sum, e) => sum + (e.durationHours ?? 0), 0);

  const statusColor = (s: string) => {
    if (s === 'Submitted') return 'bg-green-100 text-green-700 border-green-200';
    if (s === 'Approved')  return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  };

  const isCurrentWeek = isSameDay(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    weekStart
  );

  return (
    <div className="p-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Review</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and submit weekly timesheets</p>
        </div>

        {/* Status + actions */}
        {period && (
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${statusColor(period.status)}`}>
              {period.status}
            </span>

            {period.status === 'Draft' && !isLocked && (
              <button
                onClick={approvePeriod}
                disabled={!!actionLoading}
                className="px-4 py-2 text-sm font-medium border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                {actionLoading === 'approve' ? '…' : 'Approve Period'}
              </button>
            )}
            {period.status === 'Approved' && (
              <>
                <button
                  onClick={reopenPeriod}
                  disabled={!!actionLoading}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Reopen
                </button>
                <button
                  onClick={() => setConfirmSubmit(true)}
                  disabled={!!actionLoading}
                  className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === 'submit' ? 'Submitting…' : 'Submit to Payroll'}
                </button>
              </>
            )}
            {period.status === 'Submitted' && period.submittedAt && (
              <p className="text-xs text-gray-500">
                Submitted {format(new Date(period.submittedAt), 'MMM d, h:mm a')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Confirm submit dialog ── */}
      {confirmSubmit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Submit to Payroll?</h2>
            <p className="text-sm text-gray-600 mb-1">
              You are about to submit the week of{' '}
              <strong>{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}</strong> to payroll.
            </p>
            <p className="text-sm text-gray-600 mb-5">
              <strong>Total:</strong> {grandTotal.toFixed(2)}h across {summary.length} employee{summary.length !== 1 ? 's' : ''}.
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmSubmit(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitPeriod}
                className="px-4 py-2 text-sm bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Message ── */}
      {message.text && (
        <div
          className={`mb-4 p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Week nav + stats row ── */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
        >
          ← Prev
        </button>
        <div className="text-center flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </p>
          {isCurrentWeek && <p className="text-xs text-blue-600">Current Week</p>}
        </div>
        <button
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
        >
          Next →
        </button>

        {/* Stat pills */}
        <div className="ml-4 flex gap-3">
          {[
            { label: 'Total Hours', value: `${grandTotal.toFixed(1)}h` },
            { label: 'Employees', value: summary.length },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-base font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main table ── */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : summary.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">No time entries for this week.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid bg-gray-50 border-b border-gray-200" style={{ gridTemplateColumns: '220px repeat(7, 1fr) 80px 100px 48px' }}>
            <div className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Employee</div>
            {DAYS.map((d) => (
              <div key={d} className="px-2 py-2.5 text-xs font-semibold text-gray-500 uppercase text-center">{d}</div>
            ))}
            <div className="px-2 py-2.5 text-xs font-semibold text-gray-500 uppercase text-center">Total</div>
            <div className="px-2 py-2.5 text-xs font-semibold text-gray-500 uppercase text-center">Approved</div>
            <div />
          </div>

          {summary.map((emp) => {
            const isExpanded = expandedUser === emp.userId;
            const allApproved = emp.entries.every((e) => e.isApproved);

            return (
              <div key={emp.userId} className="border-b border-gray-100 last:border-b-0">
                {/* Employee row */}
                <div
                  className="grid hover:bg-gray-50 cursor-pointer"
                  style={{ gridTemplateColumns: '220px repeat(7, 1fr) 80px 100px 48px' }}
                  onClick={() => setExpandedUser(isExpanded ? null : emp.userId)}
                >
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{emp.fullName}</p>
                    <p className="text-xs text-gray-500">{emp.email}</p>
                  </div>
                  {weekDays.map((day) => {
                    const h = hoursForUserDay(emp, day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`px-2 py-3 text-center text-sm font-medium ${
                          isSameDay(day, new Date()) ? 'bg-blue-50' : ''
                        } ${h > 0 ? 'text-gray-900' : 'text-gray-300'}`}
                      >
                        {h > 0 ? `${h.toFixed(1)}` : '—'}
                      </div>
                    );
                  })}
                  <div className="px-2 py-3 text-center text-sm font-bold text-gray-900">
                    {emp.totalHours.toFixed(1)}h
                  </div>
                  <div className="px-2 py-3 flex items-center justify-center">
                    {allApproved ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">All ✓</span>
                    ) : (
                      <span className="text-xs text-gray-500">{emp.approvedCount}/{emp.entryCount}</span>
                    )}
                  </div>
                  <div className="px-2 py-3 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded: shift details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500">
                          <th className="text-left py-1 pr-4 font-medium">Date</th>
                          <th className="text-left py-1 pr-4 font-medium">Clock In</th>
                          <th className="text-left py-1 pr-4 font-medium">Clock Out</th>
                          <th className="text-left py-1 pr-4 font-medium">Hours</th>
                          <th className="text-left py-1 pr-4 font-medium">Location</th>
                          <th className="text-left py-1 pr-4 font-medium">Notes</th>
                          <th className="text-right py-1 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {emp.entries.map((e) => (
                          <tr key={e.id} className={e.isApproved ? 'bg-green-50/50' : ''}>
                            {editEntry?.entryId === e.id ? (
                              /* ── Inline edit row ── */
                              <td colSpan={7} className="py-2">
                                <div className="flex flex-wrap gap-2 items-end">
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-0.5">Clock In</label>
                                    <input
                                      type="datetime-local"
                                      value={editEntry.clockIn}
                                      onChange={(ev) => setEditEntry({ ...editEntry, clockIn: ev.target.value })}
                                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-0.5">Clock Out</label>
                                    <input
                                      type="datetime-local"
                                      value={editEntry.clockOut}
                                      onChange={(ev) => setEditEntry({ ...editEntry, clockOut: ev.target.value })}
                                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-36">
                                    <label className="block text-xs text-gray-500 mb-0.5">Location</label>
                                    <input
                                      type="text"
                                      value={editEntry.location}
                                      onChange={(ev) => setEditEntry({ ...editEntry, location: ev.target.value })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-36">
                                    <label className="block text-xs text-gray-500 mb-0.5">Notes</label>
                                    <input
                                      type="text"
                                      value={editEntry.notes}
                                      onChange={(ev) => setEditEntry({ ...editEntry, notes: ev.target.value })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={saveEditEntry}
                                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditEntry(null)}
                                      className="px-3 py-1 border border-gray-300 text-xs rounded hover:bg-white"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </td>
                            ) : (
                              /* ── Normal row ── */
                              <>
                                <td className="py-2 pr-4 text-gray-900">
                                  {format(parseISO(e.clockIn), 'EEE, MMM d')}
                                </td>
                                <td className="py-2 pr-4 text-gray-900">
                                  {format(parseISO(e.clockIn), 'h:mm a')}
                                </td>
                                <td className="py-2 pr-4 text-gray-900">
                                  {e.clockOut
                                    ? format(parseISO(e.clockOut), 'h:mm a')
                                    : <span className="text-green-600 font-medium">Active</span>}
                                </td>
                                <td className="py-2 pr-4 font-semibold text-gray-900">
                                  {e.durationHours != null ? `${e.durationHours}h` : '—'}
                                  {e.isOvertime && (
                                    <span className="ml-1.5 px-1 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">OT</span>
                                  )}
                                </td>
                                <td className="py-2 pr-4 text-gray-600 max-w-[180px] truncate">{e.location}</td>
                                <td className="py-2 pr-4 text-gray-500 max-w-[140px] truncate">{e.notes ?? '—'}</td>
                                <td className="py-2 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {/* Approve toggle */}
                                    {!isLocked && (
                                      <button
                                        onClick={() => approveEntry(e.id)}
                                        title={e.isApproved ? 'Unapprove' : 'Approve'}
                                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                          e.isApproved
                                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'
                                        }`}
                                      >
                                        {e.isApproved ? '✓ Approved' : 'Approve'}
                                      </button>
                                    )}
                                    {!isLocked && (
                                      <button
                                        onClick={() => startEditEntry(e)}
                                        className="text-xs text-blue-600 hover:underline"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    {!isLocked && (
                                      <button
                                        onClick={() => deleteEntry(e.id, emp.userId)}
                                        className="text-xs text-red-500 hover:text-red-700"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Employee sub-total */}
                    <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-sm">
                      <span className="text-gray-500">
                        {emp.approvedCount}/{emp.entryCount} entries approved
                      </span>
                      <span className="font-bold text-gray-900">
                        Subtotal: {emp.totalHours.toFixed(2)}h
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Footer totals row */}
          <div
            className="grid bg-gray-50 border-t-2 border-gray-200"
            style={{ gridTemplateColumns: '220px repeat(7, 1fr) 80px 100px 48px' }}
          >
            <div className="px-4 py-3 text-sm font-bold text-gray-900">Grand Total</div>
            {weekDays.map((day) => {
              const dayTotal = summary.reduce((sum, emp) => sum + hoursForUserDay(emp, day), 0);
              return (
                <div
                  key={day.toISOString()}
                  className={`px-2 py-3 text-center text-sm font-bold ${dayTotal > 0 ? 'text-gray-900' : 'text-gray-300'}`}
                >
                  {dayTotal > 0 ? `${dayTotal.toFixed(1)}` : '—'}
                </div>
              );
            })}
            <div className="px-2 py-3 text-center text-sm font-bold text-gray-900">
              {grandTotal.toFixed(1)}h
            </div>
            <div />
            <div />
          </div>
        </div>
      )}

      {/* ── Locked notice ── */}
      {isLocked && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✓ This payroll period has been submitted and is locked. No further edits are allowed.
        </div>
      )}
    </div>
  );
}
