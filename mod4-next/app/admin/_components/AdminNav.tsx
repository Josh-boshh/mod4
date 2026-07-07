'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Press Items', href: '/admin/press-items' },
  { label: 'Speeches', href: '/admin/speeches' },
  { label: 'Hero Slides', href: '/admin/hero-slides' },
  { label: 'Leaders', href: '/admin/leaders' },
  { label: 'Directors', href: '/admin/directors' },
  { label: 'Gallery Images', href: '/admin/gallery-images' },
  { label: 'Operations', href: '/admin/operations' },
  { label: 'Tenders', href: '/admin/tenders' },
  { label: 'Annual Reports', href: '/admin/annual-reports' },
  { label: 'Pages', href: '/admin/pages' },
  { label: 'Forms', href: '/admin/forms' },
  { label: 'Form Submissions', href: '/admin/form-submissions', countTable: 'mod_form_submissions' },
  { label: 'Settings', href: '/admin/settings' },
  { label: 'Trash', href: '/admin/trash' },
  { label: 'Subscribers (read-only)', href: '/admin/subscribers' },
  { label: 'Submissions', href: '/admin/submissions', countTable: 'mod_submissions' },
] as const;

const COUNT_TABLES = Array.from(
  new Set(NAV_ITEMS.map((item) => ('countTable' in item ? item.countTable : null)).filter(Boolean))
) as string[];

export function AdminNav() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    Promise.all(
      COUNT_TABLES.map(async (table) => {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('handled', false);
        return [table, count ?? 0] as const;
      })
    ).then((results) => {
      if (!cancelled) setCounts(Object.fromEntries(results));
    });

    return () => {
      cancelled = true;
    };
    // Re-check whenever the admin navigates — cheap enough, and picks up
    // changes made by marking a submission handled on its own page.
  }, [pathname]);

  return (
    <nav className="w-full shrink-0 md:w-56">
      <ul className="flex gap-1 overflow-x-auto pb-2 md:block md:space-y-1 md:overflow-visible md:pb-0">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const count = 'countTable' in item ? counts[item.countTable] : undefined;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-brand-green-soft font-medium text-brand-green-2'
                    : 'text-brand-ink-2 hover:bg-brand-paper-3'
                }`}
              >
                <span>{item.label}</span>
                {Boolean(count) && (
                  <span
                    className="rounded-full bg-brand-red px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
                    aria-label={`${count} unattended`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
