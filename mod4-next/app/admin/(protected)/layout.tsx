import { redirect } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '../_components/LogoutButton';
import { AdminNav } from '../_components/AdminNav';
import { SessionTimeoutGuard } from '../_components/SessionTimeoutGuard';
import { PUBLIC_SITE_URL } from '@/lib/admin/publicSiteUrl';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth alongside proxy.ts — layouts don't re-run on every
  // client-side navigation, so this alone isn't sufficient auth, but it
  // covers direct/hard loads and keeps this segment self-contained.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const username = user.email?.split('@')[0] ?? 'admin';

  return (
    <div className="min-h-screen bg-brand-paper-2">
      <SessionTimeoutGuard />
      <div className="h-1.5 w-full bg-brand-green" />

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-line bg-brand-paper px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Image src="/brand/coat-of-arms.png" alt="" width={26} height={22} className="sm:h-[26px] sm:w-[30px]" />
          <Image src="/brand/mod-logo.png" alt="" width={26} height={26} className="opacity-90 sm:h-[30px] sm:w-[30px]" />
          <span className="font-heading text-base text-brand-ink sm:text-lg">MOD Admin</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href={PUBLIC_SITE_URL}
            target="_blank"
            rel="noopener"
            className="rounded border border-brand-line px-3 py-1.5 text-sm font-medium text-brand-ink-2 transition hover:bg-brand-paper-3"
          >
            View Site ↗
          </a>
          <span className="hidden text-sm text-brand-ink-3 sm:inline">{username}</span>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:px-6 md:py-8">
        <AdminNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
