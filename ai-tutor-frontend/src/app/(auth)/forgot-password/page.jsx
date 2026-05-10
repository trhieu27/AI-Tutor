import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import AuthBranding from '@/components/AuthBranding';
import { authService } from '@/services/auth.service';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function ForgotPasswordPage() {
  const [step, setStep] = useState('email');
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
  const navigate = useNavigate();
  const inputRefs = useRef([]);

  // Load OTP lockout state from localStorage
  useEffect(() => {
    const checkEmail = step === 'email' ? email : lastEmailSent;
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
      setResendTimer(prev => prev > 0 ? prev - 1 : 0);
      setOtpLockoutTimer(prev => {
        const checkEmail = step === 'email' ? email : lastEmailSent;
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
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpValues];
    newOtp[index] = value.slice(-1);
    setOtpValues(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  const handleSendOtp = async (e = null) => {
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
    } catch (err) {
      setError(err.message || "Email không tồn tại trong hệ thống.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleVerifyOtp = async e => {
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
    } catch (err) {
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
  const handleResetPassword = async e => {
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
    } catch (err) {
      setError(err.message || "Không thể đổi mật khẩu.");
    } finally {
      setIsLoading(false);
    }
  };
  const renderContent = () => {
    switch (step) {
      case 'email':
        return /*#__PURE__*/_jsxs("form", {
          onSubmit: handleSendOtp,
          className: "flex flex-col gap-8 w-full",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "relative group",
            children: [/*#__PURE__*/_jsx("input", {
              type: "email",
              value: email,
              onChange: e => {
                setEmail(e.target.value);
                setError(''); // Xóa lỗi khi gõ email mới
              },
              placeholder: "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 email c\u1EE7a b\u1EA1n...",
              className: "w-full bg-[var(--surface)] rounded-2xl py-4.5 pl-6 pr-14 outline-none border border-[var(--border-color)] focus:border-[hsl(239_68%_58%)] focus:bg-[var(--surface-raised)] text-[15px] font-medium transition-all text-[var(--foreground)] shadow-sm",
              required: true,
              disabled: isLoading
            }), /*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within:text-[hsl(239_68%_58%)] transition-colors",
              children: "mail"
            })]
          }), /*#__PURE__*/_jsx("button", {
            type: "submit",
            disabled: isLoading || resendTimer > 0 && email === lastEmailSent,
            className: "w-full bg-[hsl(239_68%_58%)] text-white font-semibold rounded-2xl py-4.5 hover:bg-[hsl(239_62%_52%)] transition-all shadow-[0_4px_14px_0_hsl(239_68%_58%/0.30)] active:scale-[0.99] disabled:bg-[var(--surface)] disabled:text-[var(--muted)] disabled:shadow-none text-[16px] border border-transparent",
            children: isLoading ? "Đang xử lý..." : resendTimer > 0 && email === lastEmailSent ? `Thử lại sau ${resendTimer}s` : "Tiếp tục"
          })]
        });
      case 'otp':
        return /*#__PURE__*/_jsxs("form", {
          onSubmit: handleVerifyOtp,
          className: "flex flex-col gap-10 w-full animate-in fade-in slide-in-from-right-4 duration-500",
          children: [/*#__PURE__*/_jsx("div", {
            className: "flex justify-between gap-4",
            children: otpValues.map((digit, idx) => /*#__PURE__*/_jsx("input", {
              ref: el => {
                inputRefs.current[idx] = el;
              },
              type: "text",
              maxLength: 1,
              value: digit,
              onChange: e => handleOtpChange(idx, e.target.value),
              onKeyDown: e => handleKeyDown(idx, e),
              disabled: isLoading || otpLockoutTimer > 0,
              className: "w-full h-16 sm:h-18 text-center text-3xl font-bold bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl focus:border-[hsl(239_68%_58%)] focus:bg-[var(--surface-raised)] outline-none transition-all text-[var(--foreground)] shadow-sm disabled:opacity-50",
              required: true
            }, idx))
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-6",
            children: [/*#__PURE__*/_jsx("button", {
              type: "submit",
              disabled: isLoading || otpLockoutTimer > 0,
              className: "w-full bg-[hsl(239_68%_58%)] text-white font-semibold rounded-2xl py-4.5 hover:bg-[hsl(239_62%_52%)] transition-all shadow-[0_4px_14px_0_hsl(239_68%_58%/0.30)] active:scale-[0.99] disabled:bg-[var(--surface)] disabled:text-[var(--muted)] disabled:shadow-none border border-transparent disabled:border-[var(--border-color)]",
              children: isLoading ? "Đang kiểm tra..." : otpLockoutTimer > 0 ? "Đang bị khóa" : "Xác thực mã OTP"
            }), /*#__PURE__*/_jsxs("p", {
              className: "text-center text-[15px] font-medium text-[var(--muted)]",
              children: ["B\u1EA1n kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c m\xE3? ", resendTimer > 0 ? /*#__PURE__*/_jsxs("span", {
                className: "text-[var(--muted)] italic",
                children: ["Th\u1EED l\u1EA1i sau ", resendTimer, "s"]
              }) : /*#__PURE__*/_jsx("button", {
                type: "button",
                onClick: () => handleSendOtp(),
                className: "text-[hsl(239_68%_58%)] font-bold hover:underline",
                disabled: otpLockoutTimer > 0,
                children: "G\u1EEDi l\u1EA1i ngay"
              })]
            })]
          })]
        });
      case 'reset':
        return /*#__PURE__*/_jsxs("form", {
          onSubmit: handleResetPassword,
          className: "flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 duration-500",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "space-y-6",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "relative group",
              children: [/*#__PURE__*/_jsx("input", {
                type: showPassword ? "text" : "password",
                value: newPassword,
                onChange: e => setNewPassword(e.target.value),
                placeholder: "M\u1EADt kh\u1EA9u m\u1EDBi (t\u1ED1i thi\u1EC3u 8 k\xFD t\u1EF1)",
                className: "w-full bg-[var(--surface)] rounded-2xl py-4.5 pl-6 pr-14 outline-none border border-[var(--border-color)] focus:border-[hsl(239_68%_58%)] focus:bg-[var(--surface-raised)] text-[15px] font-medium transition-all text-[var(--foreground)] shadow-sm",
                required: true
              }), /*#__PURE__*/_jsx("button", {
                type: "button",
                tabIndex: -1,
                onClick: () => setShowPassword(!showPassword),
                className: "absolute right-5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[hsl(239_68%_58%)] transition-colors focus:outline-none",
                children: /*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined",
                  children: showPassword ? "visibility_off" : "visibility"
                })
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "relative group",
              children: [/*#__PURE__*/_jsx("input", {
                type: showConfirmPassword ? "text" : "password",
                value: confirmPassword,
                onChange: e => setConfirmPassword(e.target.value),
                placeholder: "X\xE1c nh\u1EADn l\u1EA1i m\u1EADt kh\u1EA9u m\u1EDBi",
                className: "w-full bg-[var(--surface)] rounded-2xl py-4.5 pl-6 pr-14 outline-none border border-[var(--border-color)] focus:border-[hsl(239_68%_58%)] focus:bg-[var(--surface-raised)] text-[15px] font-medium transition-all text-[var(--foreground)] shadow-sm",
                required: true
              }), /*#__PURE__*/_jsx("button", {
                type: "button",
                tabIndex: -1,
                onClick: () => setShowConfirmPassword(!showConfirmPassword),
                className: "absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0052ff] transition-colors focus:outline-none",
                children: /*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined",
                  children: showConfirmPassword ? "visibility_off" : "visibility"
                })
              })]
            })]
          }), /*#__PURE__*/_jsx("button", {
            type: "submit",
            disabled: isLoading,
            className: "w-full bg-[hsl(239_68%_58%)] text-white font-semibold rounded-2xl py-4.5 hover:bg-[hsl(239_62%_52%)] transition-all shadow-[0_4px_14px_0_hsl(239_68%_58%/0.30)]",
            children: "C\u1EADp nh\u1EADt m\u1EADt kh\u1EA9u"
          })]
        });
      case 'success':
        return /*#__PURE__*/_jsxs("div", {
          className: "text-center py-8 animate-in fade-in zoom-in-95 duration-700",
          children: [/*#__PURE__*/_jsx("div", {
            className: "w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8",
            children: /*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined text-4xl",
              children: "verified"
            })
          }), /*#__PURE__*/_jsx("h2", {
            className: "text-2xl font-bold text-[var(--foreground)] mb-4 tracking-tight",
            children: "C\u1EADp nh\u1EADt th\xE0nh c\xF4ng"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-[var(--muted)] text-[16px] mb-10 leading-relaxed font-medium",
            children: "M\u1EADt kh\u1EA9u c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c thay \u0111\u1ED5i. H\xE3y \u0111\u0103ng nh\u1EADp l\u1EA1i \u0111\u1EC3 ti\u1EBFp t\u1EE5c h\u1ECDc t\u1EADp."
          }), /*#__PURE__*/_jsx("button", {
            onClick: () => navigate('/login', {
              replace: true
            }),
            className: "w-full bg-[var(--surface)] text-[var(--foreground)] font-semibold rounded-2xl py-4.5 hover:bg-[var(--surface-raised)] border border-[var(--border-color)] transition-all shadow-lg active:scale-[0.99]",
            children: "\u0110\u0103ng nh\u1EADp ngay"
          })]
        });
    }
  };
  const getHeaderInfo = () => {
    switch (step) {
      case 'email':
        return {
          title: "Quên mật khẩu?",
          subtitle: "Hãy nhập email của bạn, chúng tôi sẽ giúp bạn khôi phục quyền truy cập nhanh nhất."
        };
      case 'otp':
        return {
          title: "Xác thực mã",
          subtitle: `Một mã bảo mật đã được gửi tới ${lastEmailSent}`
        };
      case 'reset':
        return {
          title: "Mật khẩu mới",
          subtitle: "Hãy giữ bí mật mật khẩu này để bảo vệ tài khoản của bạn."
        };
      case 'success':
        return {
          title: "",
          subtitle: ""
        };
      default:
        return {
          title: "",
          subtitle: ""
        };
    }
  };
  const header = getHeaderInfo();
  return /*#__PURE__*/_jsxs("div", {
    className: "h-[100dvh] overflow-hidden flex w-full font-sans bg-[var(--background)] text-[var(--foreground)]",
    children: [/*#__PURE__*/_jsx(AuthBranding, {}), /*#__PURE__*/_jsxs("div", {
      className: "w-full lg:w-1/2 flex flex-col justify-center items-center py-12 px-6 sm:px-12 relative overflow-y-auto h-full",
      children: [step !== 'success' && /*#__PURE__*/_jsxs("button", {
        type: "button",
        onClick: () => step === 'email' ? navigate('/login', {
          replace: true
        }) : setStep('email'),
        className: "absolute top-10 left-8 sm:left-12 flex items-center gap-2 text-[var(--muted)] hover:text-[hsl(239_68%_58%)] transition-all font-semibold text-sm group",
        children: [/*#__PURE__*/_jsx("span", {
          className: "material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform",
          children: "arrow_back"
        }), /*#__PURE__*/_jsx("span", {
          children: step === 'email' ? 'Quay lại' : 'Trở lại'
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "w-full max-w-[420px]",
        children: [step !== 'success' && /*#__PURE__*/_jsxs("div", {
          className: "mb-14 text-center lg:text-left",
          children: [/*#__PURE__*/_jsx("h2", {
            className: "text-3xl font-bold text-[var(--foreground)] mb-4 tracking-tight leading-tight",
            children: header.title
          }), /*#__PURE__*/_jsx("p", {
            className: "text-[var(--muted)] text-[16px] leading-relaxed font-medium",
            children: header.subtitle
          })]
        }), (error || step === 'otp' && otpLockoutTimer > 0) && /*#__PURE__*/_jsxs("div", {
          className: `border-2 rounded-2xl p-4 mb-8 flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${step === 'otp' && otpLockoutTimer > 0 ? 'bg-red-50 border-red-100' : 'bg-rose-50 border-rose-100'}`,
          children: [/*#__PURE__*/_jsx("span", {
            className: `material-symbols-outlined text-[20px] ${step === 'otp' && otpLockoutTimer > 0 ? 'text-red-500 animate-pulse' : 'text-rose-500'}`,
            children: step === 'otp' && otpLockoutTimer > 0 ? 'timer' : 'info'
          }), /*#__PURE__*/_jsx("p", {
            className: `text-sm font-semibold ${step === 'otp' && otpLockoutTimer > 0 ? 'text-red-600' : 'text-rose-600'}`,
            children: step === 'otp' && otpLockoutTimer > 0 ? `Thử quá nhiều lần. Vui lòng thử lại sau ${otpLockoutTimer} giây.` : error
          })]
        }), renderContent()]
      })]
    })]
  });
}