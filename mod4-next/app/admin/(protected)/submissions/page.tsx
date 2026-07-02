'use client';

import { Fragment, useState } from 'react';
import { useAdminTable } from '@/lib/admin/useAdminTable';

type Submission = {
  id: number;
  form_type: string;
  name: string;
  email: string;
  subject: string;
  meta: Record<string, unknown> | null;
  submitted_at: string;
};

export default function SubmissionsPage() {
  const { items, loading, error } = useAdminTable<Submission>('mod_submissions', 'submitted_at', false);
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div>
      <h1 className="mb-1 font-heading text-xl text-brand-ink">Submissions</h1>
      <p className="mb-4 text-sm text-brand-ink-3">Read-only — contact/form submissions from the public site.</p>

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
        <div className="overflow-hidden rounded border border-brand-line bg-brand-paper">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-brand-line bg-brand-paper-3 text-xs uppercase tracking-wide text-brand-ink-3">
              <tr>
                <th className="px-4 py-3">Form</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Fragment key={item.id}>
                  <tr className="border-b border-brand-line last:border-0">
                    <td className="px-4 py-3 capitalize text-brand-ink-2">{item.form_type}</td>
                    <td className="px-4 py-3 text-brand-ink">{item.name}</td>
                    <td className="px-4 py-3 text-brand-ink-2">{item.email}</td>
                    <td className="px-4 py-3 text-brand-ink-2">{item.subject || '—'}</td>
                    <td className="px-4 py-3 text-brand-ink-2">
                      {new Date(item.submitted_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
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
                      <td colSpan={6} className="px-4 py-3">
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
