import { rejectForbiddenOrigin, setJsonHeaders } from '../lib/cors.js';
import { getDirectors } from '../lib/content.js';

export default async function handler(req, res) {
  setJsonHeaders(res);
  if (rejectForbiddenOrigin(req, res)) return;

  try {
    const rows = await getDirectors();
    const bySlug = {};
    for (const row of rows) {
      bySlug[row.dept_slug] = {
        director: row.director,
        role: row.role,
        photo_url: row.photo_url,
      };
    }
    res.status(200).json({ directors: bySlug });
  } catch (e) {
    console.error('[MOD directors]', e);
    res.status(500).json({ error: 'Unable to load directors.' });
  }
}
