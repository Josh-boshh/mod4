import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { toSessionCookieOptions } from '@/lib/supabase/sessionCookieOptions';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// A fresh nonce per request, threaded through to Next via the request
// headers, is the documented way to get a strict script-src (no
// 'unsafe-inline') without breaking Next's own inline hydration/RSC
// scripts — Next reads the nonce back out of this same CSP header and
// stamps it onto the scripts it injects. React's onClick/onSubmit handlers
// aren't inline HTML attributes (they're attached via addEventListener at
// runtime), so this doesn't affect any admin-panel interactivity.
function buildCsp(nonce: string) {
  // React's dev mode uses eval() to reconstruct stack traces for its
  // debugging overlay — "React will never use eval() in production mode"
  // (React's own console warning). Only relax script-src for it locally;
  // the deployed admin panel keeps the strict nonce + strict-dynamic policy.
  const scriptSrc =
    process.env.NODE_ENV === 'production'
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;

  return [
    `default-src 'self'`,
    scriptSrc,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' https: data: blob:`,
    `font-src 'self'`,
    `connect-src 'self' ${SUPABASE_URL}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ');
}

// Next.js 16 renamed `middleware.ts` -> `proxy.ts` (function renamed to
// `proxy`). This runs on every /admin request: it refreshes the Supabase
// session cookie, sets a strict per-request CSP, and redirects based on
// auth state before any page renders.
export async function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          response.headers.set('Content-Security-Policy', csp);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, toSessionCookieOptions(options))
          );
        },
      },
    }
  );

  // getUser() (not getSession()) — it re-validates the token against the
  // Auth server rather than trusting an unverified cookie value.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/admin/login';
  const isMfaPage = pathname === '/admin/mfa-challenge';

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // A password sign-in only reaches aal1. If the account has an enrolled
  // TOTP factor, Supabase reports nextLevel: 'aal2' until the second factor
  // is verified this session — until then, every protected route (and the
  // login page, in case they navigate back to it mid-flow) bounces to the
  // challenge page instead of granting access.
  let needsMfa = false;
  if (user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsMfa = aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2';
  }

  if (user && needsMfa && !isMfaPage) {
    return NextResponse.redirect(new URL('/admin/mfa-challenge', request.url));
  }

  if (user && !needsMfa && (isLoginPage || isMfaPage)) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
