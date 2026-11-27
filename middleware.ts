import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, expectedAuthToken } from '@/lib/site-auth';

export async function middleware(request: NextRequest) {
  const expected = await expectedAuthToken();

  // Fail closed: if SITE_PASSWORD isn't configured, nobody gets in rather
  // than silently leaving the dashboard open to everyone.
  if (!expected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookie !== expected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/parent/:path*'],
};
