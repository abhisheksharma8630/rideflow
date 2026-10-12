'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/Shell';
import { PageHeader, Badge } from '@/components/widgets';
import { api, RideFilters } from '@/lib/api';
import { formatCurrency, formatDate, VEHICLE_EMOJI } from '@/lib/format';
import type { RideDTO } from '@/lib/types';

const STATUSES = [
  'REQUESTED',
  'SEARCHING',
  'ACCEPTED',
  'ARRIVED_AT_PICKUP',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_DRIVERS',
];

export default function RidesPage() {
  const [filters, setFilters] = useState<RideFilters>({ page: 1, pageSize: 25 });
  const [selected, setSelected] = useState<RideDTO | null>(null);

  const q = useQuery({
    queryKey: ['admin-rides', filters],
    queryFn: () => api.rides(filters),
  });

  function update(patch: Partial<RideFilters>) {
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  }

  return (
    <Shell>
      <PageHeader title="Rides" subtitle="Search and inspect every booking" />

      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Ride ID</label>
          <input
            className="input"
            placeholder="full ride id"
            onChange={(e) => update({ rideId: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Status</label>
          <select className="input" onChange={(e) => update({ status: e.target.value || undefined })}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Vehicle</label>
          <select
            className="input"
            onChange={(e) => update({ vehicleCategory: e.target.value || undefined })}
          >
            <option value="">All</option>
            <option value="BIKE">Bike</option>
            <option value="AUTO">Auto</option>
            <option value="CAB">Cab</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">From</label>
          <input type="date" className="input" onChange={(e) => update({ dateFrom: e.target.value || undefined })} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">To</label>
          <input type="date" className="input" onChange={(e) => update({ dateTo: e.target.value || undefined })} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 font-semibold">Ride</th>
              <th className="px-5 py-3 font-semibold">Route</th>
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">Driver</th>
              <th className="px-5 py-3 font-semibold">Fare</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted">Loading…</td>
              </tr>
            ) : null}
            {(q.data?.items ?? []).map((r) => (
              <tr
                key={r.id}
                className="border-b border-slate-50 hover:bg-softgrey cursor-pointer"
                onClick={() => setSelected(r)}
              >
                <td className="px-5 py-3 font-mono text-xs">
                  {VEHICLE_EMOJI[r.vehicleCategory]} #{r.id.slice(-6)}
                </td>
                <td className="px-5 py-3 max-w-[220px] truncate">
                  {r.pickupAddress} → {r.destinationAddress}
                </td>
                <td className="px-5 py-3">{r.customer?.name ?? '—'}</td>
                <td className="px-5 py-3">{r.driver?.name ?? <span className="text-muted">—</span>}</td>
                <td className="px-5 py-3 font-semibold">{formatCurrency(r.finalFare ?? r.estimatedFare)}</td>
                <td className="px-5 py-3"><Badge status={r.status} /></td>
                <td className="px-5 py-3 text-muted">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
            {q.data && q.data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted">No rides match these filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {q.data ? (
        <div className="flex items-center justify-between mt-4 text-sm text-muted">
          <span>
            {q.data.total} rides · page {q.data.page} / {q.data.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="btn btn-secondary"
              disabled={filters.page! <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
            >
              Prev
            </button>
            <button
              className="btn btn-secondary"
              disabled={!!q.data && filters.page! >= q.data.totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {selected ? <RideDrawer ride={selected} onClose={() => setSelected(null)} /> : null}
    </Shell>
  );
}

function RideDrawer({ ride, onClose }: { ride: RideDTO; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white h-full overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-charcoal">Ride #{ride.id.slice(-6)}</h2>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
        <Badge status={ride.status} />
        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Full ID" value={ride.id} mono />
          <Row label="Vehicle" value={`${VEHICLE_EMOJI[ride.vehicleCategory]} ${ride.vehicleCategory}`} />
          <Row label="Pickup" value={ride.pickupAddress} />
          <Row label="Destination" value={ride.destinationAddress} />
          <Row label="Distance" value={`~${ride.estimatedDistanceKm.toFixed(1)} km (est, no routing)`} />
          <Row label="Estimated fare" value={formatCurrency(ride.estimatedFare)} />
          <Row label="Final fare" value={ride.finalFare != null ? formatCurrency(ride.finalFare) : '—'} />
          <Row label="Payment" value={ride.payment ? `${ride.payment.method} · ${ride.payment.status}` : '—'} />
          <Row label="Customer" value={ride.customer ? `${ride.customer.name} · ${ride.customer.phone}` : '—'} />
          <Row
            label="Driver"
            value={
              ride.driver
                ? `${ride.driver.name} · ⭐${ride.driver.rating.toFixed(1)}${
                    ride.driver.vehicle ? ` · ${ride.driver.vehicle.registrationNumber}` : ''
                  }`
                : 'Unassigned'
            }
          />
          {ride.cancellationReason ? <Row label="Cancellation" value={ride.cancellationReason} /> : null}
          <Row label="Created" value={formatDate(ride.createdAt)} />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right font-medium text-charcoal ${mono ? 'font-mono text-xs break-all' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
