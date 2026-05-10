import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AUTH_TEXTS } from '@/constants/texts';
import AuthBranding from '@/components/AuthBranding';
import GoogleIcon from '@/components/icons/GoogleIcon';
import { useGoogleLogin } from '@react-oauth/google';

// ─── All logic unchanged — only visual layer updated ───────────────────────
// Anti-patterns fixed:
//   - #0052ff hex → hsl(239 68% 58%) CSS var
//   - #f8fafc, #374151 hardcoded colors → CSS custom properties
//   - Focus border-color → brand HSL
//   - Error bg → brand-aware surface

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const { login, googleLogin: loginWithGoogle, isLoading, error: authError } = useAuth();
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
      navigate('/', { replace: true });
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
        navigate('/', { replace: true });
      } catch (err) {
        setLocalError(err.message || AUTH_TEXTS.GOOGLE.ERROR);
      }
    },
    onError: () => setLocalError(AUTH_TEXTS.GOOGLE.ERROR),
  });

  const displayError = localError || authError;

  return (
    <div className="min-h-[100dvh] flex w-full font-sans bg-[var(--background)]">
      {/* Left — branding panel */}
      <AuthBranding />

      {/* Right — form panel */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center py-12 px-6 sm:px-12 relative overflow-y-auto">
        <div className="w-full max-w-[400px]">

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold text-[var(--foreground)] tracking-[-0.03em] leading-[1.05]">
              {AUTH_TEXTS.LOGIN.WELCOME_TITLE}
            </h2>
            <p className="text-[var(--muted)] text-[14px] leading-relaxed mt-2">
              {AUTH_TEXTS.LOGIN.WELCOME_SUBTITLE}
            </p>
          </div>

          {/* Google login */}
          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={isLoading || lockoutTimer > 0}
            className="w-full flex items-center justify-center gap-3 bg-[var(--surface)] text-[var(--foreground)] rounded-xl py-3 px-4 font-semibold text-[14px] hover:bg-[var(--card-bg-hover)] border border-[var(--border-color)] hover:border-[var(--border-emphasis)] transition-all duration-150 mb-6 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <GoogleIcon size={18} />
            {AUTH_TEXTS.LOGIN.CONTINUE_WITH_GOOGLE}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[var(--border-color)]" />
            <p className="text-[10px] text-[var(--muted-light)] font-semibold tracking-[0.15em] uppercase">
              {AUTH_TEXTS.LOGIN.OR_LOGIN_WITH_EMAIL}
            </p>
            <div className="flex-1 h-px bg-[var(--border-color)]" />
          </div>

          {/* Error / Lockout */}
          {lockoutTimer > 0 ? (
            <div className="bg-[hsl(343_85%_58%/0.08)] border border-[hsl(343_85%_58%/0.25)] rounded-xl p-4 mb-5">
              <p className="text-[hsl(343_72%_48%)] text-[13px] font-semibold text-center">
                {AUTH_TEXTS.LOGIN.RATE_LIMIT_COUNTDOWN?.(lockoutTimer) || `Thử quá nhiều lần. Thử lại sau ${lockoutTimer}s.`}
              </p>
            </div>
          ) : displayError && (
            <div className="bg-[hsl(343_85%_58%/0.08)] border border-[hsl(343_85%_58%/0.25)] rounded-xl p-3 mb-5 flex items-center gap-3">
              <span className="material-symbols-outlined text-[hsl(343_72%_48%)] text-[18px] shrink-0">error</span>
              <p className="text-[hsl(343_72%_48%)] text-[13px] font-semibold">{displayError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">

            {/* Email field */}
            <div>
              <label className="block text-[12px] font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-[0.08em]">
                {AUTH_TEXTS.LOGIN.EMAIL_LABEL}
              </label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={AUTH_TEXTS.LOGIN.EMAIL_PLACEHOLDER}
                  className="w-full bg-[var(--surface)] rounded-xl py-3 pl-4 pr-11 outline-none border border-[var(--border-color)] focus:border-[hsl(239_68%_58%/0.6)] focus:ring-3 focus:ring-[hsl(239_68%_58%/0.08)] text-[14px] transition-all duration-150 text-[var(--foreground)] placeholder:text-[var(--muted-light)] font-medium"
                  required
                  disabled={isLoading || lockoutTimer > 0}
                />
                <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-light)] text-[18px] group-focus-within:text-[hsl(239_68%_58%)] transition-colors duration-150">
                  mail
                </span>
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[0.08em]">
                  {AUTH_TEXTS.LOGIN.PASSWORD_LABEL}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[12px] font-semibold text-[hsl(239_68%_58%)] hover:text-[hsl(239_62%_50%)] transition-colors"
                >
                  {AUTH_TEXTS.LOGIN.FORGOT_PASSWORD}
                </Link>
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={AUTH_TEXTS.LOGIN.PASSWORD_PLACEHOLDER}
                  className="w-full bg-[var(--surface)] rounded-xl py-3 pl-4 pr-11 outline-none border border-[var(--border-color)] focus:border-[hsl(239_68%_58%/0.6)] focus:ring-3 focus:ring-[hsl(239_68%_58%/0.08)] text-[14px] transition-all duration-150 text-[var(--foreground)] placeholder:text-[var(--muted-light)] font-medium"
                  required
                  disabled={isLoading || lockoutTimer > 0}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-light)] hover:text-[hsl(239_68%_58%)] transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || lockoutTimer > 0}
              className="w-full bg-[hsl(239_68%_58%)] text-white font-bold rounded-xl py-3.5 mt-2 hover:bg-[hsl(239_62%_52%)] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_hsl(239_68%_58%/0.30)] hover:shadow-[0_8px_24px_hsl(239_68%_58%/0.40)] disabled:bg-[var(--surface)] disabled:text-[var(--muted)] disabled:shadow-none disabled:cursor-not-allowed text-[14px] tracking-tight"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {AUTH_TEXTS.LOGIN.LOGIN_LOADING}
                </div>
              ) : AUTH_TEXTS.LOGIN.LOGIN_BUTTON}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-[var(--muted)] text-[13px] mt-7">
            {AUTH_TEXTS.LOGIN.NO_ACCOUNT}{' '}
            <Link
              to="/register"
              className="font-bold text-[hsl(239_68%_58%)] hover:text-[hsl(239_62%_50%)] transition-colors"
            >
              {AUTH_TEXTS.LOGIN.REGISTER_NOW}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}