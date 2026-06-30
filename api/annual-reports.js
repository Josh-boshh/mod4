import { rejectForbiddenOrigin, setJsonHeaders } from '../lib/cors.js';
import { getAnnualReports } from '../lib/content.js';
import { defaultAnnualReports } from '../lib/defaultData.js';

export default async function handler(req, res) {
  setJsonHeaders(res);
  if (rejectForbiddenOrigin(req, res)) return;

  try {
    let reports = await getAnnualReports(true);
    if (!reports.length) reports = defaultAnnualReports();

    const payload = reports.map((r) => ({
      id: Number(r.id ?? 0),
      year: Number(r.year),
      title: r.title,
      description: r.description,
      // Blob URLs are already absolute — no relative-path prefixing needed.
      doc_url: r.doc_url || '',
      status: r.status,
    }));

    res.status(200).json({ reports: payload });
  } catch (e) {
    console.error('[MOD annual-reports]', e);
    res.status(500).json({ error: 'Unable to load reports.' });
  }
}
