'use client';

import { Fragment, useState } from 'react';
import { useAdminTable } from '@/lib/admin/useAdminTable';
import { downloadCsv } from '@/lib/admin/exportCsv';

type Submission = {
  id: number;
  form_type: string;
  name: string;
  email: string;
  subject: string;
  meta: Record<string, unknown> | null;
  submitted_at: string;
  handled: boolean;
};

export default function SubmissionsPage() {
  const { items, loading, error, update } = useAdminTable<Submission>('mod_submissions', 'submitted_at', false);
  const [expanded, setExpanded] = useState<number | null>(null);

  function handleExport() {
    downloadCsv(
      'submissions.csv',
      items.map((item) => ({
        form_type: item.form_type,
        name: item.name,
        email: item.email,
        subject: item.subject,
        submitted_at: item.submitted_at,
        handled: item.handled ? 'yes' : 'no',
        details: item.meta ? JSON.stringify(item.meta) : '',
      }))
    );
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl text-brand-ink">Contact Us Submissions</h1>
        {items.length > 0 && (
          <button
            onClick={handleExport}
            className="rounded border border-brand-line px-3 py-1.5 text-sm font-medium text-brand-ink-2 hover:bg-brand-paper-3"
          >
            Export CSV
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-brand-ink-3">Contact/form submissions from the public site.</p>

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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-brand-line bg-brand-paper-3 text-xs uppercase tracking-wide text-brand-ink-3">
              <tr>
                <th className="px-4 py-3">Form</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Fragment key={item.id}>
                  <tr className={`border-b border-brand-line last:border-0 ${item.handled ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 capitalize text-brand-ink-2">{item.form_type}</td>
                    <td className="px-4 py-3 text-brand-ink">{item.name}</td>
                    <td className="px-4 py-3 text-brand-ink-2">{item.email}</td>
                    <td className="px-4 py-3 text-brand-ink-2">{item.subject || '—'}</td>
                    <td className="px-4 py-3 text-brand-ink-2">
                      {new Date(item.submitted_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => update(item.id, { handled: !item.handled, name: item.name })}
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
                      {item.meta && (
                        <button
                          onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                          className="text-sm font-medium text-brand-ink-2 hover:text-brand-green-2 hover:underline"
                        >
                          {expanded === item.id ? 'Hide' : 'Details'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === item.id && item.meta && (
                    <tr className="border-b border-brand-line bg-brand-paper-3">
                      <td colSpan={7} className="px-4 py-3">
                        <pre className="overflow-x-auto text-xs text-brand-ink-2">
                          {JSON.stringify(item.meta, null, 2)}
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
