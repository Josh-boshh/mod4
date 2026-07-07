-- Baseline snapshot placeholder.
--
-- This isn't a migration to run — it's a record of the RLS policies that
-- already existed on the live database before this migrations folder
-- started. Run the query below in the Supabase SQL Editor and paste the
-- result back in (as a comment block, or as a follow-up
-- 0000_baseline_snapshot_actual.sql) so the pre-existing policy set has a
-- committed record somewhere, instead of only living in Supabase's
-- dashboard/run history.

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Also worth capturing once, for the same reason — which tables have RLS
-- enabled at all:
--
-- select relname, relrowsecurity
-- from pg_class
-- where relnamespace = 'public'::regnamespace and relkind = 'r'
-- order by relname;
