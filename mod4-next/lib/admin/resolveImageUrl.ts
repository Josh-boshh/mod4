// Older rows store image paths relative to the public site (e.g.
// "assets/images/directors/foo.jpg") — correct on the public site itself,
// but this admin panel is a separate Vercel deployment, so a bare relative
// path 404s here. Anything already absolute (http(s):// or a data: URI) is
// left untouched. Note: "defence.gov.ng" only appears as a placeholder
// domain in the public site's own canonical/meta tags — the actual deployed
// public site lives at mod3-nine.vercel.app.
const PUBLIC_SITE_URL = 'https://mod3-nine.vercel.app';

export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
  return `${PUBLIC_SITE_URL}/${url.replace(/^\/+/, '')}`;
}
