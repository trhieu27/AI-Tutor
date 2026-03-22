import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for the token in cookies
  const token = request.cookies.get('token')?.value;
  
  // Define public paths that don't need authentication
  // We use paths here assuming /login and /register are under (auth) and their matching paths are /login and /register
  const publicPaths = ['/login', '/register'];
  
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname);

  // If trying to access a protected route without a token
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If trying to access login/register while already authenticated
  if (token && isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
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
