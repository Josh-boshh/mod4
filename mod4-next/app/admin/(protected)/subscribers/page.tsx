'use client';

import { useAdminTable } from '@/lib/admin/useAdminTable';
import { downloadCsv } from '@/lib/admin/exportCsv';

type Subscriber = { id: number; email: string; subscribed_at: string };

export default function SubscribersPage() {
  const { items, loading, error } = useAdminTable<Subscriber>('mod_subscribers', 'subscribed_at', false);

  function handleExport() {
    downloadCsv(
      'subscribers.csv',
      items.map((item) => ({ email: item.email, subscribed_at: item.subscribed_at }))
    );
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl text-brand-ink">Subscribers</h1>
        {items.length > 0 && (
          <button
            onClick={handleExport}
            className="rounded border border-brand-line px-3 py-1.5 text-sm font-medium text-brand-ink-2 hover:bg-brand-paper-3"
          >
            Export CSV
          </button>
        )}
      </div>
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
        <div className="overflow-x-auto rounded border border-brand-line bg-brand-paper">
          <table className="w-full min-w-[480px] text-left text-sm">
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
