"use client";

import Link from 'next/link';
import { useState } from 'react';
import { AUTH_TEXTS } from '@/constants/texts';

import AuthBranding from '@/components/AuthBranding';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (email.includes('@')) {
        setSuccess(AUTH_TEXTS.FORGOT_PASSWORD.SUCCESS_MSG);
      } else {
        setError(AUTH_TEXTS.FORGOT_PASSWORD.ERROR);
      }
    }, 1000);
  };

  return (
    <div className="h-screen flex w-full font-sans bg-white overflow-hidden">
      {/* Left Side - Hero / Branding (Hidden on mobile, block on lg screens) */}
      <AuthBranding />

      {/* Right Side - Forgot Password Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center py-12 px-6 sm:px-12 relative overflow-y-auto h-full">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-[#111827] mb-3">{AUTH_TEXTS.FORGOT_PASSWORD.TITLE}</h2>
            <p className="text-[#6b7280] text-[15px]">{AUTH_TEXTS.FORGOT_PASSWORD.SUBTITLE}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-700 text-sm font-medium">{success}</p>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-bold text-[#374151] mb-2">{AUTH_TEXTS.FORGOT_PASSWORD.EMAIL_LABEL}</label>
              <div className="relative flex items-center">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={AUTH_TEXTS.FORGOT_PASSWORD.EMAIL_PLACEHOLDER}
                  className="w-full bg-[#f4f6fa] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827] placeholder-gray-400"
                  required
                  disabled={isLoading}
                />
                <span className="material-symbols-outlined absolute right-4 text-gray-400">mail</span>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || !!success}
              className="w-full bg-[#0052ff] text-white font-bold rounded-xl py-3.5 mt-4 hover:bg-[#0042cc] transition-colors shadow-[0_4px_12px_rgba(0,82,255,0.25)] disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? AUTH_TEXTS.FORGOT_PASSWORD.LOADING : AUTH_TEXTS.FORGOT_PASSWORD.BUTTON}
            </button>
          </form>

          <p className="text-center text-[#6b7280] text-[14px] mt-8 pb-8 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <Link href="/login" className="font-bold text-[#0052ff] hover:underline">
              {AUTH_TEXTS.FORGOT_PASSWORD.BACK_TO_LOGIN}
            </Link>
          </p>

          <div className="mt-8 w-full flex lg:justify-start justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f4f6fa] rounded-lg">
              <span className="material-symbols-outlined text-[14px] text-[#4b5563]">verified</span>
              <span className="text-[10px] text-[#4b5563] font-bold tracking-widest uppercase">{AUTH_TEXTS.LOGIN.SYSTEM_BADGE}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
