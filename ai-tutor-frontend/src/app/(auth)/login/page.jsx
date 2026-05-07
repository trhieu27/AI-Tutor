import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AUTH_TEXTS } from '@/constants/texts';
import AuthBranding from '@/components/AuthBranding';
import GoogleIcon from '@/components/icons/GoogleIcon';
import { useGoogleLogin } from '@react-oauth/google';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const {
    login,
    googleLogin: loginWithGoogle,
    isLoading,
    error: authError
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const storedLockoutUntil = localStorage.getItem('login_lockout_until');
    if (storedLockoutUntil) {
      const remaining = Math.ceil((parseInt(storedLockoutUntil) - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutTimer(remaining);
        setFailedAttempts(5);
      } else localStorage.removeItem('login_lockout_until');
    }
  }, []);
  useEffect(() => {
    if (lockoutTimer > 0) {
      const interval = setInterval(() => {
        setLockoutTimer(prev => {
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
  const handleLogin = async e => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    setLocalError('');
    try {
      await login(email, password);
      navigate('/', {
        replace: true
      });
    } catch (err) {
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
    onSuccess: async tokenResponse => {
      setLocalError('');
      try {
        await loginWithGoogle(tokenResponse.access_token);
        navigate('/', {
          replace: true
        });
      } catch (err) {
        setLocalError(err.message || AUTH_TEXTS.GOOGLE.ERROR);
      }
    },
    onError: () => setLocalError(AUTH_TEXTS.GOOGLE.ERROR)
  });
  const displayError = localError || authError;
  return /*#__PURE__*/_jsxs("div", {
    className: "min-h-[100dvh] flex w-full font-sans bg-white",
    children: [/*#__PURE__*/_jsx(AuthBranding, {}), /*#__PURE__*/_jsx("div", {
      className: "w-full lg:w-1/2 flex flex-col justify-center items-center py-12 px-6 sm:px-12 relative overflow-y-auto h-full",
      children: /*#__PURE__*/_jsxs("div", {
        className: "w-full max-w-[420px]",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "mb-10 text-center lg:text-left",
          children: [/*#__PURE__*/_jsx("h2", {
            className: "text-3xl font-extrabold text-[#111827] mb-3 tracking-tight",
            children: AUTH_TEXTS.LOGIN.WELCOME_TITLE
          }), /*#__PURE__*/_jsx("p", {
            className: "text-[#6b7280] text-[15px] leading-relaxed",
            children: AUTH_TEXTS.LOGIN.WELCOME_SUBTITLE
          })]
        }), /*#__PURE__*/_jsxs("button", {
          type: "button",
          onClick: () => googleLogin(),
          disabled: isLoading || lockoutTimer > 0,
          className: "w-full flex items-center justify-center gap-3 bg-[#f3f4f6] text-[#111827] rounded-xl py-3.5 px-4 font-bold hover:bg-[#e5e7eb] transition-all mb-8 tracking-tight disabled:opacity-50",
          children: [/*#__PURE__*/_jsx(GoogleIcon, {
            size: 20
          }), AUTH_TEXTS.LOGIN.CONTINUE_WITH_GOOGLE]
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-4 mb-8",
          children: [/*#__PURE__*/_jsx("div", {
            className: "flex-1 h-px bg-gray-100"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-[10px] text-gray-400 font-extrabold tracking-[0.2em] uppercase",
            children: AUTH_TEXTS.LOGIN.OR_LOGIN_WITH_EMAIL
          }), /*#__PURE__*/_jsx("div", {
            className: "flex-1 h-px bg-gray-100"
          })]
        }), lockoutTimer > 0 ? /*#__PURE__*/_jsx("div", {
          className: "bg-red-50 border border-red-100 rounded-xl p-4 mb-6",
          children: /*#__PURE__*/_jsx("p", {
            className: "text-red-600 text-[14px] font-bold text-center",
            children: AUTH_TEXTS.LOGIN.RATE_LIMIT_COUNTDOWN?.(lockoutTimer) || `Thử quá nhiều lần. Thử lại sau ${lockoutTimer}s.`
          })
        }) : displayError && /*#__PURE__*/_jsxs("div", {
          className: "bg-red-50 border border-red-100 rounded-xl p-3 mb-6 flex items-center gap-3",
          children: [/*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined text-red-500 text-lg",
            children: "error"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-red-700 text-xs font-bold",
            children: displayError
          })]
        }), /*#__PURE__*/_jsxs("form", {
          onSubmit: handleLogin,
          className: "flex flex-col gap-4",
          children: [/*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("label", {
              className: "block text-[13px] font-bold text-[#374151] mb-2",
              children: AUTH_TEXTS.LOGIN.EMAIL_LABEL
            }), /*#__PURE__*/_jsxs("div", {
              className: "relative group",
              children: [/*#__PURE__*/_jsx("input", {
                type: "email",
                value: email,
                onChange: e => setEmail(e.target.value),
                placeholder: AUTH_TEXTS.LOGIN.EMAIL_PLACEHOLDER,
                className: "w-full bg-[#f8fafc] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827]",
                required: true,
                disabled: isLoading || lockoutTimer > 0
              }), /*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400",
                children: "mail"
              })]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex items-center justify-between mb-2",
              children: [/*#__PURE__*/_jsx("label", {
                className: "block text-[13px] font-bold text-[#374151]",
                children: AUTH_TEXTS.LOGIN.PASSWORD_LABEL
              }), /*#__PURE__*/_jsx(Link, {
                to: "/forgot-password",
                className: "text-[13px] font-bold text-[#0052ff] hover:underline",
                children: AUTH_TEXTS.LOGIN.FORGOT_PASSWORD
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "relative group",
              children: [/*#__PURE__*/_jsx("input", {
                type: showPassword ? 'text' : 'password',
                value: password,
                onChange: e => setPassword(e.target.value),
                placeholder: AUTH_TEXTS.LOGIN.PASSWORD_PLACEHOLDER,
                className: "w-full bg-[#f8fafc] rounded-xl py-3.5 pl-4 pr-12 outline-none border-2 border-transparent focus:border-[#0052ff] focus:bg-white text-[15px] transition-all text-[#111827]",
                required: true,
                disabled: isLoading || lockoutTimer > 0
              }), /*#__PURE__*/_jsx("button", {
                type: "button",
                onClick: () => setShowPassword(!showPassword),
                className: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0052ff] transition-colors focus:outline-none",
                children: /*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined text-[20px]",
                  children: showPassword ? 'visibility_off' : 'visibility'
                })
              })]
            })]
          }), /*#__PURE__*/_jsx("button", {
            type: "submit",
            disabled: isLoading || lockoutTimer > 0,
            className: "w-full bg-[#0052ff] text-white font-bold rounded-xl py-4 mt-4 hover:bg-[#0042cc] active:scale-[0.98] transition-all shadow-[0_8px_20px_-4px_rgba(0,82,255,0.3)] disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed text-sm uppercase tracking-wider",
            children: isLoading ? /*#__PURE__*/_jsxs("div", {
              className: "flex items-center justify-center gap-2",
              children: [/*#__PURE__*/_jsx("div", {
                className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
              }), AUTH_TEXTS.LOGIN.LOGIN_LOADING]
            }) : AUTH_TEXTS.LOGIN.LOGIN_BUTTON
          })]
        }), /*#__PURE__*/_jsxs("p", {
          className: "text-center text-[#6b7280] text-[14px] mt-8",
          children: [AUTH_TEXTS.LOGIN.NO_ACCOUNT, " ", /*#__PURE__*/_jsx(Link, {
            to: "/register",
            className: "font-bold text-[#0052ff] hover:underline",
            children: AUTH_TEXTS.LOGIN.REGISTER_NOW
          })]
        })]
      })
    })]
  });
}