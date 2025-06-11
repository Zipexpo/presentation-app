import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const path = req.nextUrl.pathname;
  const token = await getToken({ req });

  // Define public/auth routes (without /auth prefix)
  const publicRoutes = ['/','/login', '/register', '/verify-email'];
  const authRoutes = ['/login', '/register', '/verify-email', '/error'];

  // If accessing auth route while authenticated
  if (authRoutes.includes(path) && token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // If accessing protected route without auth
  if (!publicRoutes.includes(path) && !token) {
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