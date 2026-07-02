import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// For use in Server Components, Server Actions, and Route Handlers.
// Create a fresh client per request — never share/cache across requests.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies (no
            // response to attach them to) — proxy.ts refreshes the session
            // on every request instead, so this is safe to ignore.
          }
        },
      },
    }
  );
}
