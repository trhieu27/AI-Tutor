'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Student } from '@/models/User';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';

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

// Helper function to get initial user from localStorage
const getInitialUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;
    const userData = JSON.parse(storedUser);

    if (userData.role === 'student' || userData.student_id) {
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
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Sync auth state on mount and keep isInitialLoading accurate
  useEffect(() => {
    const initialUser = getInitialUser();
    if (initialUser) {
      setUser(initialUser);
      
      // Khôi phục cookie nếu bị mất (quan trọng cho Middleware/proxy.ts)
      if (typeof window !== 'undefined') {
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (accessToken && !document.cookie.includes('access_token')) {
          document.cookie = `access_token=${accessToken}; path=/; max-age=3600`;
        }
        if (refreshToken && !document.cookie.includes('refresh_token')) {
          document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
        }
      }
    }
    setIsInitialLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: userData, accessToken, refreshToken } = await authService.login(email, password);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      document.cookie = `access_token=${accessToken}; path=/; max-age=3600`;
      document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.message || 'Đăng nhập thất bại';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: userData, accessToken, refreshToken } = await authService.googleLogin(token);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      document.cookie = `access_token=${accessToken}; path=/; max-age=3600`;
      document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
    } catch (err: any) {
      console.error('Google login context error:', err);
      const msg = err.message || 'Đăng nhập Google thất bại';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: userData, accessToken, refreshToken } = await authService.register(fullName, email, password);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      document.cookie = `access_token=${accessToken}; path=/; max-age=3600`;
      document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
    } catch (err: any) {
      console.error('Registration error:', err);
      const msg = err.message || 'Đăng ký thất bại';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    const cookies = ['access_token', 'refresh_token'];
    cookies.forEach(name => {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
    });
    authService.logout();
    window.location.replace('/login');
  };

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
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
