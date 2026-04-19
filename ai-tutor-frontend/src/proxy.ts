import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Kiểm tra cookie access_token
  const accessToken = request.cookies.get('access_token')?.value;

  console.log(`[Proxy] Path: ${pathname}, HasToken: ${!!accessToken}`);

  const authPages = ['/login', '/register', '/forgot-password'];
  const isAuthPage = authPages.some(page => pathname.startsWith(page));

  // 1. Nếu đã đăng nhập mà cố vào trang Auth (Login, Register, Forgot Password)
  if (accessToken && isAuthPage) {
    console.log(`[Proxy] Authenticated user on auth page, redirecting to /`);
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Nếu CHƯA đăng nhập mà vào các trang nội dung (trừ trang Auth và static)
  // Danh sách các route cần bảo vệ
  const protectedRoutes = ['/', '/chat', '/learning', '/mindmap', '/practice', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!accessToken && isProtectedRoute && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images).*)'],
};
