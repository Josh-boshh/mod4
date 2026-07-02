'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Press Items', href: '/admin/press-items' },
  { label: 'Hero Slides', href: '/admin/hero-slides' },
  { label: 'Leaders', href: '/admin/leaders' },
  { label: 'Directors', href: '/admin/directors' },
  { label: 'Gallery Images', href: '/admin/gallery-images' },
  { label: 'Operations', href: '/admin/operations' },
  { label: 'Tenders', href: '/admin/tenders' },
  { label: 'Annual Reports', href: '/admin/annual-reports' },
  { label: 'Settings', href: '/admin/settings' },
  { label: 'Subscribers (read-only)', href: '/admin/subscribers' },
  { label: 'Submissions (read-only)', href: '/admin/submissions' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block rounded px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-brand-green-soft font-medium text-brand-green-2'
                    : 'text-brand-ink-2 hover:bg-brand-paper-3'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
