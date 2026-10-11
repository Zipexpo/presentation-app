import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const path = req.nextUrl.pathname;
  const token = await getToken({ req });

  // Skip middleware for all API routes so they can handle their own auth
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Public files (icons under /logo icon/, images…) must load for signed-out visitors too, e.g.
  // guests on /student/live/*.
  if (/\.[a-z0-9]+$/i.test(path)) {
    return NextResponse.next();
  }

  // Define public/auth routes (without /auth prefix)
  const publicRoutes = ['/', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/error', '/complete-profile', '/logout'];
  // Signed-in users are sent home from these. /verify-email and /reset-password are not here: a
  // signed-in person must still be able to open the link from their email.
  const authRoutes = ['/login', '/register', '/forgot-password', '/error'];

  // If accessing auth route while authenticated
  if (authRoutes.includes(path) && token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Force users with incomplete profiles to complete them
  if (
    token &&
    token.profileCompleted === false &&
    path !== '/complete-profile' &&
    path !== '/logout'
  ) {
    return NextResponse.redirect(new URL('/complete-profile', req.url));
  }

  // If accessing protected route without auth
  if (!publicRoutes.includes(path) && !token) {
    // Allow guest access to live student page (auth check happens in page/api)
    if (path.startsWith('/student/live/')) {
      return NextResponse.next();
    }

    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(path)}`, req.url)
    );
  }

  // Role-based redirects
  if (path.startsWith('/admin') && token?.role !== 'admin') {
    return NextResponse.redirect(new URL('/403', req.url));
  }

  if (path.startsWith('/teacher') && token?.role !== 'teacher') {
    return NextResponse.redirect(new URL('/403', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
};