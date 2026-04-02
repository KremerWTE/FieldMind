'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Stats {
  buildingCount: number;
  projectCount: number;
  photoCount: number;
  recentProjects: any[];
  recentPhotos: any[];
  activeAlerts: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    buildingCount: 0, projectCount: 0, photoCount: 0,
    recentProjects: [], recentPhotos: [], activeAlerts: [],
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}` };
    const base = process.env.NEXT_PUBLIC_API_URL;

    try {
      const [buildingsRes, projectsRes, photosRes, alertsRes] = await Promise.allSettled([
        fetch(`${base}/buildings?page=1&limit=1`, { headers }),
        fetch(`${base}/projects`, { headers }),
        fetch(`${base}/photos?limit=6`, { headers }),
        fetch(`${base}/monitoring/dashboard`, { headers }),
      ]);

      let buildingCount = 0;
      let projectCount = 0;
      let photoCount = 0;
      let recentProjects: any[] = [];
      let recentPhotos: any[] = [];
      let activeAlerts: any[] = [];

      if (buildingsRes.status === 'fulfilled' && buildingsRes.value.ok) {
        const data = await buildingsRes.value.json();
        buildingCount = data.totalCount ?? data.buildings?.length ?? 0;
      }

      if (projectsRes.status === 'fulfilled' && projectsRes.value.ok) {
        const data = await projectsRes.value.json();
        const list = Array.isArray(data) ? data : data.projects ?? [];
        projectCount = list.length;
        recentProjects = list.slice(0, 5);
      }

      if (photosRes.status === 'fulfilled' && photosRes.value.ok) {
        const data = await photosRes.value.json();
        const list = Array.isArray(data) ? data : data.photos ?? [];
        photoCount = data.totalCount ?? list.length;
        recentPhotos = list.slice(0, 6);
      }

      if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
        const data = await alertsRes.value.json();
        activeAlerts = (data.activeAlerts ?? []).slice(0, 3);
      }

      setStats({ buildingCount, projectCount, photoCount, recentProjects, recentPhotos, activeAlerts });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Buildings', value: stats.buildingCount, href: '/buildings', color: 'bg-blue-50 text-blue-700' },
    { label: 'Projects', value: stats.projectCount, href: '/projects', color: 'bg-green-50 text-green-700' },
    { label: 'Photos', value: stats.photoCount, href: '/photos', color: 'bg-purple-50 text-purple-700' },
  ];

  const quickLinks = [
    { href: '/buildings', label: 'View Buildings', desc: 'Manage properties and health scores' },
    { href: '/projects', label: 'View Projects', desc: 'Track active field projects' },
    { href: '/photos', label: 'Browse Photos', desc: 'AI-analyzed photo library' },
    { href: '/search', label: 'Search Photos', desc: 'Full-text AI annotation search' },
    { href: '/reports', label: 'Generate Reports', desc: 'Create PDF reports' },
    { href: '/shares', label: 'Share Links', desc: 'Public gallery links' },
    { href: '/time-clock', label: 'Time Clock', desc: 'Clock in / clock out' },
    { href: '/time-reports', label: 'Payroll', desc: 'Review hours and approve time' },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening on your projects.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            {loading ? (
              <div className="mt-1 h-8 w-16 bg-gray-100 animate-pulse rounded" />
            ) : (
              <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
            )}
          </Link>
        ))}
      </div>

      {/* Recent projects */}
      {stats.recentProjects.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg mb-8">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Projects</h2>
            <Link href="/projects" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentProjects.map((p: any) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.address || p.buildingName || ''}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.status === 'Active'
                      ? 'bg-green-100 text-green-700'
                      : p.status === 'Completed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {p.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active alerts */}
      {stats.activeAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-red-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-red-800">Active Alerts</h2>
            <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-medium">
              {stats.activeAlerts.length}
            </span>
          </div>
          <div className="divide-y divide-red-100">
            {stats.activeAlerts.map((a: any, i: number) => (
              <div key={a.id ?? i} className="px-5 py-3 flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  a.severity === 'Critical' ? 'bg-red-200 text-red-800' : 'bg-orange-100 text-orange-700'
                }`}>
                  {a.severity ?? 'Warning'}
                </span>
                <p className="text-sm text-red-900">{a.ruleName ?? a.message ?? a.name}</p>
                {a.triggeredAt && (
                  <span className="ml-auto text-xs text-red-500 flex-shrink-0">
                    {format(new Date(a.triggeredAt), 'h:mm a')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent photos */}
      {stats.recentPhotos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg mb-8">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Photos</h2>
            <Link href="/photos" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="p-4 grid grid-cols-6 gap-3">
            {stats.recentPhotos.map((p: any) => (
              <Link key={p.id} href={`/photos/${p.id}`} className="group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {p.thumbnailUrl || p.s3Url ? (
                    <img
                      src={p.thumbnailUrl ?? p.s3Url}
                      alt={p.fileName ?? 'photo'}
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📷</div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400 truncate">{p.buildingName ?? p.fileName ?? ''}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm hover:border-blue-200 transition-all"
          >
            <p className="text-sm font-semibold text-gray-900">{link.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
