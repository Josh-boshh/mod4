-- Homepage milestone counters (previously hardcoded in index.html) become
-- editable through the existing generic Settings page — mod_settings is
-- already a plain name/value table with no schema changes needed, just new
-- rows. Values are stored exactly as displayed (including any "+"/"K+"
-- suffix); render-home.js splits the leading number back out for the
-- count-up animation.

insert into mod_settings (name, value) values
  ('stat_years_of_service', '68'),
  ('stat_personnel_under_oversight', '135K+'),
  ('stat_active_joint_operations', '6'),
  ('stat_peacekeeping_missions', '40+')
on conflict (name) do nothing;
