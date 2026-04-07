'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { clearAuthCookie } from '@/lib/auth-cookie';

const mainNav = [
  { href: '/dashboard',  label: 'Dashboard',  icon: '▤' },
  { href: '/buildings',  label: 'Buildings',   icon: '🏢' },
  { href: '/projects',   label: 'Projects',    icon: '📋' },
  { href: '/photos',     label: 'Photos',      icon: '📷' },
  { href: '/search',     label: 'Search',      icon: '🔍' },
  { href: '/maintenance', label: 'Maintenance',  icon: '🔧' },
  { href: '/reports',    label: 'Reports',     icon: '📄' },
  { href: '/shares',     label: 'Share Links', icon: '🔗' },
  { href: '/users',      label: 'Team',        icon: '👥' },
];

const timeNav = [
  { href: '/time-clock',   label: 'My Time Clock', icon: '⏱' },
  { href: '/time-reports', label: 'Time History',  icon: '🗓' },
];

const adminNav = [
  { href: '/admin/payroll',         label: 'Payroll Review', icon: '💰' },
  { href: '/admin/payroll/history', label: 'Payroll History', icon: '📊' },
  { href: '/receipts',              label: 'Receipts',        icon: '🧾' },
  { href: '/admin/settings',        label: 'Team Settings',  icon: '⚙️' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{
    fullName?: string; firstName?: string; email?: string; role?: string;
  } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }
    const stored = localStorage.getItem('user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch { /* ignore */ } }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    clearAuthCookie();
    router.push('/login');
  };

  const isAdmin = user?.role === 'Admin' || user?.role === 'PM';

  const NavLink = ({ href, label, icon }: { href: string; label: string; icon: string }) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
          active
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <span className="text-base leading-none w-5 text-center">{icon}</span>
        {label}
      </Link>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <p className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
      {label}
    </p>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">FieldMind</h1>
          <p className="text-xs text-gray-500 mt-0.5">Property Intelligence</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
          {mainNav.map((item) => <NavLink key={item.href} {...item} />)}

          <SectionLabel label="Time" />
          {timeNav.map((item) => <NavLink key={item.href} {...item} />)}

          {isAdmin && (
            <>
              <SectionLabel label="Admin" />
              {adminNav.map((item) => <NavLink key={item.href} {...item} />)}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-4 py-3 border-t border-gray-200">
          {user && (
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.firstName || user.fullName || user.email}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Link href="/profile" className="flex-1 text-center text-xs text-gray-500 hover:text-gray-900 py-1">
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 text-center text-xs text-red-500 hover:text-red-700 py-1"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
