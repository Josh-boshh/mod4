import { requireAdmin, validateCsrf } from '../../lib/auth.js';
import { saveContentBlob } from '../../lib/content.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = req.body || {};
  const token = body.csrf_token || '';
  const blob = body.blob;

  if (!validateCsrf(req, token) || !requireAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized request.' });
  }

  if (!blob || typeof blob !== 'object' || Array.isArray(blob)) {
    return res.status(400).json({ error: 'Invalid content payload.' });
  }

  try {
    await saveContentBlob(blob);
    res.status(200).json({ success: true });
  } catch (e) {
    console.error('[MOD save]', e);
    res.status(500).json({ error: 'Unable to save content.' });
  }
}
