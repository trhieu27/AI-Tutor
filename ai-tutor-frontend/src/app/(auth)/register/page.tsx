"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';
import { AUTH_TEXTS } from '@/constants/texts';
import AuthBranding from '@/components/AuthBranding';
import GoogleIcon from '@/components/icons/GoogleIcon';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(AUTH_TEXTS.REGISTER.PASSWORD_MISMATCH);
      return;
    }

    try {
      await register(name, email, password);
      router.push('/');
    } catch (err: any) {
      setError(err?.message || AUTH_TEXTS.REGISTER.REGISTER_ERROR);
      console.error('Register error:', err);
    }
  };

  const handleGoogleRegister = () => {
    console.log('Google register attempt');
  };

  return (
    <div className="h-screen flex w-full font-sans bg-white overflow-hidden">
      {/* Left Side - Hero / Branding */}
      <AuthBranding />

      {/* Right Side - Register/Verify Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center py-12 px-6 sm:px-12 relative overflow-y-auto h-full">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-[#111827] mb-3">{AUTH_TEXTS.REGISTER.WELCOME_TITLE}</h2>
            <p className="text-[#6b7280] text-[15px]">{AUTH_TEXTS.REGISTER.WELCOME_SUBTITLE}</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            className="w-full flex items-center justify-center gap-3 bg-[#f3f4f6] text-[#111827] rounded-xl py-3.5 px-4 font-semibold hover:bg-[#e5e7eb] transition-colors mb-8"
          >
            <GoogleIcon size={20} />
            {AUTH_TEXTS.REGISTER.CONTINUE_WITH_GOOGLE}
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gray-200"></div>
            <p className="text-[11px] text-gray-400 font-bold tracking-wider uppercase">{AUTH_TEXTS.REGISTER.OR_REGISTER_WITH_EMAIL}</p>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-bold text-[#374151] mb-2">{AUTH_TEXTS.REGISTER.NAME_LABEL}</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={AUTH_TEXTS.REGISTER.NAME_PLACEHOLDER}
                  className="w-full bg-[#f4f6fa] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827] placeholder-gray-400"
                  required
                  disabled={isLoading}
                />
                <span className="material-symbols-outlined absolute right-4 text-gray-400">person</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#374151] mb-2">{AUTH_TEXTS.REGISTER.EMAIL_LABEL}</label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={AUTH_TEXTS.REGISTER.EMAIL_PLACEHOLDER}
                  className="w-full bg-[#f4f6fa] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827] placeholder-gray-400"
                  required
                  disabled={isLoading}
                />
                <span className="material-symbols-outlined absolute right-4 text-gray-400">mail</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#374151] mb-2">{AUTH_TEXTS.REGISTER.PASSWORD_LABEL}</label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={AUTH_TEXTS.REGISTER.PASSWORD_PLACEHOLDER}
                  className="w-full bg-[#f4f6fa] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827] placeholder-gray-400"
                  required
                  disabled={isLoading}
                />
                <span className="material-symbols-outlined absolute right-4 text-gray-400">lock</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#374151] mb-2">{AUTH_TEXTS.REGISTER.CONFIRM_PASSWORD_LABEL}</label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={AUTH_TEXTS.REGISTER.CONFIRM_PASSWORD_PLACEHOLDER}
                  className="w-full bg-[#f4f6fa] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827] placeholder-gray-400"
                  required
                  disabled={isLoading}
                />
                <span className="material-symbols-outlined absolute right-4 text-gray-400">lock</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0052ff] text-white font-bold rounded-xl py-3.5 mt-4 hover:bg-[#0042cc] transition-colors shadow-[0_4px_12px_rgba(0,82,255,0.25)] disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? AUTH_TEXTS.REGISTER.REGISTER_LOADING : AUTH_TEXTS.REGISTER.REGISTER_BUTTON}
            </button>
          </form>

          <p className="text-center text-[#6b7280] text-[14px] mt-8 pb-8">
            {AUTH_TEXTS.REGISTER.HAVE_ACCOUNT} <Link href="/login" className="font-bold text-[#0052ff] hover:underline">{AUTH_TEXTS.REGISTER.LOGIN_NOW}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
