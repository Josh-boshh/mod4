'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Auto-signs the admin out after this many minutes of no mouse/keyboard/touch
// activity, on top of the "log in again every browser session" cookie change —
// this covers the case of a shared/unattended machine left logged in mid-session.
const IDLE_TIMEOUT_MINUTES = 20;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export function SessionTimeoutGuard() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResetRef = useRef(0);

  useEffect(() => {
    async function signOutForIdle() {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/admin/login?reason=timeout');
      router.refresh();
    }

    function resetTimer() {
      // Activity events (mousemove especially) can fire dozens of times a
      // second — only actually reset the underlying timer once a second.
      const now = Date.now();
      if (now - lastResetRef.current < 1000) return;
      lastResetRef.current = now;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(signOutForIdle, IDLE_TIMEOUT_MINUTES * 60 * 1000);
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
