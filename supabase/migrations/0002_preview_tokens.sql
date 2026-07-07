-- Capability-token preview links for draft/inactive content.
--
-- mod_press_items already had a half-built "preview before publish" flow
-- (contentstore.js's previewPress(), wired to a Preview button in the Press
-- Items admin list and a preview banner in press-release.html) but it never
-- actually worked: RLS on mod_press_items restricts anon SELECT to
-- active = true, so an inactive/scheduled item returns zero rows even when
-- fetched directly by slug.
--
-- The tempting fix — relax the SELECT policy to "deleted_at is null"
-- regardless of active — was rejected: RLS conditions can't see *how* a row
-- was reached, only whether the row itself qualifies, so that would make
-- every draft/unpublished row readable by anyone who queries the table
-- directly (no slug needed, fully enumerable via the public anon key), not
-- just reachable via a specific preview link. For a ministry site where
-- "draft" can mean "not yet due to be announced," that's not an acceptable
-- trade-off.
--
-- Instead: each row gets an unguessable preview_token (a random uuid, never
-- returned by any normal listing query — those all `select=*` through
-- policies/queries that don't expose it to anyone but the admin, who's
-- already authenticated). A single security-definer RPC is the only way to
-- fetch a row by slug *and* token together, bypassing the active
-- requirement just for that exact capability. Guessing a valid token is
-- infeasible; the general SELECT policies on all three tables are
-- unchanged.

create extension if not exists pgcrypto;

alter table mod_press_items   add column if not exists preview_token uuid not null default gen_random_uuid();
alter table mod_custom_pages  add column if not exists preview_token uuid not null default gen_random_uuid();
alter table mod_custom_forms  add column if not exists preview_token uuid not null default gen_random_uuid();

create or replace function mod4_preview_row(p_table text, p_slug text, p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  -- Whitelist rather than trusting the caller's table name outright —
  -- format(%I) makes the dynamic query injection-safe either way, but this
  -- also keeps the RPC from ever touching a table it wasn't built for.
  if p_table not in ('mod_press_items', 'mod_custom_pages', 'mod_custom_forms') then
    return null;
  end if;

  execute format(
    'select to_jsonb(t) from %I t where slug = $1 and preview_token = $2 and deleted_at is null limit 1',
    p_table
  ) into result using p_slug, p_token;

  return result;
end;
$$;

grant execute on function mod4_preview_row(text, text, uuid) to anon, authenticated;
