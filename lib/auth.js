import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { parse as parseCookieHeader, serialize as serializeCookie } from 'cookie';
import { fetch as dbFetch, query as dbQuery } from './db.js';

const SESSION_COOKIE = 'mod_admin_session';
const CSRF_COOKIE = 'mod_csrf';
const SESSION_MAX_AGE = 7200; // 2 hours, mirrors session.gc_maxlifetime

function jwtSecret() {
  return process.env.JWT_SECRET || '';
}

function spamIpHashKey() {
  return process.env.SPAM_IP_HASH_KEY || 'a3f8c2e1d94b7056af3219084ecbd5f76a018392cf54de2b71093840ebf62c51';
}

export function getCookies(req) {
  return parseCookieHeader(req.headers.cookie || '');
}

export function signAdminToken(email) {
  return jwt.sign({ sub: email }, jwtSecret(), { expiresIn: SESSION_MAX_AGE });
}

export function verifyAdminToken(token) {
  try {
    const payload = jwt.verify(token, jwtSecret());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export function requireAdmin(req) {
  const cookies = getCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const email = verifyAdminToken(token);
  return email ? { email } : null;
}

export function setAuthCookies(res, email) {
  const token = signAdminToken(email);
  appendSetCookie(res, serializeCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }));
}

export function clearAuthCookies(res) {
  appendSetCookie(res, serializeCookie(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  }));
  appendSetCookie(res, serializeCookie(CSRF_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  }));
}

export function issueCsrfCookie(res, existingToken) {
  const token = existingToken || crypto.randomBytes(24).toString('hex');
  appendSetCookie(res, serializeCookie(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }));
  return token;
}

export function getCsrfCookie(req) {
  return getCookies(req)[CSRF_COOKIE] || '';
}

export function validateCsrf(req, submittedToken) {
  const cookieToken = getCsrfCookie(req);
  if (!cookieToken || !submittedToken) return false;
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(String(submittedToken));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function appendSetCookie(res, cookieStr) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', [cookieStr]);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookieStr]);
  } else {
    res.setHeader('Set-Cookie', [existing, cookieStr]);
  }
}

function clientIp(req) {
  const h = req.headers;
  if (h['cf-connecting-ip']) return String(h['cf-connecting-ip']).trim();
  if (h['x-real-ip']) return String(h['x-real-ip']).trim();
  if (h['x-forwarded-for']) return String(h['x-forwarded-for']).split(',')[0].trim();
  return req.socket?.remoteAddress || '0.0.0.0';
}

export async function checkAdminCredentials(req, email, password) {
  // Rate limit: max 10 login attempts per IP per 15 minutes
  const ipHash = crypto.createHmac('sha256', spamIpHashKey()).update(clientIp(req)).digest('hex');
  const cutoff = new Date(Date.now() - 900_000).toISOString().slice(0, 19).replace('T', ' ');
  try {
    await dbQuery(
      `INSERT INTO mod_rate_limits (ip_hash, endpoint, hits, window_start) VALUES (?, 'login', 1, NOW())
       ON DUPLICATE KEY UPDATE
         hits         = CASE WHEN window_start < ? THEN 1 ELSE hits + 1 END,
         window_start = CASE WHEN window_start < ? THEN NOW() ELSE window_start END`,
      [ipHash, cutoff, cutoff]
    );
    const row = await dbFetch('SELECT hits FROM mod_rate_limits WHERE ip_hash = ? AND endpoint = ?', [ipHash, 'login']);
    if (row && Number(row.hits) > 10) {
      console.error('[MOD login] rate-limited IP', ipHash.slice(0, 8));
      return false;
    }
  } catch {
    // fail open on DB error
  }

  const row = await dbFetch('SELECT password_hash FROM mod_admin_users WHERE email = ? LIMIT 1', [email]);
  const valid = row ? await bcrypt.compare(password, row.password_hash) : false;

  if (!row) {
    // Constant-time comparison to prevent timing attacks (user-not-found case)
    await bcrypt.compare(password, '$2a$12$invalidhashpaddingtopreventimingtattackspad');
  }
  return valid;
}

export async function createAdminUser(email, password) {
  const hash = await bcrypt.hash(password, 12);
  await dbQuery('INSERT INTO mod_admin_users (email, password_hash, created_at) VALUES (?, ?, NOW())', [email, hash]);
}
