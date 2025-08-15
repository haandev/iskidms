import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];
const ADMIN_PATHS = ['/admin'];
const AGENT_PATHS = ['/agent'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname) || pathname === '/') {
    return NextResponse.next();
  }

  // Get session from cookie
  const sessionId = request.cookies.get('session_id')?.value;

  if (!sessionId) {
    // No session, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // We'll verify the session in the actual pages using auth.getSession()
  // since middleware runs in Edge Runtime and can't access the database directly

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
