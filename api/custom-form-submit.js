import { setJsonHeaders, rejectForbiddenOrigin } from '../lib/cors.js';
import { sbInsert, sbSelectOne } from '../lib/supabaseAdmin.js';
import * as spam from '../lib/spam.js';

export default async function handler(req, res) {
  setJsonHeaders(res);
  if (rejectForbiddenOrigin(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = req.body || {};

  if (spam.honeypotFilled(body)) {
    return spam.reject(req, res, 'custom-form-submit', 'honeypot', 'Your submission could not be processed. Please try again.');
  }

  if (spam.tooFast(body)) {
    return spam.reject(req, res, 'custom-form-submit', 'too_fast', 'Your submission could not be processed. Please take a moment and try again.');
  }

  if (await spam.rateLimited(req, 'custom-form-submit', spam.SPAM_SUBMIT_LIMIT, spam.SPAM_SUBMIT_WINDOW)) {
    return res.status(429).json({ error: 'Too many submissions. Please wait a while before trying again.' });
  }

  if (!spam.verifyCaptcha(body)) {
    return spam.reject(req, res, 'custom-form-submit', 'captcha_fail', 'Security check failed. Please complete the slider puzzle and try again.');
  }

  const formSlug = spam.sanitizeText(body.form_slug || '', 128);
  if (!formSlug) {
    return res.status(400).json({ error: 'Unknown form.' });
  }

  // Confirm the form actually exists and is active — this also doubles as
  // the source of truth for which field keys are expected, so arbitrary
  // attacker-supplied keys never get persisted.
  const form = await sbSelectOne(
    'mod_custom_forms',
    `slug=eq.${encodeURIComponent(formSlug)}&active=eq.true&deleted_at=is.null&select=fields`
  );
  if (!form) {
    return res.status(404).json({ error: 'This form is no longer available.' });
  }

  const allowedKeys = new Set((form.fields || []).map((f) => f.key));
  const rawData = body.data && typeof body.data === 'object' ? body.data : {};
  const data = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (allowedKeys.has(key) && typeof value === 'string') {
      data[key] = spam.sanitizeText(value, 5000);
    }
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Please fill in the form before submitting.' });
  }

  await sbInsert('mod_form_submissions', { form_slug: formSlug, data });

  return res.status(200).json({ success: true });
}
