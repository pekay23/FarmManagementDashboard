import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Corrected matcher regex to ignore static files and PWA assets
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|sw.js|workbox-.*|login|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
