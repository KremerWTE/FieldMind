'use client';

import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function TimeReportsPage() {
  const [summary, setSummary] = useState<any[]>([]);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'summary' | 'entries'>('summary');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const today = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [userFilter, setUserFilter] = useState('');

  const token = () => localStorage.getItem('accessToken');
  const h = () => ({ Authorization: `Bearer ${token()}` });
  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    // Load user list for filter dropdown
    fetch(`${base}/users?pageSize=100`, { headers: h() })
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => {});
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    const res = await fetch(
      `${base}/time/summary?from=${dateFrom}&to=${dateTo}`,
      { headers: h() }
    );
    if (res.ok) {
      const d = await res.json();
      setSummary(d.summary ?? []);
    }
    setLoading(false);
  };

  const fetchEntries = async () => {
    setLoading(true);
    const params = new URLSearchParams({ from: dateFrom, to: dateTo });
    if (userFilter) params.set('userId', userFilter);
    const res = await fetch(`${base}/time/entries?${params}`, { headers: h() });
    if (res.ok) {
      const d = await res.json();
      setAllEntries(d.entries ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (view === 'summary') fetchSummary();
    else fetchEntries();
  }, [view, dateFrom, dateTo, userFilter]);

  const setPreset = (months: number) => {
    const d = subMonths(today, months);
    setDateFrom(format(startOfMonth(d), 'yyyy-MM-dd'));
    setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'));
  };

  const exportCsv = () => {
    if (view === 'summary') {
      const rows = [['Employee', 'Email', 'Entries', 'Total Hours']];
      for (const s of summary) {
        rows.push([s.fullName, s.email, s.entryCount, s.totalHours]);
        for (const e of s.entries ?? []) {
          rows.push([
            '',
            '',
            format(new Date(e.clockIn), 'MMM d yyyy h:mm a'),
            e.clockOut ? format(new Date(e.clockOut), 'h:mm a') : 'Active',
          ]);
        }
      }
      downloadCsv(rows, `time-summary-${dateFrom}-${dateTo}.csv`);
    } else {
      const rows = [['Employee', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Notes']];
      for (const e of allEntries) {
        rows.push([
          e.fullName,
          format(new Date(e.clockIn), 'yyyy-MM-dd'),
          format(new Date(e.clockIn), 'h:mm a'),
          e.clockOut ? format(new Date(e.clockOut), 'h:mm a') : 'Active',
          e.durationHours ?? '',
          e.location ?? '',
          e.notes ?? '',
        ]);
      }
      downloadCsv(rows, `time-entries-${dateFrom}-${dateTo}.csv`);
    }
  };

  const downloadCsv = (rows: any[][], filename: string) => {
    const csv = rows
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const grandTotal = summary.reduce((acc, s) => acc + (s.totalHours ?? 0), 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payroll & Time Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Review employee hours for payroll verification</p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div className="flex gap-2">
          {['This month', 'Last 2 months', 'Last 3 months'].map((label, i) => (
            <button
              key={label}
              onClick={() => setPreset(i)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All employees</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setView('summary')}
            className={`px-3 py-1.5 text-sm rounded-md border ${view === 'summary' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            Summary
          </button>
          <button
            onClick={() => setView('entries')}
            className={`px-3 py-1.5 text-sm rounded-md border ${view === 'entries' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            All Entries
          </button>
          <button
            onClick={exportCsv}
            disabled={view === 'summary' ? summary.length === 0 : allEntries.length === 0}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : view === 'summary' ? (
        <>
          {/* Grand total */}
          {summary.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{grandTotal.toFixed(1)}h</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500">Employees</p>
                <p className="text-2xl font-bold text-gray-900">{summary.length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500">Period</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {format(new Date(dateFrom), 'MMM d')} – {format(new Date(dateTo), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}

          {summary.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-sm text-gray-500">No completed time entries in this period.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Employee', 'Email', 'Entries', 'Total Hours', ''].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {summary.map((s: any) => (
                    <>
                      <tr
                        key={s.userId}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedUser(expandedUser === s.userId ? null : s.userId)}
                      >
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.fullName}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{s.email}</td>
                        <td className="px-5 py-3 text-sm text-gray-900">{s.entryCount}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900">{s.totalHours}h</td>
                        <td className="px-5 py-3 text-right text-xs text-blue-600">
                          {expandedUser === s.userId ? '▲ Hide' : '▼ Details'}
                        </td>
                      </tr>
                      {expandedUser === s.userId && (
                        <tr key={`${s.userId}-details`}>
                          <td colSpan={5} className="px-5 py-3 bg-gray-50">
                            <table className="min-w-full text-xs">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left pr-4 py-1">Date</th>
                                  <th className="text-left pr-4 py-1">Clock In</th>
                                  <th className="text-left pr-4 py-1">Clock Out</th>
                                  <th className="text-left pr-4 py-1">Hours</th>
                                  <th className="text-left py-1">Location</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {s.entries.map((e: any) => (
                                  <tr key={e.id}>
                                    <td className="pr-4 py-1 text-gray-900">{format(new Date(e.clockIn), 'MMM d')}</td>
                                    <td className="pr-4 py-1 text-gray-900">{format(new Date(e.clockIn), 'h:mm a')}</td>
                                    <td className="pr-4 py-1 text-gray-900">
                                      {e.clockOut ? format(new Date(e.clockOut), 'h:mm a') : '—'}
                                    </td>
                                    <td className="pr-4 py-1 text-gray-900">{e.durationHours ?? '—'}h</td>
                                    <td className="py-1 text-gray-600 truncate max-w-xs">{e.location}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* All Entries view */
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {allEntries.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No entries found.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Employee', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Notes'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allEntries.map((e: any) => (
                  <tr key={e.id} className={!e.clockOut ? 'bg-green-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{format(new Date(e.clockIn), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{format(new Date(e.clockIn), 'h:mm a')}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {e.clockOut ? format(new Date(e.clockOut), 'h:mm a') : <span className="text-green-600 font-medium">Active</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{e.durationHours != null ? `${e.durationHours}h` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">{e.location}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs">{e.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
