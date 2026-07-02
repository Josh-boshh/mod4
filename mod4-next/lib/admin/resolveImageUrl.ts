import { PUBLIC_SITE_URL } from './publicSiteUrl';

// Older rows store image paths relative to the public site (e.g.
// "assets/images/directors/foo.jpg") — correct on the public site itself,
// but this admin panel is a separate Vercel deployment, so a bare relative
// path 404s here. Anything already absolute (http(s):// or a data: URI) is
// left untouched.
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
  return `${PUBLIC_SITE_URL}/${url.replace(/^\/+/, '')}`;
}
