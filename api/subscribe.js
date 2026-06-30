import { setJsonHeaders } from '../lib/cors.js';
import { requireAdmin } from '../lib/auth.js';
import { fetch as dbFetch, query as dbQuery } from '../lib/db.js';
import { getSubscribers } from '../lib/content.js';
import * as spam from '../lib/spam.js';

export default async function handler(req, res) {
  setJsonHeaders(res);
  const method = req.method;

  // ── GET: list subscribers (admin only) ──────────────────────────────────
  if (method === 'GET') {
    const admin = requireAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Unauthorized.' });
    const subscribers = await getSubscribers();
    return res.status(200).json({ subscribers });
  }

  // ── DELETE: unsubscribe (admin only) ─────────────────────────────────────
  if (method === 'DELETE') {
    const admin = requireAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Unauthorized.' });

    const email = spam.sanitizeEmail(req.body?.email || '');
    if (!email) return res.status(400).json({ error: 'A valid email address is required.' });

    await dbQuery('DELETE FROM mod_subscribers WHERE email = ?', [email]);
    return res.status(200).json({ success: true });
  }

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // ── POST: public subscription ────────────────────────────────────────────
  const body = req.body || {};
  const action = body.action || 'add';

  if (spam.honeypotFilled(body)) {
    return spam.reject(req, res, 'subscribe', 'honeypot', 'Your request could not be processed. Please try again.');
  }

  if (spam.tooFast(body)) {
    return spam.reject(req, res, 'subscribe', 'too_fast', 'Your request could not be processed. Please try again in a moment.');
  }

  if (await spam.rateLimited(req, 'subscribe', spam.SPAM_SUB_LIMIT, spam.SPAM_SUB_WINDOW)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a while before trying again.' });
  }

  if (!spam.verifyCaptcha(body)) {
    return spam.reject(req, res, 'subscribe', 'captcha_fail', 'Security check failed. Please complete the slider puzzle and try again.');
  }

  const email = spam.sanitizeEmail(body.email || '');
  if (!email) return res.status(400).json({ error: 'A valid email address is required.' });

  if (action === 'add') {
    const existing = await dbFetch('SELECT 1 FROM mod_subscribers WHERE email = ? LIMIT 1', [email]);
    if (existing) {
      // Return success so bots can't enumerate valid addresses
      return res.status(200).json({ success: true });
    }

    await dbQuery(
      'INSERT INTO mod_subscribers (email, subscribed_at) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE email = email',
      [email]
    );
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Invalid action.' });
}
