'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={pending}
      className="rounded border border-brand-ink px-3 py-1.5 text-sm font-medium text-brand-ink transition hover:bg-brand-ink hover:text-white disabled:opacity-60"
    >
      {pending ? 'Signing out…' : 'Log out'}
    </button>
  );
}
