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
  { label: 'Pages', href: '/admin/pages' },
  { label: 'Forms', href: '/admin/forms' },
  { label: 'Form Submissions', href: '/admin/form-submissions' },
  { label: 'Settings', href: '/admin/settings' },
  { label: 'Trash', href: '/admin/trash' },
  { label: 'Subscribers (read-only)', href: '/admin/subscribers' },
  { label: 'Submissions', href: '/admin/submissions' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full shrink-0 md:w-56">
      <ul className="flex gap-1 overflow-x-auto pb-2 md:block md:space-y-1 md:overflow-visible md:pb-0">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap rounded px-3 py-2 text-sm transition ${
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
