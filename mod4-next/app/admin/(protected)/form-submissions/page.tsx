'use client';

import { Fragment, useState } from 'react';
import { useAdminTable } from '@/lib/admin/useAdminTable';
import { downloadCsv } from '@/lib/admin/exportCsv';
import { usePagination } from '@/lib/admin/usePagination';
import { Pagination } from '@/lib/admin/Pagination';
import { BulkActionBar } from '@/lib/admin/BulkActionBar';

type FormSubmission = {
  id: number;
  form_slug: string;
  data: Record<string, string> | null;
  submitted_at: string;
  handled: boolean;
};

function summarize(data: Record<string, string> | null) {
  if (!data) return '—';
  const entries = Object.entries(data).slice(0, 2);
  if (!entries.length) return '—';
  return entries.map(([k, v]) => `${k}: ${v}`).join(' · ');
}

export default function FormSubmissionsPage() {
  const { items, loading, error, update, remove, bulkUpdate, bulkRemove } = useAdminTable<FormSubmission>(
    'mod_form_submissions',
    'submitted_at',
    false
  );
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const filtered = search.trim()
    ? items.filter((item) => {
        const needle = search.trim().toLowerCase();
        const name = item.data?.name;
        if (typeof name === 'string' && name.toLowerCase().includes(needle)) return true;
        // Custom forms don't have a fixed "name" field, so fall back to
        // matching any answer — still lets you find a submission by who filled it in.
        return Object.values(item.data || {}).some(
          (value) => typeof value === 'string' && value.toLowerCase().includes(needle)
        );
      })
    : items;

  const { page, setPage, pageCount, pageItems } = usePagination(filtered);

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    const pageIds = pageItems.map((i) => i.id);
    const allSelected = pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function handleBulkMark(handled: boolean) {
    await bulkUpdate(Array.from(selected), { handled } as Partial<FormSubmission>);
    setSelected(new Set());
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selected.size} submission(s)? This cannot be undone.`)) return;
    await bulkRemove(Array.from(selected));
    setSelected(new Set());
  }

  function handleExport() {
    downloadCsv(
      'form-submissions.csv',
      filtered.map((item) => ({
        form_slug: item.form_slug,
        submitted_at: item.submitted_at,
        handled: item.handled ? 'yes' : 'no',
        data: item.data ? JSON.stringify(item.data) : '',
      }))
    );
  }

  async function handleDelete(item: FormSubmission) {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    await remove(item.id);
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl text-brand-ink">Form Submissions</h1>
        {items.length > 0 && (
          <button
            onClick={handleExport}
            className="rounded border border-brand-line px-3 py-1.5 text-sm font-medium text-brand-ink-2 hover:bg-brand-paper-3"
          >
            Export CSV
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-brand-ink-3">Submissions from admin-defined custom forms (see Forms).</p>

      {items.length > 0 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="mb-4 w-full max-w-xs rounded border border-brand-line px-3 py-2 text-sm text-brand-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
        />
      )}

      <BulkActionBar
        count={selected.size}
        onMarkHandled={() => handleBulkMark(true)}
        onMarkNew={() => handleBulkMark(false)}
        onDelete={handleBulkDelete}
        onClear={() => setSelected(new Set())}
      />

      {error && (
        <p role="alert" className="mb-4 rounded border border-brand-red/20 bg-red-50 px-3 py-2 text-sm text-brand-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-brand-ink-3">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-brand-ink-3">No submissions yet.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-brand-ink-3">No submissions match “{search}”.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-brand-line bg-brand-paper">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-brand-line bg-brand-paper-3 text-xs uppercase tracking-wide text-brand-ink-3">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={pageItems.length > 0 && pageItems.every((i) => selected.has(i.id))}
                    onChange={toggleAllOnPage}
                    aria-label="Select all on this page"
                    className="h-4 w-4 rounded border-brand-line text-brand-green focus:ring-brand-green"
                  />
                </th>
                <th className="px-4 py-3">Form</th>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => (
                <Fragment key={item.id}>
                  <tr className={`border-b border-brand-line last:border-0 ${item.handled ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleOne(item.id)}
                        aria-label={`Select submission for ${item.form_slug}`}
                        className="h-4 w-4 rounded border-brand-line text-brand-green focus:ring-brand-green"
                      />
                    </td>
                    <td className="px-4 py-3 text-brand-ink">
                      <code className="text-xs">{item.form_slug}</code>
                    </td>
                    <td className="px-4 py-3 text-brand-ink-2">
                      <span className="line-clamp-1 max-w-xs">{summarize(item.data)}</span>
                    </td>
                    <td className="px-4 py-3 text-brand-ink-2">{new Date(item.submitted_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => update(item.id, { handled: !item.handled })}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          item.handled
                            ? 'bg-brand-paper-3 text-brand-ink-3'
                            : 'bg-brand-green-soft text-brand-green-2'
                        }`}
                      >
                        {item.handled ? 'Handled' : 'New'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                        className="mr-3 text-sm font-medium text-brand-ink-2 hover:text-brand-green-2 hover:underline"
                      >
                        {expanded === item.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-sm font-medium text-brand-red hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {expanded === item.id && (
                    <tr className="border-b border-brand-line bg-brand-paper-3">
                      <td colSpan={6} className="px-4 py-3">
                        <pre className="overflow-x-auto text-xs text-brand-ink-2">
                          {JSON.stringify(item.data, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}
