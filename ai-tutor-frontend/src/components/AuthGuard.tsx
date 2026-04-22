"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isInitialLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isInitialLoading) return;

    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');

    if (!user && !hasToken) {
      router.replace('/login');
    }
  }, [user, isInitialLoading, router, mounted]);

  // Không chặn render — tránh hiện splash screen khi F5
  return <>{children}</>;
}
