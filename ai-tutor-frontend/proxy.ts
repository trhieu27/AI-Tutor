import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // TẠM THỜI TẮT BẢO VỆ Ở ĐÂY ĐỂ BẠN VÀO ĐƯỢC GIAO DIỆN CHÍNH
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login'],
};
