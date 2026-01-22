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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, site.webmanifest (PWA files)
     * - sw.js, workbox-*.js (Service Workers)
     * - login (Login page - excluded to prevent loops)
     * - Public images (svg, png, jpg)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|sw.js|workbox-.*|login|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
