"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isInitialLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isInitialLoading) return;

    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
    
    // Nếu ko có user + ko có token trong LS -> Về login
    if (!user && !hasToken) {
      console.log("[AuthGuard] No user and no token, redirecting to login...");
      router.replace('/login');
    }
  }, [user, isInitialLoading, router, mounted]);

  // Trong khi mount hoặc đang loading khởi tạo
  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[9999]">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-300 font-bold animate-pulse uppercase tracking-[0.2em] text-[10px]">Cấu hình bảo mật...</p>
      </div>
    );
  }

  // Chế độ "Lá chắn an toàn": 
  // Nếu có Token trong LS nhưng React chưa có User -> Đợi thêm chút nữa thay vì hiện ngay trang rỗng
  const hasTokenInLS = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
  if (isInitialLoading && hasTokenInLS) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[9999]">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-300 font-bold animate-pulse uppercase tracking-[0.2em] text-[10px]">Đang lấy lại phiên làm việc...</p>
      </div>
    );
  }

  return <>{children}</>;
}
