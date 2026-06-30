import crypto from 'node:crypto';
import { fetch as dbFetch, query as dbQuery } from './db.js';

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
  const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
  try {
    await dbQuery(
      `INSERT INTO mod_rate_limits (ip_hash, endpoint, hits, window_start) VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE
         hits         = CASE WHEN window_start < ? THEN 1 ELSE hits + 1 END,
         window_start = CASE WHEN window_start < ? THEN NOW() ELSE window_start END`,
      [ipHash, endpoint, cutoff, cutoff]
    );
    const row = await dbFetch('SELECT hits FROM mod_rate_limits WHERE ip_hash = ? AND endpoint = ?', [ipHash, endpoint]);
    return Boolean(row) && Number(row.hits) > limit;
  } catch (e) {
    console.error('[MOD spam] rate-limit DB error:', e.message);
    return false; // fail open
  }
}

export async function isDuplicate(formType, email, subject) {
  try {
    const row = await dbFetch(
      `SELECT id FROM mod_submissions
       WHERE form_type = ? AND email = ? AND subject = ?
         AND submitted_at > NOW() - INTERVAL 1 HOUR
       LIMIT 1`,
      [formType, email, subject]
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
    await dbQuery(
      'INSERT INTO mod_spam_log (ip_hash, endpoint, reason, created_at) VALUES (?, ?, ?, NOW())',
      [hashIp(clientIp(req)), endpoint, reason]
    );
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
