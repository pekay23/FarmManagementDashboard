export { default } from "next-auth/middleware";

export const config = {
  // Protects all routes EXCEPT login, api, and static files
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
