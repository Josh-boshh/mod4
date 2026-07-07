import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";

// Matches the public site's typography (assets/css/style.css --font /
// --font-serif) so the admin panel reads as the same product.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "MOD Admin",
  description: "Ministry of Defence — content admin",
};

// The nonce-based CSP in proxy.ts only works for dynamically-rendered
// pages — Next stamps the per-request nonce onto its injected <script>
// tags by reading it back out of the response header, which only exists
// per-request. A statically prerendered page (as /admin/login was, having
// no server-side dynamic data of its own) bakes its <script> tags in at
// build time with no nonce at all, so the CSP's 'strict-dynamic' then
// blocks every script outright — the entire page fails to hydrate, and
// with no fallback non-JS content, that's a blank white screen in
// production only (next dev always renders per-request, so it never
// reproduced there).
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
