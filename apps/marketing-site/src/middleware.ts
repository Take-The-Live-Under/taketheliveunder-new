import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for the shared session cookie set by BetterAuth in the Product App
  // BetterAuth uses "taketheliveunder.session_token" due to the cookiePrefix setting
  const sessionToken = request.cookies.get('taketheliveunder.session_token');

  // We only run this on the root URL or explicit entrance pages
  if (sessionToken && request.nextUrl.pathname === '/') {
    // Redirect authenticated users to the main product dashboard
    // Default to app.taketheliveunder.com in production, or localhost in dev
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.taketheliveunder.com';
    return NextResponse.redirect(new URL(appUrl));
  }

  // If there's no session, or they are on another route (like /about), proceed normally
  return NextResponse.next();
}

// Ensure the middleware only executes on defined paths
export const config = {
  matcher: [
    '/',
    '/login',
    '/signup'
  ],
};
