import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export function AuthGuard({ children }) {
  const { user, isInitialLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isInitialLoading) return;
    const hasToken = !!localStorage.getItem('access_token');
    if (!user && !hasToken) { navigate('/login', { replace: true }); }
  }, [user, isInitialLoading, navigate]);

  return <>{children}</>;
}
