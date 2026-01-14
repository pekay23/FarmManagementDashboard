import { withAuth } from "next-auth/middleware";

// Explicitly export the middleware function
export default withAuth({
  pages: {
    signIn: "/login", // Redirect here if not logged in
  },
});

export const config = {
  // Protect all routes EXCEPT login, api, static files, and images
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
