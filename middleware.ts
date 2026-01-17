import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('clickhouse_owl_session');

  // Protected routes
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/tables') ||
                          request.nextUrl.pathname.startsWith('/query') ||
                          request.nextUrl.pathname === '/';

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users from login
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
