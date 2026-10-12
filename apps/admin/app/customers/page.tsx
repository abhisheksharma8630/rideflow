'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/Shell';
import { PageHeader, Badge } from '@/components/widgets';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const q = useQuery({ queryKey: ['admin-customers', search], queryFn: () => api.customers(search) });

  return (
    <Shell>
      <PageHeader title="Customers" subtitle="Riders and their activity">
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
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Phone</th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Rides</th>
              <th className="px-5 py-3 font-semibold">Account</th>
              <th className="px-5 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(q.data?.items ?? []).map((c) => (
              <tr key={c.id} className="border-b border-slate-50">
                <td className="px-5 py-3 font-semibold text-charcoal">
                  {c.name} {c.isDemo ? <span className="badge bg-slate-100 text-slate-600 ml-1">demo</span> : null}
                </td>
                <td className="px-5 py-3">{c.phone}</td>
                <td className="px-5 py-3 text-muted">{c.email ?? '—'}</td>
                <td className="px-5 py-3">{c.rideCount}</td>
                <td className="px-5 py-3"><Badge status={c.status} /></td>
                <td className="px-5 py-3 text-muted">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
            {q.data && q.data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted">No customers found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
