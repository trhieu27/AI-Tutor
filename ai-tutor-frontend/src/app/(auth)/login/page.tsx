"use client";

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AUTH_TEXTS } from '@/constants/texts';
import AuthBranding from '@/components/AuthBranding';
import GoogleIcon from '@/components/icons/GoogleIcon';
import { useGoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const { user, login, googleLogin: loginWithGoogle, isLoading, error: authError } = useAuth();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // 1. Khôi phục trạng thái khi mount
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
  }, []);


  // 3. Quản lý bộ đếm khóa (Lockout)
  useEffect(() => {
    if (lockoutTimer > 0) {
      const interval = setInterval(() => {
        setLockoutTimer((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            localStorage.removeItem('login_lockout_until');
            setFailedAttempts(0);
            return 0;
          }
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    
    setLocalError('');
    try {
      await login(email, password);
      router.replace('/');
    } catch (err: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 5) {
        const lockoutUntil = Date.now() + 60000;
        localStorage.setItem('login_lockout_until', lockoutUntil.toString());
        setLockoutTimer(60);
      } else {
        const msg = err.message || AUTH_TEXTS.LOGIN.LOGIN_ERROR;
        setLocalError(msg === 'Failed to fetch' ? 'Không thể kết nối tới server.' : msg);
      }
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLocalError('');
      try {
        await loginWithGoogle(tokenResponse.access_token);
        router.replace('/');
      } catch (err: any) {
        setLocalError(err.message || AUTH_TEXTS.GOOGLE.ERROR);
      }
    },
    onError: () => setLocalError(AUTH_TEXTS.GOOGLE.ERROR),
  });

  const displayError = localError || authError;

  return (
    <div className="h-screen flex w-full font-sans bg-white overflow-hidden">
      <AuthBranding />

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center py-12 px-6 sm:px-12 relative overflow-y-auto h-full">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-[#111827] mb-3 tracking-tight">{AUTH_TEXTS.LOGIN.WELCOME_TITLE}</h2>
            <p className="text-[#6b7280] text-[15px] leading-relaxed">{AUTH_TEXTS.LOGIN.WELCOME_SUBTITLE}</p>
          </div>

          <button
            type="button"
            onClick={() => mounted && googleLogin()}
            disabled={isLoading || lockoutTimer > 0}
            className="w-full flex items-center justify-center gap-3 bg-[#f3f4f6] text-[#111827] rounded-xl py-3.5 px-4 font-bold hover:bg-[#e5e7eb] transition-all mb-8 tracking-tight disabled:opacity-50"
          >
            <GoogleIcon size={20} />
            {AUTH_TEXTS.LOGIN.CONTINUE_WITH_GOOGLE}
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gray-100"></div>
            <p className="text-[10px] text-gray-400 font-extrabold tracking-[0.2em] uppercase">{AUTH_TEXTS.LOGIN.OR_LOGIN_WITH_EMAIL}</p>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          {lockoutTimer > 0 ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
              <p className="text-red-600 text-[14px] font-bold text-center">
                {AUTH_TEXTS.LOGIN.RATE_LIMIT_COUNTDOWN?.(lockoutTimer) || `Thử quá nhiều lần. Thử lại sau ${lockoutTimer}s.`}
              </p>
            </div>
          ) : displayError && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-red-700 text-xs font-bold">{displayError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-2">{AUTH_TEXTS.LOGIN.EMAIL_LABEL}</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={AUTH_TEXTS.LOGIN.EMAIL_PLACEHOLDER}
                  className="w-full bg-[#f8fafc] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827]"
                  required
                  disabled={isLoading || lockoutTimer > 0}
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">mail</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[13px] font-bold text-[#374151]">{AUTH_TEXTS.LOGIN.PASSWORD_LABEL}</label>
                <Link href="/forgot-password" className="text-[13px] font-bold text-[#0052ff] hover:underline">
                  {AUTH_TEXTS.LOGIN.FORGOT_PASSWORD}
                </Link>
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={AUTH_TEXTS.LOGIN.PASSWORD_PLACEHOLDER}
                  className="w-full bg-[#f8fafc] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827]"
                  required
                  disabled={isLoading || lockoutTimer > 0}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0052ff] transition-colors focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || lockoutTimer > 0}
              className="w-full bg-[#0052ff] text-white font-bold rounded-xl py-4 mt-4 hover:bg-[#0042cc] active:scale-[0.98] transition-all shadow-[0_8px_20px_-4px_rgba(0,82,255,0.3)] disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed text-sm uppercase tracking-wider"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {AUTH_TEXTS.LOGIN.LOGIN_LOADING}
                </div>
              ) : AUTH_TEXTS.LOGIN.LOGIN_BUTTON}
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
