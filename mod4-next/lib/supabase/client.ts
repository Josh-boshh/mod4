import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { parse, serialize } from 'cookie';
import { toSessionCookieOptions } from './sessionCookieOptions';

// Memoized: every admin page calls createClient() independently, and
// createBrowserClient() is not free to call repeatedly — Supabase warns
// ("Multiple GoTrueClient instances") if more than one exists per tab.
let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const parsed = parse(document.cookie);
            return Object.entries(parsed)
              .filter((entry): entry is [string, string] => entry[1] !== undefined)
              .map(([name, value]) => ({ name, value }));
          },
          // Auth cookies are forced to session-only (see toSessionCookieOptions)
          // so signing in on this device doesn't survive a browser restart.
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              document.cookie = serialize(name, value, toSessionCookieOptions(options));
            });
          },
        },
      }
    );
  }
  return browserClient;
}
