-- Press speeches, previously hardcoded in press.html, made admin-editable
-- (see mod4-next/app/admin/(protected)/speeches/page.tsx). Mirrors the RLS
-- shape already used by other public content tables (e.g. mod_press_items):
-- anon can only read active, non-deleted rows; authenticated (the admin
-- panel's logged-in session) has full CRUD.

create table if not exists mod_speeches (
  id bigint generated always as identity primary key,
  category text not null default '',
  quote text not null default '',
  description text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table mod_speeches enable row level security;

create policy "Public can read active speeches" on mod_speeches
  for select
  to anon
  using (active = true and deleted_at is null);

create policy "Authenticated full access to speeches" on mod_speeches
  for all
  to authenticated
  using (true)
  with check (true);

-- Seed with the 3 speeches that were previously hardcoded in press.html, so
-- they don't just disappear from the live site once this table takes over.
insert into mod_speeches (category, quote, description, sort_order) values
  ('Assumption of Duty', 'The protection of Nigeria''s territorial integrity is non-negotiable.', 'Address to officials of the Ministry on assumption of duty as Honourable Minister of Defence.', 1),
  ('National Security', 'Every Nigerian has a role in national security.', 'Remarks to the Veritas University delegation, Ship House, May 2026.', 2),
  ('Regional', 'Collective security in West Africa is a Nigerian priority.', 'Statement at the West African Defence Ministers'' regional security meeting, May 2026.', 3);
