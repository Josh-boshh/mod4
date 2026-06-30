import { clearAuthCookies } from '../../lib/auth.js';

export default async function handler(req, res) {
  clearAuthCookies(res);
  res.writeHead(302, { Location: '/api/admin/login' });
  res.end();
}
