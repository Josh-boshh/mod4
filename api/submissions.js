import { setJsonHeaders } from '../lib/cors.js';
import { requireAdmin } from '../lib/auth.js';
import { query as dbQuery, safeFetchAll } from '../lib/db.js';
import { sbInsert } from '../lib/supabaseAdmin.js';
import * as spam from '../lib/spam.js';

const ALLOWED_TYPES = ['contact', 'foi', 'servicom'];
const RESERVED_FIELDS = ['form_type', 'name', 'email', 'website', 'form_loaded_at', 'captcha_response'];

export default async function handler(req, res) {
  setJsonHeaders(res);
  const method = req.method;

  // ── GET: list submissions (admin only) ──────────────────────────────────
  if (method === 'GET') {
    const admin = requireAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Unauthorized.' });

    const type = req.query.type || '';
    let sql = 'SELECT * FROM mod_submissions';
    const params = [];
    if (type) {
      sql += ' WHERE form_type = ?';
      params.push(type);
    }
    sql += ' ORDER BY submitted_at DESC';
    const rows = await safeFetchAll(sql, params);
    const submissions = rows.map((row) => {
      let meta = {};
      if (row.meta) {
        try {
          const decoded = typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta;
          meta = decoded && typeof decoded === 'object' ? decoded : {};
        } catch {
          meta = {};
        }
      }
      return { ...row, meta };
    });
    return res.status(200).json({ submissions });
  }

  // ── DELETE: remove a submission (admin only) ────────────────────────────
  if (method === 'DELETE') {
    const admin = requireAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Unauthorized.' });

    const id = Number(req.body?.id ?? 0);
    if (!id) return res.status(400).json({ error: 'Submission ID is required.' });

    await dbQuery('DELETE FROM mod_submissions WHERE id = ?', [id]);
    return res.status(200).json({ success: true });
  }

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // ── POST: receive a public form submission ──────────────────────────────
  const body = req.body || {};

  if (spam.honeypotFilled(body)) {
    return spam.reject(req, res, 'submissions', 'honeypot', 'Your submission could not be processed. Please try again.');
  }

  if (spam.tooFast(body)) {
    return spam.reject(req, res, 'submissions', 'too_fast', 'Your submission could not be processed. Please take a moment to review your message and try again.');
  }

  if (await spam.rateLimited(req, 'submissions', spam.SPAM_SUBMIT_LIMIT, spam.SPAM_SUBMIT_WINDOW)) {
    return res.status(429).json({ error: 'Too many submissions. Please wait a while before trying again.' });
  }

  if (!spam.verifyCaptcha(body)) {
    return spam.reject(req, res, 'submissions', 'captcha_fail', 'Security check failed. Please complete the slider puzzle and try again.');
  }

  const formType = spam.sanitizeText(body.form_type || '', 32);
  if (!ALLOWED_TYPES.includes(formType)) {
    return res.status(400).json({ error: 'Unknown form type.' });
  }

  const name = spam.sanitizeText(body.name || '', 255);
  const email = spam.sanitizeEmail(body.email || '');

  if (!name) return res.status(400).json({ error: 'Full name is required.' });
  if (!email) return res.status(400).json({ error: 'A valid email address is required.' });

  let subject;
  if (formType === 'contact') {
    const subjectRaw = spam.sanitizeText(body.subject || '', 255);
    const message = spam.sanitizeText(body.message || '', 5000);
    if (!subjectRaw || !message) return res.status(400).json({ error: 'Subject and message are required.' });
    subject = subjectRaw;
  } else if (formType === 'foi') {
    const subjectRaw = spam.sanitizeText(body.subject || '', 255);
    const details = spam.sanitizeText(body.details || '', 5000);
    if (!subjectRaw || !details) return res.status(400).json({ error: 'Subject and request details are required.' });
    subject = subjectRaw;
  } else if (formType === 'servicom') {
    const where = spam.sanitizeText(body.where || '', 255);
    const details = spam.sanitizeText(body.details || '', 5000);
    if (!where || !details) return res.status(400).json({ error: 'Location and complaint details are required.' });
    subject = where || '(SERVICOM complaint)';
  } else {
    subject = '(submission)';
  }

  if (await spam.isDuplicate(formType, email, subject)) {
    // Return a success-like message so legitimate double-submitters aren't confused
    return res.status(200).json({ success: true });
  }

  const meta = {};
  for (const [k, v] of Object.entries(body)) {
    if (!RESERVED_FIELDS.includes(k) && typeof v === 'string') {
      meta[k] = spam.sanitizeText(v, 5000);
    }
  }

  await sbInsert('mod_submissions', { form_type: formType, name, email, subject, meta });

  return res.status(200).json({ success: true });
}
