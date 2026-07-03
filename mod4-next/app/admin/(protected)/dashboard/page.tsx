'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Section = {
  label: string;
  href: string;
  table: string;
  description: string;
  readOnly?: boolean;
  accent: 'green' | 'gold' | 'ink';
};

const SECTIONS: Section[] = [
  { label: 'Press Items', href: '/admin/press-items', table: 'mod_press_items', description: 'News releases and press office updates.', accent: 'green' },
  { label: 'Hero Slides', href: '/admin/hero-slides', table: 'mod_hero_slides', description: 'Homepage hero carousel images.', accent: 'green' },
  { label: 'Leaders', href: '/admin/leaders', table: 'mod_leaders', description: 'Minister, Minister of State, Permanent Secretary.', accent: 'green' },
  { label: 'Directors', href: '/admin/directors', table: 'mod_directors', description: 'Departmental directors and photos.', accent: 'green' },
  { label: 'Gallery Images', href: '/admin/gallery-images', table: 'mod_gallery_images', description: 'Photo gallery entries.', accent: 'green' },
  { label: 'Operations', href: '/admin/operations', table: 'mod_operations', description: 'Active military operations.', accent: 'green' },
  { label: 'Tenders', href: '/admin/tenders', table: 'mod_tenders', description: 'Tenders and contract awards.', accent: 'green' },
  { label: 'Annual Reports', href: '/admin/annual-reports', table: 'mod_annual_reports', description: 'Yearly reports and accounts.', accent: 'green' },
  { label: 'Pages', href: '/admin/pages', table: 'mod_custom_pages', description: 'Standalone content pages (page.html?slug=…).', accent: 'green' },
  { label: 'Forms', href: '/admin/forms', table: 'mod_custom_forms', description: 'Custom forms with configurable fields (form.html?slug=…).', accent: 'green' },
  { label: 'Form Submissions', href: '/admin/form-submissions', table: 'mod_form_submissions', description: 'Responses to custom forms.', readOnly: true, accent: 'ink' },
  { label: 'Settings', href: '/admin/settings', table: 'mod_settings', description: 'Site-wide text — hero copy, footer info.', accent: 'gold' },
  { label: 'Trash', href: '/admin/trash', table: '', description: 'Recently deleted items, restorable for 7 days.', accent: 'gold' },
  { label: 'Subscribers', href: '/admin/subscribers', table: 'mod_subscribers', description: 'Newsletter signups.', readOnly: true, accent: 'ink' },
  { label: 'Submissions', href: '/admin/submissions', table: 'mod_submissions', description: 'Contact form submissions.', readOnly: true, accent: 'ink' },
];

const ACCENT_DOT: Record<Section['accent'], string> = {
  green: 'bg-brand-green',
  gold: 'bg-brand-gold',
  ink: 'bg-brand-ink-4',
};

const TABLE_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.filter((s) => s.table).map((s) => [s.table, s.label])
);

const ACTION_META: Record<string, { verb: string; dot: string }> = {
  insert: { verb: 'created', dot: 'bg-brand-green' },
  update: { verb: 'updated', dot: 'bg-brand-gold' },
  trash: { verb: 'moved to trash', dot: 'bg-brand-red' },
  restore: { verb: 'restored', dot: 'bg-brand-green-2' },
  delete: { verb: 'permanently deleted', dot: 'bg-brand-ink-4' },
};

type ActivityEntry = {
  id: number;
  actor: string;
  action: string;
  table_name: string;
  record_id: string | null;
  summary: string | null;
  created_at: string;
};

function describeActivity(entry: ActivityEntry) {
  const tableLabel = TABLE_LABELS[entry.table_name] ?? entry.table_name;
  const verb = ACTION_META[entry.action]?.verb ?? entry.action;
  const subject = entry.summary || (entry.record_id ? `#${entry.record_id}` : 'an item');
  return (
    <>
      <span className="font-medium text-brand-ink">{entry.actor}</span> {verb} “{subject}” in {tableLabel}
    </>
  );
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activity, setActivity] = useState<ActivityEntry[] | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadCounts() {
      const results = await Promise.all(
        SECTIONS.filter((s) => s.table).map(async (s) => {
          const { count } = await supabase.from(s.table).select('*', { count: 'exact', head: true });
          return [s.table, count ?? 0] as const;
        })
      );
      setCounts(Object.fromEntries(results));
    }

    async function loadActivity() {
      const { data, error } = await supabase
        .from('mod_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setActivity(error ? [] : (data as ActivityEntry[]));
    }

    loadCounts();
    loadActivity();
  }, []);

  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-green-2">
        Overview
      </span>
      <h1 className="mb-1 font-heading text-2xl text-brand-ink">Dashboard</h1>
      <p className="mb-8 text-sm text-brand-ink-3">Quick access to every content section.</p>

      <div className="mb-8 overflow-hidden rounded border border-brand-line bg-brand-paper">
        <div className="border-b border-brand-line px-5 py-3.5">
          <h2 className="font-heading text-base text-brand-ink">Recent Activity</h2>
        </div>

        {activity === null ? (
          <p className="px-5 py-6 text-sm text-brand-ink-3">Loading…</p>
        ) : activity.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <div className="h-8 w-8 rounded-full border border-brand-line" />
            <p className="text-sm text-brand-ink-3">No activity recorded yet.</p>
            <p className="text-xs text-brand-ink-4">Changes you make across the panel will show up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-brand-line">
            {activity.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 px-5 py-3 text-sm transition hover:bg-brand-paper-3/60"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${ACTION_META[entry.action]?.dot ?? 'bg-brand-ink-4'}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-brand-ink-2">{describeActivity(entry)}</span>
                <span className="shrink-0 text-xs text-brand-ink-4">{timeAgo(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-brand-green-2">
        Content
      </span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group relative overflow-hidden rounded border border-brand-line bg-brand-paper p-5 transition hover:border-brand-green hover:shadow-[0_18px_40px_rgba(14,26,20,.10),0_4px_8px_rgba(14,26,20,.04)]"
          >
            <span
              className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100 ${ACCENT_DOT[s.accent]}`}
              aria-hidden="true"
            />
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ACCENT_DOT[s.accent]}`} aria-hidden="true" />
              <h2 className="font-heading text-base text-brand-ink group-hover:text-brand-green-2">
                {s.label}
              </h2>
              {s.readOnly && (
                <span className="ml-auto shrink-0 rounded-full bg-brand-paper-3 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-ink-3">
                  Read-only
                </span>
              )}
            </div>
            <p className="mb-3 text-sm text-brand-ink-3">{s.description}</p>
            {s.table && (
              <div className="text-xs font-medium text-brand-ink-4">
                {counts[s.table] === undefined
                  ? 'Loading…'
                  : `${counts[s.table]} ${counts[s.table] === 1 ? 'item' : 'items'}`}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
