"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AUTH_TEXTS } from '@/constants/texts';
import AuthBranding from '@/components/AuthBranding';
import GoogleIcon from '@/components/icons/GoogleIcon';
import { useGoogleLogin } from '@react-oauth/google';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const { user, register, googleLogin: loginWithGoogle, isLoading, error: authError } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError(AUTH_TEXTS.REGISTER.PASSWORD_MISMATCH);
      return;
    }

    try {
      await register(name, email, password);
      router.replace('/');
    } catch (err: any) {
      setLocalError(err?.message || AUTH_TEXTS.REGISTER.REGISTER_ERROR);
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
    <div className="min-h-[100dvh] flex w-full font-sans bg-white">
      <AuthBranding />

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center py-12 px-6 sm:px-12 relative overflow-y-auto h-full">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-[#111827] mb-3 tracking-tight">{AUTH_TEXTS.REGISTER.WELCOME_TITLE}</h2>
            <p className="text-[#6b7280] text-[15px] leading-relaxed">{AUTH_TEXTS.REGISTER.WELCOME_SUBTITLE}</p>
          </div>

          <button
            type="button"
            onClick={() => mounted && googleLogin()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-[#f3f4f6] text-[#111827] rounded-xl py-3.5 px-4 font-bold hover:bg-[#e5e7eb] transition-all mb-8 tracking-tight disabled:opacity-50"
          >
            <GoogleIcon size={20} />
            {AUTH_TEXTS.REGISTER.CONTINUE_WITH_GOOGLE}
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gray-100"></div>
            <p className="text-[10px] text-gray-400 font-extrabold tracking-[0.2em] uppercase">{AUTH_TEXTS.REGISTER.OR_REGISTER_WITH_EMAIL}</p>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          {displayError && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-red-700 text-xs font-bold">{displayError}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-2">{AUTH_TEXTS.REGISTER.NAME_LABEL}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={AUTH_TEXTS.REGISTER.NAME_PLACEHOLDER}
                className="w-full bg-[#f8fafc] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827]"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-2">{AUTH_TEXTS.REGISTER.EMAIL_LABEL}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={AUTH_TEXTS.REGISTER.EMAIL_PLACEHOLDER}
                className="w-full bg-[#f8fafc] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827]"
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-bold text-[#374151] mb-2">{AUTH_TEXTS.REGISTER.PASSWORD_LABEL}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={AUTH_TEXTS.REGISTER.PASSWORD_PLACEHOLDER}
                    className="w-full bg-[#f8fafc] rounded-xl py-3.5 pl-4 pr-10 outline-none border-2 border-transparent focus:border-[#0052ff] text-[14px]"
                    required
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <span className="material-symbols-outlined text-lg">{showPassword ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-[#374151] mb-2">{AUTH_TEXTS.REGISTER.CONFIRM_PASSWORD_LABEL}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={AUTH_TEXTS.REGISTER.CONFIRM_PASSWORD_PLACEHOLDER}
                    className="w-full bg-[#f8fafc] rounded-xl py-3.5 pl-4 pr-10 outline-none border-2 border-transparent focus:border-[#0052ff] text-[14px]"
                    required
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <span className="material-symbols-outlined text-lg">{showConfirmPassword ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0052ff] text-white font-bold rounded-xl py-4 mt-4 hover:bg-[#0042cc] active:scale-[0.98] transition-all shadow-[0_8px_20px_-4px_rgba(0,82,255,0.3)] disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed text-sm uppercase tracking-wider"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {AUTH_TEXTS.REGISTER.REGISTER_LOADING}
                </div>
              ) : AUTH_TEXTS.REGISTER.REGISTER_BUTTON}
            </button>
          </form>

          <p className="text-center text-[#6b7280] text-[14px] mt-8">
            {AUTH_TEXTS.REGISTER.HAVE_ACCOUNT} <Link href="/login" className="font-bold text-[#0052ff] hover:underline">{AUTH_TEXTS.REGISTER.LOGIN_NOW}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
