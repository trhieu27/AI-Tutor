import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
export function AuthGuard({
  children
}) {
  const {
    user,
    isInitialLoading
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isInitialLoading) return;
    const hasToken = !!localStorage.getItem('access_token');
    if (!user && !hasToken) {
      navigate('/login', {
        replace: true
      });
    }
  }, [user, isInitialLoading, navigate]);
  return /*#__PURE__*/_jsx(_Fragment, {
    children: children
  });
}