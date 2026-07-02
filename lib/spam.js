import crypto from 'node:crypto';
import { sbSelectOne, sbInsert, sbUpdate } from './supabaseAdmin.js';

export const SPAM_MIN_ELAPSED_SECONDS = 3;
export const SPAM_SUBMIT_LIMIT = 5;
export const SPAM_SUBMIT_WINDOW = 3600;
export const SPAM_SUB_LIMIT = 3;
export const SPAM_SUB_WINDOW = 3600;
export const SLIDER_TOLERANCE = 14; // px — must match JS SLD_TOL

function spamIpHashKey() {
  return process.env.SPAM_IP_HASH_KEY || 'a3f8c2e1d94b7056af3219084ecbd5f76a018392cf54de2b71093840ebf62c51';
}

export function clientIp(req) {
  const h = req.headers;
  if (h['cf-connecting-ip']) return String(h['cf-connecting-ip']).trim();
  if (h['x-real-ip']) return String(h['x-real-ip']).trim();
  if (h['x-forwarded-for']) return String(h['x-forwarded-for']).split(',')[0].trim();
  return req.socket?.remoteAddress || '0.0.0.0';
}

export function hashIp(ip) {
  return crypto.createHmac('sha256', spamIpHashKey()).update(ip).digest('hex');
}

export function honeypotFilled(body) {
  return String(body.website ?? '').trim() !== '';
}

export function tooFast(body) {
  const loadedAt = parseInt(body.form_loaded_at, 10) || 0;
  if (loadedAt <= 0) return true; // missing = no JS = bot
  const elapsed = Date.now() / 1000 - Math.floor(loadedAt / 1000);
  return elapsed < SPAM_MIN_ELAPSED_SECONDS;
}

export async function rateLimited(req, endpoint, limit, windowSeconds) {
  const ipHash = hashIp(clientIp(req));
  const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const query = `ip_hash=eq.${encodeURIComponent(ipHash)}&endpoint=eq.${encodeURIComponent(endpoint)}`;

  try {
    const existing = await sbSelectOne('mod_rate_limits', `${query}&select=hits,window_start`);

    if (!existing) {
      await sbInsert('mod_rate_limits', { ip_hash: ipHash, endpoint, hits: 1, window_start: new Date().toISOString() });
      return false;
    }

    const expired = new Date(existing.window_start).getTime() < new Date(cutoff).getTime();
    const nextHits = expired ? 1 : Number(existing.hits) + 1;
    await sbUpdate('mod_rate_limits', query, {
      hits: nextHits,
      window_start: expired ? new Date().toISOString() : existing.window_start,
    });
    return nextHits > limit;
  } catch (e) {
    console.error('[MOD spam] rate-limit DB error:', e.message);
    return false; // fail open
  }
}

export async function isDuplicate(formType, email, subject) {
  try {
    const cutoff = new Date(Date.now() - 3600 * 1000).toISOString();
    const row = await sbSelectOne(
      'mod_submissions',
      `form_type=eq.${encodeURIComponent(formType)}&email=eq.${encodeURIComponent(email)}` +
        `&subject=eq.${encodeURIComponent(subject)}&submitted_at=gt.${encodeURIComponent(cutoff)}&select=id`
    );
    return Boolean(row);
  } catch {
    return false; // fail open
  }
}

export function sanitizeText(value, maxLen = 255) {
  const stripped = String(value ?? '').replace(/<[^>]*>/g, '').trim();
  return [...stripped].slice(0, maxLen).join('');
}

export function sanitizeEmail(value) {
  const trimmed = [...String(value ?? '').trim()].slice(0, 191).join('');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  return valid ? trimmed.toLowerCase() : false;
}

export async function log(req, endpoint, reason) {
  try {
    await sbInsert('mod_spam_log', { ip_hash: hashIp(clientIp(req)), endpoint, reason });
  } catch (e) {
    console.error(`[MOD spam] log write failed (${reason}):`, e.message);
  }
}

export function verifyCaptcha(body) {
  const composite = String(body.captcha_response ?? '').trim();
  if (!composite) return false;

  const sep = composite.lastIndexOf(':');
  if (sep === -1) return false;

  const token = composite.slice(0, sep);
  const dropped = composite.slice(sep + 1);

  let decoded;
  try {
    decoded = Buffer.from(token, 'base64').toString('utf8');
  } catch {
    return false;
  }
  if (!decoded) return false;

  const parts = decoded.split(':');
  if (parts.length !== 2) return false;
  const [targetX, ts] = parts;

  if (Math.abs(Date.now() / 1000 - parseInt(ts, 10)) > 600) return false;

  return Math.abs(parseInt(dropped, 10) - parseInt(targetX, 10)) <= SLIDER_TOLERANCE;
}

export async function reject(req, res, endpoint, reason, publicMessage) {
  await log(req, endpoint, reason);
  res.status(400).json({ error: publicMessage });
}
