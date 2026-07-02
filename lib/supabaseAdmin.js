// Server-only Supabase access using the service_role key — bypasses RLS
// entirely, so it must never be imported by anything that runs in the
// browser. Used by the spam-protection pipeline (lib/spam.js) and the
// public submissions/subscribe endpoints to write into tables that the
// admin panel (mod4-next) reads, instead of the legacy MySQL database.
const SUPABASE_URL = 'https://gsjhhbzjeiuvcjfazijw.supabase.co';

function serviceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return key;
}

async function request(path, options = {}) {
  const key = serviceKey();
  const res = await fetch(SUPABASE_URL + path, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase ${options.method || 'GET'} ${path} failed: ${res.status} ${text}`);
  }
  // Prefer: return=minimal responds 200/201/204 with an empty body — only
  // parse when there's actually something to parse.
  return text ? JSON.parse(text) : null;
}

export async function sbSelectOne(table, query) {
  const rows = await request(`/rest/v1/${table}?${query}&limit=1`);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export async function sbInsert(table, row, opts = {}) {
  return request(`/rest/v1/${table}`, {
    method: 'POST',
    headers: { Prefer: opts.prefer || 'return=minimal' },
    body: JSON.stringify(row),
  });
}

export async function sbUpdate(table, query, patch) {
  return request(`/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
}
