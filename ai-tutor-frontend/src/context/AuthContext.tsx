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

    console.log(`[AuthContext] [DEBUG] Sync start. User in LS: ${storedUser?.email || 'NONE'}, Token in LS: ${hasToken}`);

    if (storedUser) {
      setUser(storedUser);
      setIsInitialLoading(false);
      console.log(`[AuthContext] [DEBUG] User restored from LS. Loading set to FALSE.`);
    } else if (!hasToken) {
      setUser(null);
      setIsInitialLoading(false);
      console.log(`[AuthContext] [DEBUG] No user, no token. Loading set to FALSE.`);
    }
  }, []);

  const revalidateAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const hasToken = !!localStorage.getItem('access_token');

    if (!hasToken) {
      console.log(`[AuthContext] [DEBUG] Revalidate skipped: No token.`);
      setIsInitialLoading(false);
      return;
    }

    try {
      console.log("[AuthContext] [DEBUG] Calling backend /me...");
      const freshUser = await authService.getCurrentUser();

      if (freshUser) {
        console.log("[AuthContext] [DEBUG] Backend match! User:", freshUser.email);
        setUser(freshUser);
      } else {
        console.warn("[AuthContext] [DEBUG] Backend did NOT return user.");
        if (!getStoredUser()) {
          setUser(null);
          authService.logout();
        }
      }
    } catch (err) {
      console.error("[AuthContext] [DEBUG] Revalidation error:", err);
    } finally {
      setIsInitialLoading(false);
      console.log("[AuthContext] [DEBUG] Sync cycle complete. Loading: FALSE");
    }
  }, []);

  // Sync ngay lập tức
  useLayoutEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  // Revalidate ngầm
  useEffect(() => {
    revalidateAuth();
  }, [pathname, revalidateAuth]);

  useEffect(() => {
    const handleEvents = () => {
      syncFromStorage();
      revalidateAuth();
    };

    window.addEventListener('pageshow', handleEvents);
    window.addEventListener('popstate', handleEvents);
    window.addEventListener('storage', (e) => {
      if (e.key === 'user' || e.key === 'access_token') handleEvents();
    });

    return () => {
      window.removeEventListener('pageshow', handleEvents);
      window.removeEventListener('popstate', handleEvents);
    };
  }, [syncFromStorage, revalidateAuth]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: userData } = await authService.login(email, password);
      const userInstance = createUserInstance(userData);
      setUser(userInstance);
      setIsInitialLoading(false); // Quan trọng: Tắt loading ngay sau khi login
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
      const userInstance = createUserInstance(userData);
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
      setUser(createUserInstance(userData));
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
