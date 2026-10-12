'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('9800000000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.demoLogin(phone.trim());
      setToken(res.accessToken);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-xl bg-brand grid place-items-center font-black text-charcoal">
            RF
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-charcoal">RideFlow Admin</h1>
            <p className="text-sm text-muted">Operations dashboard</p>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs font-bold text-amber-700">DEMO AUTH · development only</p>
          <p className="text-xs text-amber-700">
            Simulated login — not real phone verification. Use the seeded admin account.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">ADMIN MOBILE</label>
            <input
              className="input w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9800000000"
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted">
          Seeded admin: <span className="font-mono">9800000000</span>
        </p>
      </div>
    </div>
  );
}
