"use client";

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AUTH_TEXTS } from '@/constants/texts';
import AuthBranding from '@/components/AuthBranding';
import { authService } from '@/services/auth.service';

type ForgotStep = 'email' | 'otp' | 'reset' | 'success';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState('');
  const [lastEmailSent, setLastEmailSent] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // OTP Lockout states
  const [failedOtpAttempts, setFailedOtpAttempts] = useState(0);
  const [otpLockoutTimer, setOtpLockoutTimer] = useState(0);

  const { user, isInitialLoading } = useAuth();
  const router = useRouter();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (user && !isInitialLoading) {
      router.refresh();
      router.replace('/');
    }
  }, [user, isInitialLoading, router]);

  // Load OTP lockout state from localStorage
  useEffect(() => {
    const checkEmail = (step === 'email') ? email : lastEmailSent;
    if (!checkEmail) {
      setOtpLockoutTimer(0);
      return;
    }

    const storedLockout = localStorage.getItem(`otp_lockout_${checkEmail}`);
    if (storedLockout) {
      const remaining = Math.ceil((parseInt(storedLockout) - Date.now()) / 1000);
      if (remaining > 0) {
        setOtpLockoutTimer(remaining);
        setFailedOtpAttempts(3);
      } else {
        setOtpLockoutTimer(0);
        localStorage.removeItem(`otp_lockout_${checkEmail}`);
      }
    } else {
      setOtpLockoutTimer(0);
      setFailedOtpAttempts(0);
    }
  }, [email, lastEmailSent, step]);

  // General Timers (Resend & OTP Lockout)
  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      setOtpLockoutTimer((prev) => {
        const checkEmail = (step === 'email') ? email : lastEmailSent;
        if (prev <= 1 && prev > 0) {
          localStorage.removeItem(`otp_lockout_${checkEmail}`);
          setFailedOtpAttempts(0);
          return 0;
        }
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [email, lastEmailSent, step]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpValues];
    newOtp[index] = value.slice(-1);
    setOtpValues(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (resendTimer > 0 && email === lastEmailSent) {
      setError(`Vui lòng đợi ${resendTimer} giây trước khi yêu cầu mã mới.`);
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      setLastEmailSent(email);
      setOtpValues(['', '', '', '', '', '']); // Xóa sạch mã cũ
      setStep('otp');
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || "Email không tồn tại trong hệ thống.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpLockoutTimer > 0) return;

    const otpString = otpValues.join('');
    if (otpString.length < 6) {
      setError("Vui lòng nhập đủ 6 chữ số mã OTP.");
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await authService.verifyOtp(lastEmailSent, otpString);
      setStep('reset');
      localStorage.removeItem(`otp_lockout_${lastEmailSent}`);
    } catch (err: any) {
      const newAttempts = failedOtpAttempts + 1;
      setFailedOtpAttempts(newAttempts);

      if (newAttempts >= 3) {
        const lockoutUntil = Date.now() + 60000;
        localStorage.setItem(`otp_lockout_${lastEmailSent}`, lockoutUntil.toString());
        setOtpLockoutTimer(60);
      } else {
        setError(err.message || `Mã xác nhận sai. Bạn còn ${3 - newAttempts} lần thử.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }
    setIsLoading(true);
    try {
      await authService.resetPassword(lastEmailSent, otpValues.join(''), newPassword);
      setStep('success');
    } catch (err: any) {
      setError(err.message || "Không thể đổi mật khẩu.");
    } finally {
      setIsLoading(false);
    }
  };

  if (user && !isInitialLoading) return null;

  const renderContent = () => {
    switch (step) {
      case 'email':
        return (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-8 w-full">
            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(''); // Xóa lỗi khi gõ email mới
                }}
                placeholder="Nhập địa chỉ email của bạn..."
                className="w-full bg-[#f8fafc] rounded-2xl py-4.5 pl-6 pr-14 outline-none border-2 border-slate-100 focus:border-[#0052ff] focus:bg-white text-[15px] font-medium transition-all text-slate-700 group-hover:border-slate-200 shadow-sm"
                required
                disabled={isLoading}
              />
              <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0052ff] transition-colors">mail</span>
            </div>
            <button
              type="submit"
              disabled={isLoading || (resendTimer > 0 && email === lastEmailSent)}
              className="w-full bg-[#0052ff] text-white font-semibold rounded-2xl py-4.5 hover:bg-[#0042cc] transition-all shadow-[0_4px_14px_0_rgba(0,82,255,0.25)] active:scale-[0.99] disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none text-[16px] border border-transparent disabled:border-slate-100"
            >
              {isLoading ? "Đang xử lý..." : (resendTimer > 0 && email === lastEmailSent) ? `Thử lại sau ${resendTimer}s` : "Tiếp tục"}
            </button>
          </form>
        );

      case 'otp':
        return (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-10 w-full animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between gap-4">
              {otpValues.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isLoading || otpLockoutTimer > 0}
                  className="w-full h-16 sm:h-18 text-center text-3xl font-bold bg-[#f8fafc] border-2 border-slate-100 rounded-2xl focus:border-[#0052ff] focus:bg-white outline-none transition-all text-slate-700 shadow-sm disabled:opacity-50"
                  required
                />
              ))}
            </div>
            <div className="space-y-6">
              <button
                type="submit"
                disabled={isLoading || otpLockoutTimer > 0}
                className="w-full bg-[#0052ff] text-white font-semibold rounded-2xl py-4.5 hover:bg-[#0042cc] transition-all shadow-[0_4px_14px_0_rgba(0,82,255,0.25)] active:scale-[0.99] disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none border border-transparent disabled:border-slate-100"
              >
                {isLoading ? "Đang kiểm tra..." : otpLockoutTimer > 0 ? "Đang bị khóa" : "Xác thực mã OTP"}
              </button>
              <p className="text-center text-[15px] font-medium text-slate-400">
                Bạn không nhận được mã? {resendTimer > 0 ? (
                  <span className="text-slate-400 italic">Thử lại sau {resendTimer}s</span>
                ) : (
                  <button type="button" onClick={() => handleSendOtp()} className="text-[#0052ff] font-bold hover:underline" disabled={otpLockoutTimer > 0}>Gửi lại ngay</button>
                )}
              </p>
            </div>
          </form>
        );

      case 'reset':
        return (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 duration-500">
            <div className="space-y-6">
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                  className="w-full bg-[#f8fafc] rounded-2xl py-4.5 pl-6 pr-14 outline-none border-2 border-slate-100 focus:border-[#0052ff] focus:bg-white text-[15px] font-medium transition-all text-slate-700 shadow-sm"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0052ff] transition-colors focus:outline-none"
                >
                  <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              
              <div className="relative group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Xác nhận lại mật khẩu mới"
                  className="w-full bg-[#f8fafc] rounded-2xl py-4.5 pl-6 pr-14 outline-none border-2 border-slate-100 focus:border-[#0052ff] focus:bg-white text-[15px] font-medium transition-all text-slate-700 shadow-sm"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0052ff] transition-colors focus:outline-none"
                >
                  <span className="material-symbols-outlined">{showConfirmPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0052ff] text-white font-semibold rounded-2xl py-4.5 hover:bg-[#0042cc] transition-all shadow-[0_4px_14px_0_rgba(0,82,255,0.25)]"
            >
              Cập nhật mật khẩu
            </button>
          </form>
        );

      case 'success':
        return (
          <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-700">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
              <span className="material-symbols-outlined text-4xl">verified</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">Cập nhật thành công</h2>
            <p className="text-slate-400 text-[16px] mb-10 leading-relaxed font-medium">Mật khẩu của bạn đã được thay đổi. Hãy đăng nhập lại để tiếp tục học tập.</p>
            <button
              onClick={() => router.replace('/login')}
              className="w-full bg-slate-800 text-white font-semibold rounded-2xl py-4.5 hover:bg-slate-900 transition-all shadow-lg active:scale-[0.99]"
            >
              Đăng nhập ngay
            </button>
          </div>
        );
    }
  };

  const getHeaderInfo = () => {
    switch (step) {
      case 'email': return { title: "Quên mật khẩu?", subtitle: "Hãy nhập email của bạn, chúng tôi sẽ giúp bạn khôi phục quyền truy cập nhanh nhất." };
      case 'otp': return { title: "Xác thực mã", subtitle: `Một mã bảo mật đã được gửi tới ${lastEmailSent}` };
      case 'reset': return { title: "Mật khẩu mới", subtitle: "Hãy giữ bí mật mật khẩu này để bảo vệ tài khoản của bạn." };
      case 'success': return { title: "", subtitle: "" };
      default: return { title: "", subtitle: "" };
    }
  }

  const header = getHeaderInfo();

  return (
    <div className="h-screen flex w-full font-sans bg-white overflow-hidden text-slate-800">
      <AuthBranding />

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center py-12 px-6 sm:px-12 relative overflow-y-auto h-full">
        {step !== 'success' && (
          <button
            type="button"
            onClick={() => step === 'email' ? router.replace('/login') : setStep('email')}
            className="absolute top-10 left-8 sm:left-12 flex items-center gap-2 text-slate-400 hover:text-[#0052ff] transition-all font-semibold text-sm group"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            <span>{step === 'email' ? 'Quay lại' : 'Trở lại'}</span>
          </button>
        )}

        <div className="w-full max-w-[420px]">
          {step !== 'success' && (
            <div className="mb-14 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight leading-tight">{header.title}</h2>
              <p className="text-slate-400 text-[16px] leading-relaxed font-medium">{header.subtitle}</p>
            </div>
          )}

          {(error || (step === 'otp' && otpLockoutTimer > 0)) && (
            <div className={`border-2 rounded-2xl p-4 mb-8 flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${(step === 'otp' && otpLockoutTimer > 0) ? 'bg-red-50 border-red-100' : 'bg-rose-50 border-rose-100'}`}>
              <span className={`material-symbols-outlined text-[20px] ${(step === 'otp' && otpLockoutTimer > 0) ? 'text-red-500 animate-pulse' : 'text-rose-500'}`}>
                {(step === 'otp' && otpLockoutTimer > 0) ? 'timer' : 'info'}
              </span>
              <p className={`text-sm font-semibold ${(step === 'otp' && otpLockoutTimer > 0) ? 'text-red-600' : 'text-rose-600'}`}>
                {(step === 'otp' && otpLockoutTimer > 0) ? `Thử quá nhiều lần. Vui lòng thử lại sau ${otpLockoutTimer} giây.` : error}
              </p>
            </div>
          )}

          {renderContent()}
        </div>
      </div>
    </div>
  );
}
