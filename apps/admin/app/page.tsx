'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shell } from '@/components/Shell';
import { PageHeader, StatCard, Badge } from '@/components/widgets';
import { api } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { formatCurrency, formatDate, VEHICLE_EMOJI } from '@/lib/format';
import { SOCKET_EVENTS } from '@/lib/types';

export default function OverviewPage() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ['overview'], queryFn: () => api.overview(), refetchInterval: 10000 });
  const recent = useQuery({ queryKey: ['recent-rides'], queryFn: () => api.rides({ page: 1, pageSize: 8 }) });

  useEffect(() => {
    const socket = connectSocket();
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ['overview'] });
      void qc.invalidateQueries({ queryKey: ['recent-rides'] });
    };
    socket.on(SOCKET_EVENTS.ADMIN_RIDE_UPDATE, refresh);
    return () => {
      socket.off(SOCKET_EVENTS.ADMIN_RIDE_UPDATE, refresh);
    };
  }, [qc]);

  const o = overview.data;

  return (
    <Shell>
      <PageHeader title="Overview" subtitle="Live metrics from the operations database" />

      {o?.isDemoData ? (
        <div className="mb-5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700">
          This dataset includes seeded demonstration data. New bookings created during the demo are
          live records.
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Customers" value={o?.totalCustomers ?? '—'} />
        <StatCard label="Drivers" value={o?.totalDrivers ?? '—'} hint={`${o?.approvedDrivers ?? 0} approved`} />
        <StatCard label="Online drivers" value={o?.onlineDrivers ?? '—'} />
        <StatCard label="Active rides" value={o?.activeRides ?? '—'} accent />
        <StatCard label="Completed" value={o?.completedRides ?? '—'} />
        <StatCard label="Cancelled" value={o?.cancelledRides ?? '—'} />
        <StatCard
          label="Gross booking value"
          value={formatCurrency(o?.grossBookingValue)}
          hint="From completed rides"
        />
        <StatCard label="Data" value={o?.isDemoData ? 'Demo + live' : 'Live'} />
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-bold text-charcoal">Recent bookings</h2>
          <Link href="/rides" className="text-sm font-semibold text-brand-dark">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 font-semibold">Ride</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Driver</th>
                <th className="px-5 py-3 font-semibold">Fare</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {(recent.data?.items ?? []).map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-softgrey">
                  <td className="px-5 py-3 font-mono text-xs">
                    {VEHICLE_EMOJI[r.vehicleCategory]} #{r.id.slice(-6)}
                  </td>
                  <td className="px-5 py-3">{r.customer?.name ?? '—'}</td>
                  <td className="px-5 py-3">{r.driver?.name ?? <span className="text-muted">unassigned</span>}</td>
                  <td className="px-5 py-3 font-semibold">{formatCurrency(r.finalFare ?? r.estimatedFare)}</td>
                  <td className="px-5 py-3"><Badge status={r.status} /></td>
                  <td className="px-5 py-3 text-muted">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
              {recent.data && recent.data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted">
                    No rides yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
