"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AUTH_TEXTS } from '@/constants/texts';
import AuthBranding from '@/components/AuthBranding';
import GoogleIcon from '@/components/icons/GoogleIcon';
import { useGoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { user, login, googleLogin: loginWithGoogle, isLoading, isInitialLoading } = useAuth();
   const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Khôi phục trạng thái khóa từ LocalStorage khi mount
  useEffect(() => {
    setMounted(true);
    
    const storedLockoutUntil = localStorage.getItem('login_lockout_until');
    if (storedLockoutUntil) {
      const remaining = Math.ceil((parseInt(storedLockoutUntil) - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutTimer(remaining);
        setFailedAttempts(5);
      } else {
        localStorage.removeItem('login_lockout_until');
      }
    }

    if (user && !isInitialLoading) {
      router.replace('/');
    }
  }, [user, isInitialLoading, router]);

  // Bộ đếm ngược và đồng bộ với LocalStorage
  useEffect(() => {
    if (lockoutTimer > 0) {
      const interval = setInterval(() => {
        setLockoutTimer((prev) => {
          const nextValue = prev - 1;
          if (nextValue <= 0) {
            localStorage.removeItem('login_lockout_until');
            setFailedAttempts(0);
            return 0;
          }
          return nextValue;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
       const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 5) {
        const lockoutUntil = Date.now() + 60000;
        localStorage.setItem('login_lockout_until', lockoutUntil.toString());
        setLockoutTimer(60); 
        setError(AUTH_TEXTS.LOGIN.RATE_LIMIT_COUNTDOWN?.(60) || `Thử quá nhiều lần. Vui lòng thử lại sau 60 giây.`);
      } else {
        const errorMessage = err.message || AUTH_TEXTS.LOGIN.LOGIN_ERROR;
        setError(errorMessage === 'Failed to fetch'
          ? 'Lỗi kết nối: Không thể kết nối tới máy chủ (Backend).'
          : errorMessage);
      }
      console.error('Login error:', err);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('Google login success:', tokenResponse);
      try {
        await loginWithGoogle(tokenResponse.access_token);
        router.push('/');
      } catch (err: any) {
        setError(err.message || AUTH_TEXTS.GOOGLE.ERROR);
      }
    },
    onError: () => {
      console.log('Login Failed');
      setError(AUTH_TEXTS.GOOGLE.ERROR);
    },
  });

  const handleGoogleLogin = () => {
    if (mounted) {
      googleLogin();
    }
  };

  return (
    <div className="h-screen flex w-full font-sans bg-white overflow-hidden">
      <AuthBranding />

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center py-12 px-6 sm:px-12 relative overflow-y-auto h-full">
        <div className="w-full max-w-[420px]">
          <div className="mb-12 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-[#111827] mb-4 tracking-tight">{AUTH_TEXTS.LOGIN.WELCOME_TITLE}</h2>
            <p className="text-[#6b7280] text-[15px] leading-relaxed">{AUTH_TEXTS.LOGIN.WELCOME_SUBTITLE}</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#f3f4f6] text-[#111827] rounded-xl py-4 px-4 font-bold hover:bg-[#e5e7eb] transition-colors mb-10 tracking-tight"
          >
            <GoogleIcon size={20} />
            {AUTH_TEXTS.LOGIN.CONTINUE_WITH_GOOGLE}
          </button>

          <div className="flex items-center gap-4 mb-10">
            <div className="flex-1 h-px bg-gray-200"></div>
            <p className="text-[10px] text-gray-400 font-extrabold tracking-[0.2em] uppercase">{AUTH_TEXTS.LOGIN.OR_LOGIN_WITH_EMAIL}</p>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {lockoutTimer > 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-600 text-[15px] font-medium text-center">
                {AUTH_TEXTS.LOGIN.RATE_LIMIT_COUNTDOWN?.(lockoutTimer) || `Thử quá nhiều lần. Vui lòng thử lại sau ${lockoutTimer} giây.`}
              </p>
            </div>
          ) : error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-bold text-[#374151] mb-2">{AUTH_TEXTS.LOGIN.EMAIL_LABEL}</label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={AUTH_TEXTS.LOGIN.EMAIL_PLACEHOLDER}
                  className="w-full bg-[#f4f6fa] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827] placeholder-gray-400"
                  required
                  disabled={isLoading || lockoutTimer > 0}
                />
                <span className="material-symbols-outlined absolute right-4 text-gray-400">mail</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-[#374151]">{AUTH_TEXTS.LOGIN.PASSWORD_LABEL}</label>
                <Link href="/forgot-password" className="text-sm font-bold text-[#0052ff] hover:underline">
                  {AUTH_TEXTS.LOGIN.FORGOT_PASSWORD}
                </Link>
              </div>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={AUTH_TEXTS.LOGIN.PASSWORD_PLACEHOLDER}
                  className="w-full bg-[#f4f6fa] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827] placeholder-gray-400"
                  required
                  disabled={isLoading || lockoutTimer > 0}
                />
                <span className="material-symbols-outlined absolute right-4 text-gray-400">lock</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || lockoutTimer > 0}
              className="w-full bg-[#0052ff] text-white font-bold rounded-xl py-3.5 mt-4 hover:bg-[#0042cc] transition-colors shadow-[0_4px_12px_rgba(0,82,255,0.25)] disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? AUTH_TEXTS.LOGIN.LOGIN_LOADING : AUTH_TEXTS.LOGIN.LOGIN_BUTTON}
            </button>
          </form>

          <p className="text-center text-[#6b7280] text-[14px] mt-8">
            {AUTH_TEXTS.LOGIN.NO_ACCOUNT} <Link href="/register" className="font-bold text-[#0052ff] hover:underline">{AUTH_TEXTS.LOGIN.REGISTER_NOW}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
