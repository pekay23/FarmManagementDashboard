import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  
  // Allow auth pages and API routes without token check
  if (isAuthPage || isApiRoute) {
    return NextResponse.next();
  }
  
  // Redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isSuperAdmin = Boolean(token.is_superadmin);
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  if (isSuperAdmin && !isAdminRoute) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (!isSuperAdmin && isAdminRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|sw.js|workbox-.*|login|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
