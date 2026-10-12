'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, clearToken, getToken } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

const NAV = [
  { href: '/', label: 'Overview', icon: '📊' },
  { href: '/rides', label: 'Rides', icon: '🧾' },
  { href: '/live', label: 'Live ops', icon: '📡' },
  { href: '/drivers', label: 'Drivers', icon: '🧑‍✈️' },
  { href: '/customers', label: 'Customers', icon: '👥' },
  { href: '/fares', label: 'Fares', icon: '💲' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    api
      .me()
      .then((u) => {
        if (u.role !== 'ADMIN') {
          clearToken();
          router.replace('/login');
          return;
        }
        setUser(u);
      })
      .catch(() => {
        clearToken();
        router.replace('/login');
      })
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center text-muted">Loading dashboard…</div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-charcoal text-white hidden md:flex flex-col">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
          <div className="h-8 w-8 rounded-lg bg-brand grid place-items-center font-black text-charcoal text-sm">
            RF
          </div>
          <span className="font-extrabold">RideFlow</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? 'bg-brand text-charcoal' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <span>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 text-xs text-white/50 border-t border-white/10">
          Demo build · operations panel
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="md:hidden font-extrabold text-charcoal">RideFlow</div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-charcoal">{user.name}</p>
              <p className="text-xs text-muted">Administrator</p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => {
                clearToken();
                router.replace('/login');
              }}
            >
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
