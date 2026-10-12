'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shell } from '@/components/Shell';
import { PageHeader, Badge } from '@/components/widgets';
import { api } from '@/lib/api';
import { VEHICLE_EMOJI } from '@/lib/format';
import type { DriverRow } from '@/lib/types';

export default function DriversPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<{ driver: DriverRow; action: string; run: () => Promise<unknown> } | null>(
    null,
  );

  const q = useQuery({ queryKey: ['admin-drivers', search], queryFn: () => api.drivers(search) });

  const mutation = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-drivers'] });
      setConfirm(null);
    },
  });

  return (
    <Shell>
      <PageHeader title="Drivers" subtitle="Approvals, suspensions and fleet status">
        <input
          className="input w-64"
          placeholder="Search name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </PageHeader>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 font-semibold">Driver</th>
              <th className="px-5 py-3 font-semibold">Vehicle</th>
              <th className="px-5 py-3 font-semibold">Approval</th>
              <th className="px-5 py-3 font-semibold">Availability</th>
              <th className="px-5 py-3 font-semibold">Trips</th>
              <th className="px-5 py-3 font-semibold">Rating</th>
              <th className="px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(q.data?.items ?? []).map((d) => (
              <tr key={d.id} className="border-b border-slate-50">
                <td className="px-5 py-3">
                  <div className="font-semibold text-charcoal">{d.user.name}</div>
                  <div className="text-xs text-muted">{d.user.phone}</div>
                </td>
                <td className="px-5 py-3">
                  {d.vehicle ? (
                    <span>
                      {VEHICLE_EMOJI[d.vehicle.category]} {d.vehicle.model}
                      <span className="block text-xs text-muted">{d.vehicle.registrationNumber}</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-5 py-3"><Badge status={d.approvalStatus} /></td>
                <td className="px-5 py-3"><Badge status={d.availabilityStatus} /></td>
                <td className="px-5 py-3">{d.totalTrips}</td>
                <td className="px-5 py-3">⭐ {d.rating.toFixed(1)}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    {d.approvalStatus !== 'APPROVED' ? (
                      <button
                        className="btn btn-success"
                        onClick={() =>
                          setConfirm({
                            driver: d,
                            action: 'approve',
                            run: () => api.setApproval(d.id, 'APPROVED'),
                          })
                        }
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        className="btn btn-danger"
                        onClick={() =>
                          setConfirm({
                            driver: d,
                            action: 'suspend approval for',
                            run: () => api.setApproval(d.id, 'SUSPENDED'),
                          })
                        }
                      >
                        Suspend
                      </button>
                    )}
                    {d.user.status === 'ACTIVE' ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() =>
                          setConfirm({
                            driver: d,
                            action: 'disable account for',
                            run: () => api.setDriverStatus(d.id, 'SUSPENDED'),
                          })
                        }
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        onClick={() =>
                          setConfirm({
                            driver: d,
                            action: 'reactivate account for',
                            run: () => api.setDriverStatus(d.id, 'ACTIVE'),
                          })
                        }
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {q.data && q.data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted">No drivers found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {confirm ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40" onClick={() => setConfirm(null)}>
          <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-charcoal mb-2">Confirm action</h3>
            <p className="text-sm text-muted mb-5">
              Are you sure you want to <span className="font-semibold">{confirm.action}</span>{' '}
              <span className="font-semibold">{confirm.driver.user.name}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(confirm.run)}
              >
                {mutation.isPending ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
