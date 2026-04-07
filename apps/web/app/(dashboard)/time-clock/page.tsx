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

type Tab = 'clock' | 'timesheet';

type EditState = {
  id: string;
  clockIn: string;
  clockOut: string;
  location: string;
  notes: string;
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TimeClockPage() {
  const [tab, setTab] = useState<Tab>('clock');

  // Clock-in/out state
  const [status, setStatus] = useState<{ isClockedIn: boolean; entry: any | null }>({
    isClockedIn: false,
    entry: null,
  });
  const [location, setLocation] = useState('');
  const [locationOther, setLocationOther] = useState('');
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [lateStart, setLateStart] = useState(false);
  const [lateStartTime, setLateStartTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [clock, setClock] = useState(new Date());

  // Timesheet state
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [weekEntries, setWeekEntries] = useState<any[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekPeriod, setWeekPeriod] = useState<any>(null);

  // Edit state
  const [editing, setEditing] = useState<EditState | null>(null);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const token = () => localStorage.getItem('accessToken');
  const authH = (json = false) => ({
    Authorization: `Bearer ${token()}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  });
  const base = process.env.NEXT_PUBLIC_API_URL;

  // Tick
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Initial load
  useEffect(() => {
    fetchStatus();
    fetch(`${base}/buildings?limit=100`, { headers: authH() })
      .then(r => r.json())
      .then(d => setBuildings(d.data ?? []))
      .catch(() => {});
  }, []);

  // Load timesheet data whenever week changes or tab switches to timesheet
  useEffect(() => {
    if (tab === 'timesheet') fetchWeek();
  }, [tab, weekStart]);

  const fetchStatus = async () => {
    const res = await fetch(`${base}/time/status`, { headers: authH() });
    if (res.ok) setStatus(await res.json());
  };

  const fetchWeek = useCallback(async () => {
    setWeekLoading(true);
    const from = format(weekStart, 'yyyy-MM-dd');
    const to = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const [entriesRes, periodRes] = await Promise.all([
      fetch(`${base}/time/my-entries?from=${from}&to=${to}`, { headers: authH() }),
      fetch(`${base}/time/payroll-periods/for-date?date=${from}`, { headers: authH() }),
    ]);

    if (entriesRes.ok) {
      const d = await entriesRes.json();
      setWeekEntries(d.entries ?? []);
    }
    if (periodRes.ok) {
      setWeekPeriod(await periodRes.json());
    } else {
      setWeekPeriod(null);
    }
    setWeekLoading(false);
  }, [weekStart, base]);

  const startEdit = (e: any) => {
    const toLocal = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
    setEditError('');
    setEditing({
      id: e.id,
      clockIn: toLocal(e.clockIn),
      clockOut: e.clockOut ? toLocal(e.clockOut) : '',
      location: e.location ?? '',
      notes: e.notes ?? '',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`${base}/time/my-entries/${editing.id}`, {
        method: 'PUT',
        headers: authH(true),
        body: JSON.stringify({
          clockIn: new Date(editing.clockIn).toISOString(),
          clockOut: editing.clockOut ? new Date(editing.clockOut).toISOString() : null,
          location: editing.location,
          notes: editing.notes,
        }),
      });
      if (res.ok) {
        setEditing(null);
        await fetchWeek();
      } else {
        const d = await res.json().catch(() => ({}));
        setEditError(d.message ?? 'Failed to save changes.');
      }
    } finally {
      setEditSaving(false);
    }
  };

  const clockIn = async () => {
    const resolvedLocation = location === '__other__' ? locationOther.trim() : location.trim();
    if (!resolvedLocation) {
      setMessage({ type: 'error', text: 'Please select or enter your location.' });
      return;
    }
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const body: Record<string, unknown> = { location: resolvedLocation, notes };
      if (lateStart && lateStartTime) {
        body.clockInTime = new Date(lateStartTime).toISOString();
      }
      const res = await fetch(`${base}/time/clock-in`, {
        method: 'POST',
        headers: authH(true),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Clocked in!' });
        setNotes('');
        setLateStart(false);
        setLateStartTime('');
        await fetchStatus();
      } else {
        const d = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: d.message ?? 'Failed to clock in.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const clockOut = async () => {
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`${base}/time/clock-out`, {
        method: 'POST',
        headers: authH(true),
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Clocked out!' });
        setNotes('');
        await fetchStatus();
      } else {
        const d = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: d.message ?? 'Failed to clock out.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const elapsed = (() => {
    if (!status.isClockedIn || !status.entry) return null;
    const diff = Math.floor((clock.getTime() - new Date(status.entry.clockIn).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  })();

  // Build per-day buckets for the week grid
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const entriesByDay = weekDays.map((day) =>
    weekEntries.filter((e) => isSameDay(parseISO(e.clockIn), day))
  );
  const hoursPerDay = entriesByDay.map((dayEntries) =>
    dayEntries.reduce((sum, e) => sum + (e.durationHours ?? 0), 0)
  );
  const weekTotal = hoursPerDay.reduce((s, h) => s + h, 0);
  const today = new Date();
  const isCurrentWeek = isSameDay(
    startOfWeek(today, { weekStartsOn: 1 }),
    weekStart
  );

  const periodStatusColor = (status: string) => {
    if (status === 'Submitted') return 'bg-green-100 text-green-700';
    if (status === 'Approved') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Time</h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(clock, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['clock', 'timesheet'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'clock' ? 'Clock' : 'Timesheet'}
            </button>
          ))}
        </div>
      </div>

      {/* ── CLOCK TAB ── */}
      {tab === 'clock' && (
        <>
          {/* Live clock */}
          <div className="text-center mb-8">
            <p className="text-6xl font-mono font-bold text-gray-900 tracking-tight">
              {format(clock, 'h:mm:ss')}
              <span className="text-3xl text-gray-400 ml-2">{format(clock, 'a')}</span>
            </p>
          </div>

          {/* Status banner */}
          <div
            className={`rounded-xl border-2 p-5 mb-4 text-center ${
              status.isClockedIn ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
            }`}
          >
            <p className={`text-base font-semibold ${status.isClockedIn ? 'text-green-700' : 'text-gray-500'}`}>
              {status.isClockedIn ? '● Clocked In' : '○ Not Clocked In'}
            </p>
            {status.isClockedIn && status.entry && (
              <>
                <p className="text-sm text-green-600 mt-1">
                  Since {format(new Date(status.entry.clockIn), 'h:mm a')}
                  {status.entry.location ? ` · ${status.entry.location}` : ''}
                </p>
                <p className="text-4xl font-mono font-bold text-green-700 mt-2">{elapsed}</p>
              </>
            )}
          </div>

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

          {/* Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-8">
            {!status.isClockedIn && [0, 6].includes(clock.getDay()) && (
              <div className="mb-3 p-2.5 bg-orange-50 border border-orange-200 text-orange-700 text-sm rounded-md">
                Weekend — hours clocked today will be marked as <strong>overtime</strong>.
              </div>
            )}
            {!status.isClockedIn && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Select a location —</option>
                    {buildings.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                    <option value="__other__">Other…</option>
                  </select>
                  {location === '__other__' && (
                    <input
                      type="text"
                      value={locationOther}
                      onChange={(e) => setLocationOther(e.target.value)}
                      placeholder="Enter custom location"
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
                <div className="mb-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                    <input
                      type="checkbox"
                      checked={lateStart}
                      onChange={(e) => {
                        setLateStart(e.target.checked);
                        if (e.target.checked && !lateStartTime) {
                          // default to 30 min ago
                          const d = new Date(Date.now() - 30 * 60 * 1000);
                          setLateStartTime(format(d, "yyyy-MM-dd'T'HH:mm"));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-600">I arrived earlier — set actual start time</span>
                  </label>
                  {lateStart && (
                    <div className="mt-2">
                      <input
                        type="datetime-local"
                        value={lateStartTime}
                        max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                        onChange={(e) => setLateStartTime(e.target.value)}
                        className="px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Must be within the last 24 hours.</p>
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for this shift…"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {status.isClockedIn ? (
              <button
                onClick={clockOut}
                disabled={submitting}
                className="w-full py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                {submitting ? 'Clocking out…' : '⏹ Clock Out'}
              </button>
            ) : (
              <button
                onClick={clockIn}
                disabled={submitting}
                className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {submitting ? 'Clocking in…' : '▶ Clock In'}
              </button>
            )}
          </div>
        </>
      )}

      {/* ── TIMESHEET TAB ── */}
      {tab === 'timesheet' && (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekStart((w) => subWeeks(w, 1))}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              ← Prev
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">
                {format(weekStart, 'MMM d')} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
              </p>
              {isCurrentWeek && (
                <span className="text-xs text-blue-600 font-medium">This Week</span>
              )}
            </div>
            <button
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
              disabled={isCurrentWeek}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>

          {weekPeriod && (
            <div className="mb-4 flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${periodStatusColor(weekPeriod.status)}`}>
                {weekPeriod.status}
              </span>
              {weekPeriod.status === 'Submitted' && weekPeriod.submittedAt && (
                <span className="text-xs text-gray-500">
                  Submitted {format(new Date(weekPeriod.submittedAt), 'MMM d, h:mm a')}
                </span>
              )}
            </div>
          )}

          {weekLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              {/* Day-by-day grid */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
                <div className="grid grid-cols-8 divide-x divide-gray-100 bg-gray-50">
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Day</div>
                  {DAYS.map((d) => (
                    <div key={d} className="px-3 py-2 text-xs font-medium text-gray-500 uppercase text-center">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-8 divide-x divide-gray-100">
                  <div className="px-3 py-3 text-xs text-gray-500 flex items-center">Hours</div>
                  {hoursPerDay.map((h, i) => (
                    <div
                      key={i}
                      className={`px-3 py-3 text-center text-sm font-semibold ${
                        isSameDay(weekDays[i], today)
                          ? 'bg-blue-50 text-blue-700'
                          : h > 0
                          ? 'text-gray-900'
                          : 'text-gray-300'
                      }`}
                    >
                      {h > 0 ? `${h.toFixed(1)}h` : '—'}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6">
                <span className="text-sm font-medium text-gray-700">Week Total</span>
                <span className="text-xl font-bold text-gray-900">{weekTotal.toFixed(2)}h</span>
              </div>

              {/* Shift details per day */}
              <div className="space-y-3">
                {weekDays.map((day, i) => {
                  const dayShifts = entriesByDay[i];
                  if (dayShifts.length === 0) return null;
                  return (
                    <div key={day.toISOString()} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">
                          {format(day, 'EEEE, MMM d')}
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {hoursPerDay[i].toFixed(2)}h
                        </p>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {dayShifts.map((e: any) => {
                          const isEditing = editing !== null && editing.id === e.id;
                          const ed = editing!; // safe inside isEditing branch
                          return (
                          <div key={e.id}>
                            {isEditing ? (
                              /* ── Inline edit form ── */
                              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                                {editError && (
                                  <p className="text-xs text-red-600 mb-2">{editError}</p>
                                )}
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Clock In</label>
                                    <input
                                      type="datetime-local"
                                      value={ed.clockIn}
                                      onChange={(ev) => setEditing({ ...ed, clockIn: ev.target.value })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Clock Out</label>
                                    <input
                                      type="datetime-local"
                                      value={ed.clockOut}
                                      onChange={(ev) => setEditing({ ...ed, clockOut: ev.target.value })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    />
                                  </div>
                                </div>
                                <div className="mb-2">
                                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Location</label>
                                  <input
                                    type="text"
                                    value={ed.location}
                                    onChange={(ev) => setEditing({ ...ed, location: ev.target.value })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  />
                                </div>
                                <div className="mb-3">
                                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Notes</label>
                                  <input
                                    type="text"
                                    value={ed.notes}
                                    onChange={(ev) => setEditing({ ...ed, notes: ev.target.value })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={saveEdit}
                                    disabled={editSaving}
                                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    {editSaving ? 'Saving…' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditing(null)}
                                    className="px-3 py-1 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* ── Normal row ── */
                              <div className="px-4 py-3 flex items-center gap-4">
                                <div className="text-sm text-gray-900 font-medium w-32">
                                  {format(new Date(e.clockIn), 'h:mm a')}
                                  {' → '}
                                  {e.clockOut
                                    ? format(new Date(e.clockOut), 'h:mm a')
                                    : <span className="text-green-600">Active</span>}
                                </div>
                                <div className="text-sm font-semibold text-gray-900 w-14">
                                  {e.durationHours != null ? `${e.durationHours}h` : '—'}
                                </div>
                                <div className="text-sm text-gray-500 flex-1 truncate">{e.location}</div>
                                {e.isApproved ? (
                                  <span className="text-xs text-green-600 font-medium">✓ Approved</span>
                                ) : (
                                  <button
                                    onClick={() => startEdit(e)}
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    Edit
                                  </button>
                                )}
                                {e.notes && (
                                  <span className="text-xs text-gray-400 truncate max-w-xs">{e.notes}</span>
                                )}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {weekEntries.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">No time entries this week.</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
