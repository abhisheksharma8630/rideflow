'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shell as ShellCmp } from '@/components/Shell';
import { PageHeader } from '@/components/widgets';
import { api } from '@/lib/api';
import { VEHICLE_EMOJI } from '@/lib/format';
import type { FareRule } from '@/lib/types';

interface Draft {
  baseFare: string;
  perKmRate: string;
  perMinuteRate: string;
  minimumFare: string;
  enabled: boolean;
}

export default function FaresPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-fares'], queryFn: () => api.fares() });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (q.data) {
      const d: Record<string, Draft> = {};
      q.data.forEach((r) => {
        d[r.id] = {
          baseFare: String(r.baseFare),
          perKmRate: String(r.perKmRate),
          perMinuteRate: String(r.perMinuteRate),
          minimumFare: String(r.minimumFare),
          enabled: r.enabled,
        };
      });
      setDrafts(d);
    }
  }, [q.data]);

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FareRule> }) => api.updateFare(id, data),
    onSuccess: (_r, vars) => {
      void qc.invalidateQueries({ queryKey: ['admin-fares'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
      setSaved(vars.id);
      setTimeout(() => setSaved(null), 2000);
    },
    onError: (e, vars) => {
      setErrors((prev) => ({ ...prev, [vars.id]: e instanceof Error ? e.message : 'Save failed' }));
    },
  });

  function validate(d: Draft): string | null {
    const nums = [d.baseFare, d.perKmRate, d.perMinuteRate, d.minimumFare];
    for (const n of nums) {
      const v = Number(n);
      if (Number.isNaN(v) || v < 0) return 'All rates must be non-negative numbers';
    }
    if (Number(d.minimumFare) < Number(d.baseFare)) {
      return 'Minimum fare should be at least the base fare';
    }
    return null;
  }

  function save(rule: FareRule) {
    const d = drafts[rule.id];
    const err = validate(d);
    setErrors((prev) => ({ ...prev, [rule.id]: err ?? '' }));
    if (err) return;
    mutation.mutate({
      id: rule.id,
      data: {
        baseFare: Number(d.baseFare),
        perKmRate: Number(d.perKmRate),
        perMinuteRate: Number(d.perMinuteRate),
        minimumFare: Number(d.minimumFare),
        enabled: d.enabled,
      },
    });
  }

  return (
    <ShellCmp>
      <PageHeader title="Fare management" subtitle="Configure per-category pricing (demonstration values)" />

      <div className="mb-5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700">
        Fares are stored in the database and used for all new bookings. Existing rides keep the fare
        snapshot taken at booking time, so changes here never rewrite history.
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {(q.data ?? []).map((rule) => {
          const d = drafts[rule.id];
          if (!d) return null;
          return (
            <div key={rule.id} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold text-charcoal">
                  {VEHICLE_EMOJI[rule.vehicleCategory]} {rule.vehicleCategory}
                </h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={d.enabled}
                    onChange={(e) => setDrafts((p) => ({ ...p, [rule.id]: { ...d, enabled: e.target.checked } }))}
                  />
                  {d.enabled ? 'Enabled' : 'Disabled'}
                </label>
              </div>

              <FareInput label="Base fare (₹)" value={d.baseFare} onChange={(v) => setDrafts((p) => ({ ...p, [rule.id]: { ...d, baseFare: v } }))} />
              <FareInput label="Per km (₹)" value={d.perKmRate} onChange={(v) => setDrafts((p) => ({ ...p, [rule.id]: { ...d, perKmRate: v } }))} />
              <FareInput label="Per minute (₹)" value={d.perMinuteRate} onChange={(v) => setDrafts((p) => ({ ...p, [rule.id]: { ...d, perMinuteRate: v } }))} />
              <FareInput label="Minimum fare (₹)" value={d.minimumFare} onChange={(v) => setDrafts((p) => ({ ...p, [rule.id]: { ...d, minimumFare: v } }))} />

              {errors[rule.id] ? <p className="text-sm text-danger mt-2">{errors[rule.id]}</p> : null}
              <button
                className="btn btn-primary w-full mt-4"
                disabled={mutation.isPending}
                onClick={() => save(rule)}
              >
                {saved === rule.id ? 'Saved ✓' : 'Save'}
              </button>
            </div>
          );
        })}
      </div>
    </ShellCmp>
  );
}

function FareInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-muted mb-1">{label}</label>
      <input
        className="input w-full"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
