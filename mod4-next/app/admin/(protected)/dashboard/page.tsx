'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { resolveImageUrl } from '@/lib/admin/resolveImageUrl';

type Accent = 'green' | 'gold' | 'ink';

type QuickCard = {
  label: string;
  href: string;
  table: string;
  accent: Accent;
  icon: (props: { className?: string }) => React.ReactNode;
};

function IconDoc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconInbox({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z" />
    </svg>
  );
}

const QUICK_CARDS: QuickCard[] = [
  { label: 'Press Releases', href: '/admin/press-items', table: 'mod_press_items', accent: 'green', icon: IconDoc },
  { label: 'Hero Slides', href: '/admin/hero-slides', table: 'mod_hero_slides', accent: 'green', icon: IconPlay },
  { label: 'Subscribers', href: '/admin/subscribers', table: 'mod_subscribers', accent: 'ink', icon: IconMail },
  { label: 'Form Submissions', href: '/admin/form-submissions', table: 'mod_form_submissions', accent: 'ink', icon: IconInbox },
  { label: 'Leadership Profiles', href: '/admin/leaders', table: 'mod_leaders', accent: 'green', icon: IconUser },
  { label: 'Active Operations', href: '/admin/operations', table: 'mod_operations', accent: 'green', icon: IconShield },
];

const ACCENT_ICON: Record<Accent, string> = {
  green: 'text-brand-green',
  gold: 'text-brand-gold',
  ink: 'text-brand-ink-3',
};

const ACCENT_TILE_BG: Record<Accent, string> = {
  green: 'bg-brand-green-soft',
  gold: 'bg-brand-paper-3',
  ink: 'bg-brand-paper-3',
};

const TABLE_LABELS: Record<string, string> = Object.fromEntries(QUICK_CARDS.map((c) => [c.table, c.label]));

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

type GalleryImage = { id: number; image_url: string };

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
  const [gallery, setGallery] = useState<GalleryImage[] | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadCounts() {
      const results = await Promise.all(
        QUICK_CARDS.map(async (c) => {
          const { count } = await supabase.from(c.table).select('*', { count: 'exact', head: true });
          return [c.table, count ?? 0] as const;
        })
      );
      setCounts(Object.fromEntries(results));
    }

    async function loadActivity() {
      const { data, error } = await supabase
        .from('mod_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setActivity(error ? [] : (data as ActivityEntry[]));
    }

    async function loadGallery() {
      const { data, error } = await supabase
        .from('mod_gallery_images')
        .select('id, image_url')
        .eq('active', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .limit(6);
      setGallery(error ? [] : (data as GalleryImage[]));
    }

    loadCounts();
    loadActivity();
    loadGallery();
  }, []);

  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-green-2">
        Overview
      </span>
      <h1 className="mb-1 font-heading text-2xl text-brand-ink">Dashboard</h1>
      <p className="mb-8 text-sm text-brand-ink-3">Quick access to every content section.</p>

      {/* Quick access */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {QUICK_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group rounded border border-brand-line bg-brand-paper p-5 transition hover:border-brand-green hover:shadow-[0_18px_40px_rgba(14,26,20,.10),0_4px_8px_rgba(14,26,20,.04)]"
            >
              <span className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded ${ACCENT_TILE_BG[c.accent]}`}>
                <Icon className={`h-5 w-5 ${ACCENT_ICON[c.accent]}`} />
              </span>
              <div className="font-heading text-2xl text-brand-ink">
                {counts[c.table] === undefined ? '—' : counts[c.table]}
              </div>
              <div className="text-xs font-medium uppercase tracking-wide text-brand-ink-3">{c.label}</div>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity + Gallery Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded border border-brand-line bg-brand-paper">
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

        <div className="flex flex-col overflow-hidden rounded border border-brand-line bg-brand-paper">
          <div className="border-b border-brand-line px-5 py-3.5">
            <h2 className="font-heading text-base text-brand-ink">Gallery Preview</h2>
          </div>
          <div className="flex flex-1 flex-col justify-between p-5">
            {gallery === null ? (
              <p className="text-sm text-brand-ink-3">Loading…</p>
            ) : gallery.length === 0 ? (
              <p className="text-sm text-brand-ink-3">No gallery images yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {gallery.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={resolveImageUrl(img.image_url)}
                    alt=""
                    className="aspect-square w-full rounded border border-brand-line object-cover"
                  />
                ))}
              </div>
            )}
            <Link
              href="/admin/gallery-images"
              className="mt-4 block rounded border border-brand-ink px-4 py-2 text-center text-sm font-medium text-brand-ink transition hover:bg-brand-paper-3"
            >
              View Gallery
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
