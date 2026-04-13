import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // TẠM THỜI TẮT BẢO VỆ ĐỂ BẠN VÀO ĐƯỢC GIAO DIỆN
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
