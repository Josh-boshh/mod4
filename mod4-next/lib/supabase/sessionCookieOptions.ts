import type { CookieOptions } from '@supabase/ssr';

// @supabase/ssr always re-applies its own ~400-day maxAge internally when
// writing the auth cookie, regardless of what's passed via the client's
// cookieOptions config — so the only way to make the session a true
// "log in again every browser session" cookie (cleared when the browser
// closes, instead of persisting for over a year) is to strip maxAge/expires
// ourselves at the point we actually write the cookie.
export function toSessionCookieOptions(options: CookieOptions): CookieOptions {
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return rest;
}
