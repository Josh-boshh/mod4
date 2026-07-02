import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Admin usernames map to a deterministic internal email so Supabase Auth
// (which is email-based) can be used with a username-only login form. The
// email is never shown in the UI — only computed here, server-side.
const USERNAME_EMAIL_DOMAIN = 'mod4.internal';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const email = `${username.toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
