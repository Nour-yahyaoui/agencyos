import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/safe-next';

const PROTECTED = [
  '/dashboard', '/clients', '/projects', '/tasks', '/documents', '/team',
  '/support', '/billing', '/analytics', '/assistant', '/notifications', '/settings', '/admin', '/portal',
];
const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];


/**
 * Reads `exp` without verifying the signature. This is a routing hint, not an authorisation
 * decision — the API still verifies every request. Checking expiry here is what stops an
 * expired access cookie from bouncing a signed-out user between /login and /dashboard forever.
 */
function hasLiveAccessToken(request: NextRequest): boolean {
  const token = request.cookies.get('agencyos_access')?.value;
  if (!token) return false;
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' && json.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = hasLiveAccessToken(request);
  const hasSession = Boolean(request.cookies.get('agencyos_refresh')?.value);

  if (AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && signedIn) {
    return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get('next')), request.url));
  }

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !signedIn && !hasSession) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
