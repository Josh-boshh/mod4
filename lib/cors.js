// "defence.gov.ng" is the domain this site's own canonical/meta tags refer
// to, but it isn't where anything is actually deployed — kept here in case
// that domain is ever attached to the project for real.
const ALLOWED_ORIGINS = ['https://defence.gov.ng', 'http://localhost', 'http://127.0.0.1'];

// Mirrors the same-origin check duplicated across every admin/api/*.php file.
// Returns true if the request was rejected (caller should stop handling it).
//
// Vercel assigns a new *.vercel.app URL per project (and another one per
// preview deployment), so a static allowlist can't enumerate every valid
// origin. Instead, treat same-origin requests as always allowed by comparing
// the Origin header's host against the request's own Host header, and use
// ALLOWED_ORIGINS only for origins that are legitimately different from the
// host actually serving the request.
export function rejectForbiddenOrigin(req, res) {
  const origin = req.headers.origin || '';
  if (!origin) return false; // no Origin header — not a browser cross-origin/same-origin fetch

  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    // malformed Origin header — fall through to the explicit allowlist check
  }

  if (originHost && originHost === req.headers.host) return false;
  if (ALLOWED_ORIGINS.includes(origin.replace(/\/$/, ''))) return false;

  res.status(403).json({ error: 'Forbidden.' });
  return true;
}

export function setJsonHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
}
