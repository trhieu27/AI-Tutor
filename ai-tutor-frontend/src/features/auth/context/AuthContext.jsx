// @refresh reset — Vite HMR: reset context state on hot reload to avoid stale auth
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Admin, Student } from '@/shared/models/User';
import { authService } from '@/shared/services/auth.service';

const AuthContext = createContext(undefined);

/** Tạo instance User (Admin hoặc Student) từ raw data API */
const createUserInstance = userData => {
  if (!userData) return null;
  try {
    if (userData.role === 'ADMIN') {
      return new Admin(userData.id, userData.full_name, userData.email);
    }
    return new Student(userData.id, userData.full_name, userData.email, userData.student_id, userData.is_pro ?? userData.isPro ?? false);
  } catch (err) {
    return userData;
  }
};
/** Khôi phục user từ localStorage (nếu có) */
const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return createUserInstance(JSON.parse(raw));
  } catch {
    return null;
  }
};
/**
 * Provider quản lý trạng thái xác thực toàn ứng dụng.
 * Hỗ trợ login email/password, Google OAuth, và admin login.
 */
export function AuthProvider({
  children
}) {
  const [user, setUser] = useState(() => getStoredUser());
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    const hasStoredUser = !!getStoredUser();
    const hasToken = !!localStorage.getItem('access_token');
    return hasToken && !hasStoredUser;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('access_token'));
  const syncFromStorage = useCallback(async () => {
    const hasToken = !!localStorage.getItem('access_token');
    if (!hasToken) {
      setUser(null);
      setIsInitialLoading(false);
      return;
    }
    const cached = getStoredUser();
    if (cached) {
      setUser(cached);
      setIsInitialLoading(false);
    }
    try {
      const freshUser = await authService.getCurrentUser();
      if (freshUser) {
        setUser(freshUser);
        setAccessToken(localStorage.getItem('access_token'));
      } else if (!cached) {
        setUser(null);
        setAccessToken(null);
      }
    } catch {
      setAccessToken(localStorage.getItem('access_token'));
    } finally {
      setIsInitialLoading(false);
    }
  }, []);
  useEffect(() => {
    const handleSync = () => syncFromStorage();
    const handleStorage = e => {
      if (e.key === 'user' || e.key === 'access_token') syncFromStorage();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncFromStorage();
    };
    syncFromStorage();
    window.addEventListener('pageshow', handleSync);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pageshow', handleSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [syncFromStorage]);
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const {
        user: userData,
        accessToken: nextAccessToken
      } = await authService.login(email, password);
      const nextUser = createUserInstance(userData);
      setUser(nextUser);
      setAccessToken(nextAccessToken || localStorage.getItem('access_token'));
      setIsInitialLoading(false);
      return nextUser;
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  const register = async (fullName, email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const {
        user: userData,
        accessToken: nextAccessToken
      } = await authService.register(fullName, email, password);
      setUser(createUserInstance(userData));
      setAccessToken(nextAccessToken || localStorage.getItem('access_token'));
      setIsInitialLoading(false);
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  const logout = useCallback((redirectTo = '/login') => {
    setUser(null);
    setAccessToken(null);
    authService.logout();
    window.location.replace(redirectTo);
  }, []);
  const updateUser = useCallback(patch => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = Object.assign(Object.create(Object.getPrototypeOf(prev)), prev, patch);
      try {
        const stored = localStorage.getItem('user');
        if (stored) localStorage.setItem('user', JSON.stringify({
          ...JSON.parse(stored),
          ...patch
        }));
      } catch {}
      return updated;
    });
  }, []);
  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await authService.getCurrentUser();
      if (freshUser) {
        setUser(freshUser);
        setAccessToken(localStorage.getItem('access_token'));
      }
    } catch {}
  }, []);
  const googleLogin = async token => {
    setIsLoading(true);
    setError(null);
    try {
      const {
        user: userData,
        accessToken: nextAccessToken
      } = await authService.googleLogin(token);
      const nextUser = createUserInstance(userData);
      setUser(nextUser);
      setAccessToken(nextAccessToken || localStorage.getItem('access_token'));
      setIsInitialLoading(false);
      return nextUser;
    } catch (err) {
      setError(err.message || 'Google login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  const adminLogin = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const {
        user: userData,
        accessToken: nextAccessToken
      } = await authService.adminLogin(email, password);
      setUser(createUserInstance(userData));
      setAccessToken(nextAccessToken || localStorage.getItem('access_token'));
      setIsInitialLoading(false);
    } catch (err) {
      setError(err.message || 'Admin login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  const contextValue = useMemo(() => ({
    user,
    accessToken,
    isLoading,
    isInitialLoading,
    error,
    setError,
    login,
    googleLogin,
    adminLogin,
    register,
    logout,
    updateUser,
    refreshUser,
    isAuthenticated: !!user
  }), [user, accessToken, isLoading, isInitialLoading, error, logout, updateUser, refreshUser]);
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
/** Hook truy cập AuthContext — phải dùng bên trong AuthProvider */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
