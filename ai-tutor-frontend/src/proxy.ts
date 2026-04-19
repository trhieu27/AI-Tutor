import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;

  const publicPages = ['/login', '/register', '/forgot-password'];
  const isPublicPage = publicPages.some(page => pathname.startsWith(page));

  if (!accessToken && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (accessToken && isPublicPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images).*)'],
};
