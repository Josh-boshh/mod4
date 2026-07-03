'use client';

import { Fragment, useState } from 'react';
import { useAdminTable } from '@/lib/admin/useAdminTable';
import { downloadCsv } from '@/lib/admin/exportCsv';

type FormSubmission = {
  id: number;
  form_slug: string;
  data: Record<string, string> | null;
  submitted_at: string;
};

function summarize(data: Record<string, string> | null) {
  if (!data) return '—';
  const entries = Object.entries(data).slice(0, 2);
  if (!entries.length) return '—';
  return entries.map(([k, v]) => `${k}: ${v}`).join(' · ');
}

export default function FormSubmissionsPage() {
  const { items, loading, error, remove } = useAdminTable<FormSubmission>('mod_form_submissions', 'submitted_at', false);
  const [expanded, setExpanded] = useState<number | null>(null);

  function handleExport() {
    downloadCsv(
      'form-submissions.csv',
      items.map((item) => ({
        form_slug: item.form_slug,
        submitted_at: item.submitted_at,
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

      {error && (
        <p role="alert" className="mb-4 rounded border border-brand-red/20 bg-red-50 px-3 py-2 text-sm text-brand-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-brand-ink-3">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-brand-ink-3">No submissions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-brand-line bg-brand-paper">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-brand-line bg-brand-paper-3 text-xs uppercase tracking-wide text-brand-ink-3">
              <tr>
                <th className="px-4 py-3">Form</th>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Fragment key={item.id}>
                  <tr className="border-b border-brand-line last:border-0">
                    <td className="px-4 py-3 text-brand-ink">
                      <code className="text-xs">{item.form_slug}</code>
                    </td>
                    <td className="px-4 py-3 text-brand-ink-2">
                      <span className="line-clamp-1 max-w-xs">{summarize(item.data)}</span>
                    </td>
                    <td className="px-4 py-3 text-brand-ink-2">{new Date(item.submitted_at).toLocaleString()}</td>
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
                      <td colSpan={4} className="px-4 py-3">
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
    </div>
  );
}
