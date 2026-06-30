import { requireAdmin, setAuthCookies, issueCsrfCookie, validateCsrf, checkAdminCredentials } from '../../lib/auth.js';
import { renderLoginPage } from '../../lib/adminViews.js';

export default async function handler(req, res) {
  if (requireAdmin(req)) {
    res.writeHead(302, { Location: '/api/admin/index' });
    return res.end();
  }

  let error = null;
  let emailValue = '';

  if (req.method === 'POST') {
    const body = req.body || {};
    const csrf = body.csrf || '';
    const email = String(body.email || '').trim();
    const password = String(body.password || '').trim();
    emailValue = email;

    if (!validateCsrf(req, csrf)) {
      error = 'Invalid form token. Refresh and try again.';
    } else if (!email || !password) {
      error = 'Email and password are required.';
    } else if (!(await checkAdminCredentials(req, email, password))) {
      error = 'Unable to sign in. Check your credentials and try again.';
    } else {
      setAuthCookies(res, email);
      res.writeHead(302, { Location: '/api/admin/index' });
      return res.end();
    }
  }

  const csrf = issueCsrfCookie(res);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(renderLoginPage({ error, csrf, email: emailValue }));
}
