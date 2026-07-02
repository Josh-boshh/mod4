'use client';

import { useAdminTable } from '@/lib/admin/useAdminTable';

type Subscriber = { id: number; email: string; subscribed_at: string };

export default function SubscribersPage() {
  const { items, loading, error } = useAdminTable<Subscriber>('mod_subscribers', 'subscribed_at', false);

  return (
    <div>
      <h1 className="mb-1 font-heading text-xl text-brand-ink">Subscribers</h1>
      <p className="mb-4 text-sm text-brand-ink-3">Read-only — newsletter signups from the public site.</p>

      {error && (
        <p role="alert" className="mb-4 rounded border border-brand-red/20 bg-red-50 px-3 py-2 text-sm text-brand-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-brand-ink-3">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-brand-ink-3">No subscribers yet.</p>
      ) : (
        <div className="overflow-hidden rounded border border-brand-line bg-brand-paper">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-brand-line bg-brand-paper-3 text-xs uppercase tracking-wide text-brand-ink-3">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Subscribed At</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-brand-line last:border-0">
                  <td className="px-4 py-3 text-brand-ink">{item.email}</td>
                  <td className="px-4 py-3 text-brand-ink-2">
                    {new Date(item.subscribed_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
