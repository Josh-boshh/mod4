import { rejectForbiddenOrigin, setJsonHeaders } from '../lib/cors.js';
import { getTenders } from '../lib/content.js';
import { defaultTenders } from '../lib/defaultData.js';

function formatList(items) {
  return items.map((t) => {
    let closes = '';
    if (t.closes_at) {
      const ts = Date.parse(t.closes_at);
      if (!Number.isNaN(ts)) {
        closes = new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
    return {
      id: Number(t.id ?? 0),
      title: t.title,
      ref_number: t.ref_number,
      category: t.category,
      method: t.method,
      closes_at: closes,
      // Blob URLs are already absolute — no relative-path prefixing needed.
      doc_url: t.doc_url || '',
      description: t.description,
    };
  });
}

export default async function handler(req, res) {
  setJsonHeaders(res);
  if (rejectForbiddenOrigin(req, res)) return;

  try {
    let tenders = await getTenders('tender', true);
    let awards = await getTenders('award', true);

    if (!tenders.length && !awards.length) {
      const defaults = defaultTenders();
      tenders = defaults.filter((d) => d.type === 'tender');
      awards = defaults.filter((d) => d.type === 'award');
    }

    res.status(200).json({ tenders: formatList(tenders), awards: formatList(awards) });
  } catch (e) {
    console.error('[MOD procurement]', e);
    res.status(500).json({ error: 'Unable to load procurement data.' });
  }
}
