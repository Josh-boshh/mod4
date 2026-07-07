# Supabase migrations

This project's database lives on Supabase. There's no linked Supabase CLI project and no
service-role key available to any of the deployed apps (by design — see below), so migrations
here are **applied by hand**: copy the SQL into the Supabase SQL Editor and run it, in filename
order, then commit the file. This folder exists so schema/policy changes have a reviewable
history instead of living only in SQL-editor run history.

Numbered files (`0001_...`, `0002_...`) are changes that were actually written and applied this
way. `0000_baseline_snapshot.sql` is different — it's not something to run; it's a point-in-time
dump of the policies that existed before this folder started, captured by running the
introspection query at the top of that file and pasting the result back in.

## Conventions

- One file per logical change, numbered sequentially, never edited after it's been applied.
- Every `create policy` / `alter table ... enable row level security` statement should have a
  one-line comment above it explaining *why* the access rule is what it is — RLS bugs are silent
  by nature (a wrong policy just returns zero rows instead of an error), so the reasoning needs
  to survive independently of whoever wrote it.
- No `service_role` key is provisioned to either Vercel project (root static site or
  `mod4-next`) beyond the one already used by the root site's serverless functions for the
  spam-protected public submission endpoints (`lib/supabaseAdmin.js`). Anything that needs to
  bypass RLS from a new surface should go through a `security definer` Postgres function with a
  narrow, deliberate contract (see `0001_login_rate_limit.sql` for the pattern) rather than by
  handing out the service-role key to another project.
