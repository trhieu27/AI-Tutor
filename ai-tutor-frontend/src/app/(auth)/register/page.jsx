import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
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
  const { register, googleLogin: loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async e => {
    e.preventDefault();
    setLocalError('');
    if (password !== confirmPassword) {
      setLocalError(AUTH_TEXTS.REGISTER.PASSWORD_MISMATCH);
      return;
    }
    try {
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setLocalError(err?.message || AUTH_TEXTS.REGISTER.REGISTER_ERROR);
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

  // Only use localError — authError from context bleeds in from login page
  const displayError = localError;

  const inputClass = 'w-full bg-[var(--surface)] rounded-xl py-3.5 pl-4 pr-12 outline-none border border-[var(--border-color)] focus:border-[hsl(239_68%_58%)] focus:bg-[var(--surface-raised)] text-[15px] transition-all text-[var(--foreground)] placeholder:text-[var(--muted-light)]';
  const inputSmClass = 'w-full bg-[var(--surface)] rounded-xl py-3.5 pl-4 pr-10 outline-none border border-[var(--border-color)] focus:border-[hsl(239_68%_58%)] text-[14px] text-[var(--foreground)] transition-all placeholder:text-[var(--muted-light)]';
  const labelClass = 'block text-[13px] font-bold text-[var(--muted)] mb-2';

  return (
    <div className="h-[100dvh] overflow-hidden flex w-full font-sans bg-[var(--background)]">
      <AuthBranding />
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center py-12 px-6 sm:px-12 relative overflow-y-auto h-full">
        <div className="w-full max-w-[420px]">

          {/* Heading */}
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-[var(--foreground)] mb-3 tracking-tight">
              {AUTH_TEXTS.REGISTER.WELCOME_TITLE}
            </h2>
            <p className="text-[var(--muted)] text-[15px] leading-relaxed">
              {AUTH_TEXTS.REGISTER.WELCOME_SUBTITLE}
            </p>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-[var(--surface)] text-[var(--foreground)] rounded-xl py-3.5 px-4 font-bold hover:bg-[var(--surface-raised)] border border-[var(--border-color)] transition-all mb-8 tracking-tight disabled:opacity-50"
          >
            <GoogleIcon size={20} />
            {AUTH_TEXTS.REGISTER.CONTINUE_WITH_GOOGLE}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-[var(--border-color)]" />
            <p className="text-[10px] text-[var(--muted)] font-extrabold tracking-[0.2em] uppercase">
              {AUTH_TEXTS.REGISTER.OR_REGISTER_WITH_EMAIL}
            </p>
            <div className="flex-1 h-px bg-[var(--border-color)]" />
          </div>

          {/* Error */}
          {displayError && (
            <div className="bg-[hsl(343_85%_58%/0.08)] border border-[hsl(343_85%_58%/0.25)] rounded-xl p-3 mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-[hsl(343_72%_48%)] text-lg">error</span>
              <p className="text-[hsl(343_72%_48%)] text-xs font-bold">{displayError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>{AUTH_TEXTS.REGISTER.NAME_LABEL}</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={AUTH_TEXTS.REGISTER.NAME_PLACEHOLDER}
                className={inputClass}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className={labelClass}>{AUTH_TEXTS.REGISTER.EMAIL_LABEL}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={AUTH_TEXTS.REGISTER.EMAIL_PLACEHOLDER}
                className={inputClass}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{AUTH_TEXTS.REGISTER.PASSWORD_LABEL}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={AUTH_TEXTS.REGISTER.PASSWORD_PLACEHOLDER}
                    className={inputSmClass}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[hsl(239_68%_58%)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>{AUTH_TEXTS.REGISTER.CONFIRM_PASSWORD_LABEL}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder={AUTH_TEXTS.REGISTER.CONFIRM_PASSWORD_PLACEHOLDER}
                    className={inputSmClass}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[hsl(239_68%_58%)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[hsl(239_68%_58%)] text-white font-bold rounded-xl py-4 mt-4 hover:bg-[hsl(239_62%_52%)] active:scale-[0.98] transition-all shadow-[0_8px_20px_-4px_hsl(239_68%_58%/0.30)] disabled:bg-[var(--surface)] disabled:text-[var(--muted)] disabled:shadow-none disabled:cursor-not-allowed text-sm uppercase tracking-wider"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {AUTH_TEXTS.REGISTER.REGISTER_LOADING}
                </div>
              ) : AUTH_TEXTS.REGISTER.REGISTER_BUTTON}
            </button>
          </form>

          <p className="text-center text-[var(--muted)] text-[14px] mt-8">
            {AUTH_TEXTS.REGISTER.HAVE_ACCOUNT}{' '}
            <Link to="/login" className="font-bold text-[hsl(239_68%_58%)] hover:underline">
              {AUTH_TEXTS.REGISTER.LOGIN_NOW}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}