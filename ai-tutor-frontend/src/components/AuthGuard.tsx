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
      <div className="fixed inset-0 bg-white dark:bg-slate-950 flex flex-col items-center justify-center z-[9999] transition-colors duration-500">
        <div className="w-16 h-16 border-4 border-indigo-500/10 dark:border-indigo-500/20 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin mb-6 shadow-xl shadow-indigo-500/10 dark:shadow-none"></div>
        <p className="text-indigo-600 dark:text-indigo-300 font-black animate-pulse uppercase tracking-[0.3em] text-[11px]">Cấu hình bảo mật...</p>
      </div>
    );
  }

  // Chế độ "Lá chắn an toàn": 
  // Nếu có Token trong LS nhưng React chưa có User -> Đợi thêm chút nữa thay vì hiện ngay trang rỗng
  const hasTokenInLS = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
  if (isInitialLoading && hasTokenInLS) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-950 flex flex-col items-center justify-center z-[9999] transition-colors duration-500">
        <div className="w-16 h-16 border-4 border-indigo-500/10 dark:border-indigo-500/20 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin mb-6 shadow-xl shadow-indigo-500/10 dark:shadow-none"></div>
        <p className="text-indigo-600 dark:text-indigo-300 font-black animate-pulse uppercase tracking-[0.3em] text-[11px]">Đang lấy lại phiên làm việc...</p>
      </div>
    );
  }

  return <>{children}</>;
}
