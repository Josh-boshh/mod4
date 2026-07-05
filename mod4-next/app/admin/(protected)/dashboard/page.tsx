'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PUBLIC_SITE_URL } from '@/lib/admin/publicSiteUrl';

type Section = {
  label: string;
  href: string;
  table: string;
  description: string;
  readOnly?: boolean;
  accent: 'green' | 'gold' | 'ink';
  // Shows an "N new" badge sourced from a `handled` boolean column, instead
  // of (or alongside) the plain item count.
  tracksHandled?: boolean;
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
  { label: 'Form Submissions', href: '/admin/form-submissions', table: 'mod_form_submissions', description: 'Responses to custom forms.', readOnly: true, accent: 'ink', tracksHandled: true },
  { label: 'Settings', href: '/admin/settings', table: 'mod_settings', description: 'Site-wide text — hero copy, footer info.', accent: 'gold' },
  { label: 'Trash', href: '/admin/trash', table: '', description: 'Recently deleted items, restorable for 7 days.', accent: 'gold' },
  { label: 'Subscribers', href: '/admin/subscribers', table: 'mod_subscribers', description: 'Newsletter signups.', readOnly: true, accent: 'ink' },
  { label: 'Contact Us Submissions', href: '/admin/submissions', table: 'mod_submissions', description: 'Contact form submissions.', readOnly: true, accent: 'ink', tracksHandled: true },
];

// Buttons in Quick Actions — the most frequently created content types.
// Everything else is still reachable via Site Status or the sidebar.
const QUICK_CREATE = ['/admin/press-items', '/admin/hero-slides', '/admin/leaders', '/admin/directors', '/admin/gallery-images'];
const QUICK_LINKS = ['/admin/pages', '/admin/forms', '/admin/subscribers', '/admin/submissions', '/admin/form-submissions', '/admin/settings', '/admin/trash'];

const ACCENT_DOT: Record<Section['accent'], string> = {
  green: 'bg-brand-green',
  gold: 'bg-brand-gold',
  ink: 'bg-brand-ink-4',
};

const ACCENT_TILE_BG: Record<Section['accent'], string> = {
  green: 'bg-brand-green-soft',
  gold: 'bg-brand-paper-3',
  ink: 'bg-brand-paper-3',
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
  const [unattended, setUnattended] = useState<Record<string, number>>({});
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

    async function loadUnattended() {
      const results = await Promise.all(
        SECTIONS.filter((s) => s.tracksHandled).map(async (s) => {
          const { count } = await supabase
            .from(s.table)
            .select('*', { count: 'exact', head: true })
            .eq('handled', false);
          return [s.table, count ?? 0] as const;
        })
      );
      setUnattended(Object.fromEntries(results));
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
    loadUnattended();
    loadActivity();
  }, []);

  const bySections = (hrefs: string[]) => hrefs.map((href) => SECTIONS.find((s) => s.href === href)!).filter(Boolean);

  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-green-2">
        Overview
      </span>
      <h1 className="mb-1 font-heading text-2xl text-brand-ink">Dashboard</h1>
      <p className="mb-8 text-sm text-brand-ink-3">Quick access to every content section.</p>

      {/* Stat tiles */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {SECTIONS.filter((s) => s.table).map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded border border-brand-line bg-brand-paper p-5 transition hover:border-brand-green hover:shadow-[0_18px_40px_rgba(14,26,20,.10),0_4px_8px_rgba(14,26,20,.04)]"
          >
            <span className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded ${ACCENT_TILE_BG[s.accent]}`}>
              <span className={`h-2 w-2 rounded-full ${ACCENT_DOT[s.accent]}`} aria-hidden="true" />
            </span>
            <div className="font-heading text-2xl text-brand-ink">
              {counts[s.table] === undefined ? '—' : counts[s.table]}
            </div>
            <div className="text-xs font-medium uppercase tracking-wide text-brand-ink-3">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
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

      {/* Quick Actions + Site Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded border border-brand-line bg-brand-paper p-5">
          <h2 className="mb-4 font-heading text-base text-brand-ink">Quick actions</h2>
          <div className="flex flex-wrap gap-2">
            {bySections(QUICK_CREATE).map((s, i) => (
              <Link
                key={s.href}
                href={s.href}
                className={
                  i === 0
                    ? 'rounded bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green'
                    : 'rounded border border-brand-ink px-4 py-2 text-sm font-medium text-brand-ink transition hover:bg-brand-paper-3'
                }
              >
                + {s.label.replace(/s$/, '')}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-brand-line pt-4">
            {bySections(QUICK_LINKS).map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="text-sm font-medium text-brand-ink-2 hover:text-brand-green-2 hover:underline"
              >
                {s.readOnly ? `View ${s.label}` : s.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded border border-brand-line bg-brand-paper">
          <div className="border-b border-brand-line px-5 py-3.5">
            <h2 className="font-heading text-base text-brand-ink">Site status</h2>
          </div>
          <ul className="divide-y divide-brand-line">
            <li className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full bg-brand-green" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="text-brand-ink-2">Public website is live</div>
                <a
                  href={PUBLIC_SITE_URL}
                  target="_blank"
                  rel="noopener"
                  className="text-xs text-brand-green-2 hover:underline"
                >
                  {PUBLIC_SITE_URL.replace('https://', '')} ↗
                </a>
              </div>
            </li>
            {SECTIONS.filter((s) => s.table).map((s) => {
              const count = counts[s.table];
              const unread = s.tracksHandled ? unattended[s.table] : undefined;
              return (
                <li key={s.href} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${ACCENT_DOT[s.accent]}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="text-brand-ink-2">
                      {count === undefined ? 'Loading…' : `${count} ${count === 1 ? 'item' : 'items'}`} in {s.label}
                      {Boolean(unread) && <span className="text-brand-red"> · {unread} unattended</span>}
                    </div>
                    <Link href={s.href} className="text-xs text-brand-green-2 hover:underline">
                      {s.readOnly ? 'View' : 'Manage'} {s.label.toLowerCase()} →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
