import { fetch as dbFetch, safeFetchAll } from '../../lib/db.js';
import { createAdminUser } from '../../lib/auth.js';
import { runMigrations } from '../../lib/migrations.js';
import { saveSetting } from '../../lib/content.js';
import { defaultSettings } from '../../lib/defaultData.js';
import { issueCsrfCookie, validateCsrf } from '../../lib/auth.js';
import { renderSetupPage } from '../../lib/adminViews.js';

async function adminUserExists() {
  const rows = await safeFetchAll('SELECT id FROM mod_admin_users LIMIT 1');
  return rows.length > 0;
}

export default async function handler(req, res) {
  const errors = [];
  let success = null;

  if (req.method === 'POST') {
    const body = req.body || {};
    const setupSecret = process.env.SETUP_SECRET || '';

    if (!setupSecret || body.setup_secret !== setupSecret) {
      errors.push('Invalid or missing setup secret.');
    } else if (!validateCsrf(req, body.csrf || '')) {
      errors.push('Invalid form token. Refresh and try again.');
    } else if (await adminUserExists()) {
      res.status(403).setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(renderSetupPage({ errors: ['Setup has already been completed. This endpoint is now locked.'], success: null, csrf: issueCsrfCookie(res) }));
    } else {
      const email = String(body.admin_email || '').trim();
      const password = String(body.admin_password || '').trim();
      const confirm = String(body.admin_password_confirm || '').trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Please enter a valid administrator email address.');
      }
      if (!password || password.length < 10) {
        errors.push('Please choose a password with at least 10 characters.');
      }
      if (password !== confirm) {
        errors.push('The password confirmation does not match.');
      }

      if (errors.length === 0) {
        await runMigrations();
        const defaults = defaultSettings();
        for (const [key, value] of Object.entries(defaults)) {
          await saveSetting(key, value);
        }
        if (!(await dbFetch('SELECT 1 FROM mod_admin_users WHERE email = ? LIMIT 1', [email]))) {
          await createAdminUser(email, password);
        }
        success = 'Setup complete. You can now log in with the administrator account.';
      }
    }
  }

  const csrf = issueCsrfCookie(res);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(renderSetupPage({ errors, success, csrf }));
}
