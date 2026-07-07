-- Brute-force protection for /api/auth/login (mod4-next).
--
-- The admin login form maps a username to a fixed, guessable email pattern
-- ({username}@mod4.internal) before calling Supabase Auth, so an attacker
-- who knows that pattern can throw unlimited password guesses at it — there
-- was no rate limiting or lockout at all. This adds both in one mechanism:
-- a security-definer RPC that atomically records an attempt and reports
-- whether the caller is still under the limit.
--
-- The underlying table has RLS enabled with NO policies, so it's completely
-- inaccessible via PostgREST directly (no service-role key is available to
-- mod4-next — see supabase/migrations/README.md). Only the RPC, running
-- with the privileges of the function owner, can read or write it. Anon and
-- authenticated are granted EXECUTE on the RPC only.

create table if not exists mod_login_attempts (
  id bigint generated always as identity primary key,
  attempt_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists mod_login_attempts_key_created_idx
  on mod_login_attempts (attempt_key, created_at);

alter table mod_login_attempts enable row level security;
-- Intentionally no policies: this table is reachable only through
-- mod4_login_gate() below, never directly.

create or replace function mod4_login_gate(
  p_key text,
  p_max int default 5,
  p_window_minutes int default 15
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  -- Sweep expired attempts for this key so the table doesn't grow
  -- unboundedly and old attempts don't count toward the current window.
  delete from mod_login_attempts
  where attempt_key = p_key
    and created_at < now() - (p_window_minutes || ' minutes')::interval;

  select count(*) into recent_count
  from mod_login_attempts
  where attempt_key = p_key;

  if recent_count >= p_max then
    return false;
  end if;

  insert into mod_login_attempts (attempt_key) values (p_key);
  return true;
end;
$$;

grant execute on function mod4_login_gate(text, int, int) to anon, authenticated;
