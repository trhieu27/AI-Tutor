'use client';

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { User, Student } from '@/models/User';
import { authService } from '@/services/auth.service';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isInitialLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (token: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  /** Cập nhật một phần thông tin user (tên...) mà không cần login lại */
  updateUser: (patch: Partial<{ full_name: string; isPro: boolean }>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const createUserInstance = (userData: any): User | null => {
  if (!userData) return null;
  try {
    // Chấp nhận cả lowercase và uppercase cho role
    const isStudent = userData.student_id ||
      userData.role === 'student' ||
      userData.role === 'STUDENT';

    if (isStudent) {
      return new Student(
        userData.id,
        userData.full_name,
        userData.email,
        userData.student_id,
        userData.is_pro ?? userData.isPro ?? false
      );
    }
    return userData;
  } catch (err) {
    console.error("[AuthContext] Error creating user instance:", err);
    return userData;
  }
};

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const meta = JSON.parse(raw);
    return createUserInstance(meta);
  } catch (e) {
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Đọc user từ localStorage NGAY lần render đầu — không cần đợi useEffect
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    return getStoredUser();
  });
  // isInitialLoading = false ngay nếu đã có dữ liệu, true nếu cần fetch
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const hasStoredUser = !!getStoredUser();
    const hasToken = !!localStorage.getItem('access_token');
    // Nếu đã có user trong LS → không loading
    // Nếu có token nhưng chưa có user → cần fetch (loading)
    // Nếu không có gì → không loading (guest)
    return hasToken && !hasStoredUser;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pathname = usePathname();

  /**
   * Sync theo 2 pha:
   * 1. LS cache — hiện ngầy (không flash)
   * 2. Backend /users/me — luôn verify (quan trọng cho đa thiết bị)
   */
  const syncFromStorage = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const hasToken = !!localStorage.getItem('access_token');

    if (!hasToken) {
      // Không có token — guest, kết thúc ngay
      setUser(null);
      setIsInitialLoading(false);
      return;
    }

    // Pha 1: hiện cache ngầy (nếu có)
    const cached = getStoredUser();
    if (cached) {
      setUser(cached);
      setIsInitialLoading(false);
    }

    // Pha 2: luôn fetch từ backend — cập nhật is_pro, full_name mới nhất
    try {
      const freshUser = await authService.getCurrentUser();
      if (freshUser) {
        setUser(freshUser);
      } else if (!cached) {
        // Token hết hạn hoặc bị thu hồi
        setUser(null);
      }
    } catch {
      // Lỗi mạng — tiếp tục dùng cache nếu có
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  // Effect tổng quản lý sync — bao gồm bfcache (back/forward)
  useEffect(() => {
    const handleSync = () => { syncFromStorage(); };
    const handlePageShow = (e: PageTransitionEvent) => { handleSync(); };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'access_token') handleSync();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleSync();
    };

    // Chạy khi mount hoặc pathname thay đổi
    handleSync();

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handleSync);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handleSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pathname, syncFromStorage]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: userData } = await authService.login(email, password);
      console.log("[AuthContext] Login success raw data:", userData);
      const userInstance = createUserInstance(userData);
      console.log("[AuthContext] User instance created:", userInstance);
      setUser(userInstance);
      setIsInitialLoading(false);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: userData } = await authService.register(fullName, email, password);
      console.log("[AuthContext] Register success raw data:", userData);
      const userInstance = createUserInstance(userData);
      console.log("[AuthContext] User instance created:", userInstance);
      setUser(userInstance);
      setIsInitialLoading(false);
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    authService.logout();
    window.location.replace('/login');
  }, []);

  /** Patch user state + localStorage với data mới (tên...) */
  const updateUser = useCallback((patch: Partial<{ full_name: string; isPro: boolean }>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = Object.assign(Object.create(Object.getPrototypeOf(prev)), prev, patch);
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const meta = JSON.parse(stored);
          localStorage.setItem('user', JSON.stringify({ ...meta, ...patch }));
        }
      } catch {}
      return updated;
    });
  }, []);

  const googleLogin = async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: userData } = await authService.googleLogin(token);
      console.log("[AuthContext] Google Login success raw data:", userData);
      const userInstance = createUserInstance(userData);
      console.log("[AuthContext] User instance created:", userInstance);
      setUser(userInstance);
      setIsInitialLoading(false);
    } catch (err: any) {
      setError(err.message || 'Google login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    isInitialLoading,
    error,
    setError,
    login,
    googleLogin,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  }), [user, isLoading, isInitialLoading, error, logout, updateUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
