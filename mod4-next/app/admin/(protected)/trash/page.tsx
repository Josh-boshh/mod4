'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/admin/activityLog';

const RETENTION_DAYS = 7;

const TRASH_TABLES = [
  { table: 'mod_press_items', label: 'Press Items', nameKey: 'title' },
  { table: 'mod_speeches', label: 'Speeches', nameKey: 'quote' },
  { table: 'mod_hero_slides', label: 'Hero Slides', nameKey: 'caption_text' },
  { table: 'mod_leaders', label: 'Leaders', nameKey: 'name' },
  { table: 'mod_directors', label: 'Directors', nameKey: 'director' },
  { table: 'mod_gallery_images', label: 'Gallery Images', nameKey: 'caption' },
  { table: 'mod_operations', label: 'Operations', nameKey: 'name' },
  { table: 'mod_tenders', label: 'Tenders', nameKey: 'title' },
  { table: 'mod_annual_reports', label: 'Annual Reports', nameKey: 'title' },
] as const;

type TrashRow = {
  table: string;
  tableLabel: string;
  id: number;
  name: string;
  deletedAt: string;
};

export default function TrashPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<TrashRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Lazily purge anything past the retention window — no cron needed,
    // this just runs whenever an admin opens the Trash page.
    await Promise.all(TRASH_TABLES.map((t) => supabase.from(t.table).delete().lt('deleted_at', cutoff)));

    const results = await Promise.all(
      TRASH_TABLES.map(async (t) => {
        const { data, error } = await supabase.from(t.table).select('*').not('deleted_at', 'is', null);
        if (error) return [];
        return (data as Record<string, unknown>[]).map((row) => ({
          table: t.table,
          tableLabel: t.label,
          id: row.id as number,
          name: String(row[t.nameKey] ?? `#${row.id}`),
          deletedAt: row.deleted_at as string,
        }));
      })
    );

    const flat = results.flat().sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
    setRows(flat);
    setError(null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function restore(row: TrashRow) {
    const { error } = await supabase.from(row.table).update({ deleted_at: null } as never).eq('id', row.id);
    if (error) {
      setError(error.message);
      return;
    }
    logActivity('restore', row.table, row.id, { name: row.name });
    await load();
  }

  async function purge(row: TrashRow) {
    if (!window.confirm(`Permanently delete "${row.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from(row.table).delete().eq('id', row.id);
    if (error) {
      setError(error.message);
      return;
    }
    logActivity('delete', row.table, row.id, { name: row.name });
    await load();
  }

  function daysLeft(deletedAt: string) {
    const purgeAt = new Date(deletedAt).getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
  }

  return (
    <div>
      <h1 className="mb-1 font-heading text-xl text-brand-ink">Trash</h1>
      <p className="mb-4 text-sm text-brand-ink-3">
        Deleted items are kept for {RETENTION_DAYS} days before being permanently removed.
      </p>

      {error && (
        <p role="alert" className="mb-4 rounded border border-brand-red/20 bg-red-50 px-3 py-2 text-sm text-brand-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-brand-ink-3">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-brand-ink-3">Trash is empty.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-brand-line bg-brand-paper">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-brand-line bg-brand-paper-3 text-xs uppercase tracking-wide text-brand-ink-3">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Deleted</th>
                <th className="px-4 py-3">Purges in</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.table + row.id} className="border-b border-brand-line last:border-0">
                  <td className="px-4 py-3 text-brand-ink-2">{row.tableLabel}</td>
                  <td className="px-4 py-3 text-brand-ink">{row.name}</td>
                  <td className="px-4 py-3 text-brand-ink-2">{new Date(row.deletedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-brand-ink-2">{daysLeft(row.deletedAt)} day(s)</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => restore(row)}
                      className="mr-3 text-sm font-medium text-brand-green-2 hover:underline"
                    >
                      Restore
                    </button>
                    <button onClick={() => purge(row)} className="text-sm font-medium text-brand-red hover:underline">
                      Delete Forever
                    </button>
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
