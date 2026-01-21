import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - login (Login page)
     * - api (API routes - handled separately or public)
     * - _next/static (Static files)
     * - _next/image (Image optimization files)
     * - favicon.ico, site.webmanifest (PWA Metadata)
     * - sw.js, workbox (PWA Service Worker)
     * - File extensions: .png, .jpg, .svg (Static Images)
     */
    "/((?!login|api|_next/static|_next/image|favicon.ico|site.webmanifest|sw.js|workbox-.*|.*\\.png|.*\\.svg|.*\\.jpg).*)",
  ],
};
