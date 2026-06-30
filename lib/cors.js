const ALLOWED_ORIGINS = ['https://defence.gov.ng', 'http://localhost', 'http://127.0.0.1'];

// Mirrors the same-origin check duplicated across every admin/api/*.php file.
// Returns true if the request was rejected (caller should stop handling it).
export function rejectForbiddenOrigin(req, res) {
  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGINS.includes(origin.replace(/\/$/, ''))) {
    res.status(403).json({ error: 'Forbidden.' });
    return true;
  }
  return false;
}

export function setJsonHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
}
