'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function PayrollHistoryPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem('accessToken');
  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetch(`${base}/time/payroll-periods`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((d) => setPeriods(d.periods ?? []))
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (s: string) => {
    if (s === 'Submitted') return 'bg-green-100 text-green-700';
    if (s === 'Approved')  return 'bg-blue-100 text-blue-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/admin/payroll" className="hover:text-gray-900">Payroll Review</Link>
            <span>/</span>
            <span className="text-gray-900">History</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll History</h1>
          <p className="text-sm text-gray-500 mt-0.5">All payroll periods — submitted and in progress</p>
        </div>
        <Link
          href="/admin/payroll"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          Current Week →
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">No payroll periods yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Pay Period', 'Status', 'Submitted', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {periods.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {format(new Date(p.periodStart), 'MMM d')} –{' '}
                      {format(new Date(p.periodEnd), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Week of {format(new Date(p.periodStart), 'MMMM d, yyyy')}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {p.submittedAt
                      ? format(new Date(p.submittedAt), 'MMM d, yyyy h:mm a')
                      : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/payroll?week=${format(new Date(p.periodStart), 'yyyy-MM-dd')}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
