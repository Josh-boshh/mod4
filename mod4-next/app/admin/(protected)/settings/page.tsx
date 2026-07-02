'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Setting = { name: string; value: string };

// mod_settings is a fixed key/value table (no numeric id, no active/sort_order),
// so it doesn't fit the AdminCrudPage shape used by the other tables — this is
// a plain "edit existing values" form rather than a create/delete list.
function labelFor(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('mod_settings').select('*').order('name');
      if (error) setError(error.message);
      else setSettings((data as Setting[]) ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateValue(name: string, value: string) {
    setSettings((rows) => rows.map((r) => (r.name === name ? { ...r, value } : r)));
    setSavedAt(null);
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    const { error } = await supabase.from('mod_settings').upsert(settings);
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSavedAt(Date.now());
  }

  return (
    <div>
      <h1 className="mb-4 font-heading text-xl text-brand-ink">Settings</h1>

      {error && (
        <p role="alert" className="mb-4 rounded border border-brand-red/20 bg-red-50 px-3 py-2 text-sm text-brand-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-brand-ink-3">Loading…</p>
      ) : (
        <div className="max-w-2xl space-y-4 rounded border border-brand-line bg-brand-paper p-6">
          {settings.map((setting) => (
            <div key={setting.name}>
              <label className="mb-1 block text-sm font-medium text-brand-ink-2">
                {labelFor(setting.name)}
              </label>
              <textarea
                value={setting.value}
                onChange={(e) => updateValue(setting.name, e.target.value)}
                rows={setting.value.length > 60 ? 3 : 1}
                className="w-full rounded border border-brand-line px-3 py-2 text-sm text-brand-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={pending}
              className="rounded bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save Settings'}
            </button>
            {savedAt && <span className="text-sm text-brand-green-2">Saved.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
