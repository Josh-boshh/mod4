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
};

const SECTIONS: Section[] = [
  { label: 'Press Items', href: '/admin/press-items', table: 'mod_press_items', description: 'News releases and press office updates.' },
  { label: 'Hero Slides', href: '/admin/hero-slides', table: 'mod_hero_slides', description: 'Homepage hero carousel images.' },
  { label: 'Leaders', href: '/admin/leaders', table: 'mod_leaders', description: 'Minister, Minister of State, Permanent Secretary.' },
  { label: 'Directors', href: '/admin/directors', table: 'mod_directors', description: 'Departmental directors and photos.' },
  { label: 'Gallery Images', href: '/admin/gallery-images', table: 'mod_gallery_images', description: 'Photo gallery entries.' },
  { label: 'Operations', href: '/admin/operations', table: 'mod_operations', description: 'Active military operations.' },
  { label: 'Tenders', href: '/admin/tenders', table: 'mod_tenders', description: 'Tenders and contract awards.' },
  { label: 'Annual Reports', href: '/admin/annual-reports', table: 'mod_annual_reports', description: 'Yearly reports and accounts.' },
  { label: 'Settings', href: '/admin/settings', table: 'mod_settings', description: 'Site-wide text — hero copy, footer info.' },
  { label: 'Subscribers', href: '/admin/subscribers', table: 'mod_subscribers', description: 'Newsletter signups.', readOnly: true },
  { label: 'Submissions', href: '/admin/submissions', table: 'mod_submissions', description: 'Contact form submissions.', readOnly: true },
];

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadCounts() {
      const supabase = createClient();
      const results = await Promise.all(
        SECTIONS.map(async (s) => {
          const { count } = await supabase.from(s.table).select('*', { count: 'exact', head: true });
          return [s.table, count ?? 0] as const;
        })
      );
      setCounts(Object.fromEntries(results));
    }
    loadCounts();
  }, []);

  return (
    <div>
      <h1 className="mb-1 font-heading text-xl text-brand-ink">Dashboard</h1>
      <p className="mb-6 text-sm text-brand-ink-3">Quick access to every content section.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded border border-brand-line bg-brand-paper p-5 transition hover:border-brand-green hover:shadow-[0_18px_40px_rgba(14,26,20,.10),0_4px_8px_rgba(14,26,20,.04)]"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-heading text-base text-brand-ink group-hover:text-brand-green-2">
                {s.label}
              </h2>
              {s.readOnly && (
                <span className="shrink-0 rounded-full bg-brand-paper-3 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-ink-3">
                  Read-only
                </span>
              )}
            </div>
            <p className="mb-3 text-sm text-brand-ink-3">{s.description}</p>
            <div className="text-xs font-medium text-brand-ink-4">
              {counts[s.table] === undefined
                ? 'Loading…'
                : `${counts[s.table]} ${counts[s.table] === 1 ? 'item' : 'items'}`}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
