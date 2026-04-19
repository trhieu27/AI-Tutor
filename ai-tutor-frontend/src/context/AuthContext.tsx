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
        userData.avatarUrl
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
    return raw ? createUserInstance(JSON.parse(raw)) : null;
  } catch (e) {
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pathname = usePathname();

  const syncFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    const isClient = typeof window !== 'undefined';
    const storedUser = getStoredUser();
    const hasToken = !!localStorage.getItem('access_token');

    if (storedUser) {
      setUser(storedUser);
      setIsInitialLoading(false);
    } else if (!hasToken) {
      setUser(null);
      setIsInitialLoading(false);
    }
  }, []);

  // 2. Kiểm tra với Backend (ĐÃ TẮT THEO YÊU CẦU)
  const revalidateAuth = useCallback(async () => {
    // Chúng ta chỉ dựa vào LocalStorage để tối ưu tốc độ và tránh lỗi 404
    setIsInitialLoading(false);
  }, []);

  // Effect tổng quản lý việc đồng bộ khi Mount, Chuyển trang (pathname) và Browser Events
  useEffect(() => {
    const handleSync = () => {
      syncFromStorage();
      revalidateAuth();
    };

    // Chạy khi mount hoặc pathname thay đổi
    handleSync();

    // Lắng nghe các sự kiện trình duyệt
    window.addEventListener('pageshow', handleSync);
    window.addEventListener('popstate', handleSync);
    window.addEventListener('storage', (e) => {
      if (e.key === 'user' || e.key === 'access_token') handleSync();
    });
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('pageshow', handleSync);
      window.removeEventListener('popstate', handleSync);
    };
  }, [pathname, syncFromStorage, revalidateAuth]);

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
    isAuthenticated: !!user,
  }), [user, isLoading, isInitialLoading, error, logout]);

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
