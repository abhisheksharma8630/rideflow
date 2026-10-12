'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shell } from '@/components/Shell';
import { PageHeader, Badge } from '@/components/widgets';
import { api } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { formatCurrency, formatDate, VEHICLE_EMOJI } from '@/lib/format';
import { SOCKET_EVENTS } from '@/lib/types';

const ACTIVE = ['REQUESTED', 'SEARCHING', 'ACCEPTED', 'ARRIVED_AT_PICKUP', 'IN_PROGRESS'];

export default function LivePage() {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  // Fetch active rides by querying each active status is overkill; we fetch recent
  // and filter client-side, refreshing on every admin socket event.
  const q = useQuery({
    queryKey: ['live-rides'],
    queryFn: () => api.rides({ page: 1, pageSize: 50 }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const socket = connectSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onUpdate = (r: { id: string; status: string }) => {
      setLastEvent(`${new Date().toLocaleTimeString('en-IN')} · ride #${r.id.slice(-6)} → ${r.status}`);
      void qc.invalidateQueries({ queryKey: ['live-rides'] });
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SOCKET_EVENTS.ADMIN_RIDE_UPDATE, onUpdate);
    if (socket.connected) setConnected(true);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.ADMIN_RIDE_UPDATE, onUpdate);
    };
  }, [qc]);

  const activeRides = (q.data?.items ?? []).filter((r) => ACTIVE.includes(r.status));

  return (
    <Shell>
      <PageHeader title="Live operations" subtitle="Active rides and real-time status changes">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? 'bg-success' : 'bg-slate-300'}`}
          />
          <span className="text-muted">{connected ? 'Realtime connected' : 'Connecting…'}</span>
        </div>
      </PageHeader>

      {lastEvent ? (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
          Last event: {lastEvent}
        </div>
      ) : null}

      <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700">
        Map markers require a configured map provider. This operations view shows a live ride table
        and remains fully functional without map credentials.
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 font-semibold">Ride</th>
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">Driver</th>
              <th className="px-5 py-3 font-semibold">Route</th>
              <th className="px-5 py-3 font-semibold">Fare</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Since</th>
            </tr>
          </thead>
          <tbody>
            {activeRides.map((r) => (
              <tr key={r.id} className="border-b border-slate-50">
                <td className="px-5 py-3 font-mono text-xs">
                  {VEHICLE_EMOJI[r.vehicleCategory]} #{r.id.slice(-6)}
                </td>
                <td className="px-5 py-3">{r.customer?.name ?? '—'}</td>
                <td className="px-5 py-3">{r.driver?.name ?? <span className="text-muted">finding…</span>}</td>
                <td className="px-5 py-3 max-w-[220px] truncate">
                  {r.pickupAddress} → {r.destinationAddress}
                </td>
                <td className="px-5 py-3 font-semibold">{formatCurrency(r.estimatedFare)}</td>
                <td className="px-5 py-3"><Badge status={r.status} /></td>
                <td className="px-5 py-3 text-muted">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
            {activeRides.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted">
                  No active rides right now. Create a booking from the customer app to see it appear
                  here live.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
