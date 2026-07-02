import { redirect } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '../_components/LogoutButton';
import { AdminNav } from '../_components/AdminNav';

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
      <div className="h-1.5 w-full bg-brand-green" />

      <header className="flex items-center justify-between border-b border-brand-line bg-brand-paper px-6 py-3">
        <div className="flex items-center gap-3">
          <Image src="/brand/coat-of-arms.png" alt="" width={30} height={26} />
          <Image src="/brand/mod-logo.png" alt="" width={30} height={30} className="opacity-90" />
          <span className="font-heading text-lg text-brand-ink">FMOD Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-brand-ink-3">{username}</span>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-8">
        <AdminNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
