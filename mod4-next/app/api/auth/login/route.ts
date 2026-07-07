import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Admin usernames map to a deterministic internal email so Supabase Auth
// (which is email-based) can be used with a username-only login form. The
// email is never shown in the UI — only computed here, server-side.
const USERNAME_EMAIL_DOMAIN = 'mod4.internal';

// That deterministic email pattern also means the login endpoint has no
// rate limiting of its own to lean on — an attacker who knows the pattern
// could otherwise throw unlimited password guesses at it. mod4_login_gate
// (see supabase/migrations/0001_login_rate_limit.sql) tracks attempts by
// hashed IP server-side, behind RLS, reachable only via this RPC.
function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

function rateLimitKey(request: Request): string {
  return createHash('sha256').update(clientIp(request)).digest('hex');
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const email = `${username.toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;

  const supabase = await createClient();

  const { data: allowed, error: gateError } = await supabase.rpc('mod4_login_gate', {
    p_key: rateLimitKey(request),
  });
  // Fail open on an RPC error (e.g. migration not applied yet) — a broken
  // rate limiter shouldn't be able to lock legitimate admins out entirely.
  if (!gateError && allowed === false) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
