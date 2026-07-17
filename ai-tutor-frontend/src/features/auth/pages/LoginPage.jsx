import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/features/auth/context/AuthContext";
import { AUTH_TEXTS } from "@/shared/constants/texts";
import AuthBranding from "@/features/auth/components/AuthBranding";
import GoogleIcon from "@/shared/ui/GoogleIcon";
import { Button } from "@/shared/ui/Premium";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60000;


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const { login, googleLogin: loginWithGoogle, isLoading, error: authError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  useEffect(() => {
    const storedLockoutUntil = localStorage.getItem("login_lockout_until");
    if (!storedLockoutUntil) return;
    const remaining = Math.ceil((parseInt(storedLockoutUntil) - Date.now()) / 1000);
    if (remaining > 0) {
      setLockoutTimer(remaining);
      setFailedAttempts(MAX_LOGIN_ATTEMPTS);
    } else {
      localStorage.removeItem("login_lockout_until");
    }
  }, []);

  useEffect(() => {
    if (lockoutTimer <= 0) return undefined;

    const updateTimer = () => {
      const storedLockoutUntil = localStorage.getItem("login_lockout_until");
      if (!storedLockoutUntil) {
        setLockoutTimer(0);
        return;
      }

      const remaining = Math.ceil((parseInt(storedLockoutUntil, 10) - Date.now()) / 1000);

      if (remaining <= 0) {
        setLockoutTimer(0);
        setFailedAttempts(0);
        localStorage.removeItem("login_lockout_until");
      } else {
        setLockoutTimer(remaining);
      }
    };

    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (lockoutTimer > 0) return;
    setLocalError("");
    try {
      await login(email, password);
      navigate(redirectUrl, { replace: true });
    } catch (err) {
      const errorMsg = err.message || "";
      const secondsMatch = errorMsg.match(/thử lại sau (\d+)\s*giây/i);
      const minutesMatch = errorMsg.match(/tạm khóa trong (\d+)\s*phút/i);

      if (secondsMatch) {
        const seconds = parseInt(secondsMatch[1], 10);
        const lockoutUntil = Date.now() + seconds * 1000;
        localStorage.setItem("login_lockout_until", lockoutUntil.toString());
        setLockoutTimer(seconds);
        setFailedAttempts(MAX_LOGIN_ATTEMPTS);
      } else if (minutesMatch) {
        const minutes = parseInt(minutesMatch[1], 10);
        const lockoutUntil = Date.now() + minutes * 60 * 1000;
        localStorage.setItem("login_lockout_until", lockoutUntil.toString());
        setLockoutTimer(minutes * 60);
        setFailedAttempts(MAX_LOGIN_ATTEMPTS);
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
          localStorage.setItem("login_lockout_until", lockoutUntil.toString());
          setLockoutTimer(LOCKOUT_DURATION_MS / 1000);
        } else {
          const errorMessage = err.message || AUTH_TEXTS.LOGIN.LOGIN_ERROR;
          setLocalError(errorMessage === "Failed to fetch" ? AUTH_TEXTS.COMMON.networkError : errorMessage);
        }
      }
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLocalError("");
      try {
        const user = await loginWithGoogle(tokenResponse.access_token);
        navigate(user?.role === "ADMIN" ? "/admin" : redirectUrl, { replace: true });
      } catch (err) {
        setLocalError(err.message || AUTH_TEXTS.GOOGLE.ERROR);
      }
    },
    onError: () => setLocalError(AUTH_TEXTS.GOOGLE.ERROR),
  });

  const displayError = localError || authError;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[var(--background)] font-sans text-[var(--foreground)]">
      <AuthBranding />

      <div className="relative flex h-full w-full items-center justify-center overflow-y-auto px-5 py-10 lg:w-1/2">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(204 18% 70% / 0.10) 1px, transparent 1px), linear-gradient(to bottom, hsl(204 18% 70% / 0.10) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        <div className="premium-card relative z-10 w-full max-w-[420px] p-5 sm:p-6">
          <div className="mb-7">
            <p className="mb-3 font-mono text-[11px] font-semibold text-[var(--muted)]">
              {AUTH_TEXTS.LOGIN.KICKER}
            </p>
            <h2 className="text-[30px] font-bold leading-[1.05] text-[var(--foreground)]">
              {AUTH_TEXTS.LOGIN.WELCOME_TITLE}
            </h2>
            <p className="mt-3 text-[14px] font-medium leading-6 text-[var(--muted)]">
              {AUTH_TEXTS.LOGIN.WELCOME_SUBTITLE}
            </p>
          </div>

          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={isLoading || lockoutTimer > 0}
            className="premium-button premium-button-secondary mb-5 w-full"
          >
            <GoogleIcon size={18} />
            <span>{AUTH_TEXTS.LOGIN.CONTINUE_WITH_GOOGLE}</span>
          </button>

          <div className="mb-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-[var(--border-color)]" />
            <p className="font-mono text-[10px] font-semibold text-[var(--muted-light)]">
              {AUTH_TEXTS.LOGIN.OR_LOGIN_WITH_EMAIL}
            </p>
            <div className="h-px flex-1 bg-[var(--border-color)]" />
          </div>

          {lockoutTimer > 0 ? (
            <div className="mb-5 rounded-lg border border-[hsl(346_78%_53%/0.24)] bg-[hsl(346_78%_53%/0.08)] p-3 text-center">
              <p className="text-[13px] font-semibold text-[var(--brand-rose)]">
                {AUTH_TEXTS.LOGIN.RATE_LIMIT_COUNTDOWN?.(lockoutTimer) || AUTH_TEXTS.COMMON.lockoutFallback(lockoutTimer)}
              </p>
            </div>
          ) : displayError ? (
            <div className="mb-5 flex items-center gap-3 rounded-lg border border-[hsl(346_78%_53%/0.24)] bg-[hsl(346_78%_53%/0.08)] p-3">
              <span className="material-symbols-outlined shrink-0 text-[18px] text-[var(--brand-rose)]">error</span>
              <p className="text-[13px] font-semibold text-[var(--brand-rose)]">{displayError}</p>
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[var(--muted)]">
                {AUTH_TEXTS.LOGIN.EMAIL_LABEL}
              </span>
              <span className="relative block">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={AUTH_TEXTS.LOGIN.EMAIL_PLACEHOLDER}
                  className="premium-input h-12 px-4 pr-11"
                  autoComplete="username"
                  required
                  disabled={isLoading || lockoutTimer > 0}
                />
                <span className="material-symbols-outlined pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--muted-light)]">
                  mail
                </span>
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center justify-between">
                <span className="text-[12px] font-bold text-[var(--muted)]">
                  {AUTH_TEXTS.LOGIN.PASSWORD_LABEL}
                </span>
                <Link to="/forgot-password" className="text-[12px] font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-strong)]">
                  {AUTH_TEXTS.LOGIN.FORGOT_PASSWORD}
                </Link>
              </span>
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={AUTH_TEXTS.LOGIN.PASSWORD_PLACEHOLDER}
                  className="premium-input h-12 px-4 pr-11"
                  autoComplete="current-password"
                  required
                  disabled={isLoading || lockoutTimer > 0}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-light)] transition-colors hover:text-[var(--brand-primary)]"
                  aria-label={showPassword ? AUTH_TEXTS.COMMON.hidePassword : AUTH_TEXTS.COMMON.showPassword}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </span>
            </label>

            <Button type="submit" disabled={isLoading || lockoutTimer > 0} className="mt-2 w-full">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden="true" />
                  {AUTH_TEXTS.LOGIN.LOGIN_LOADING}
                </span>
              ) : (
                AUTH_TEXTS.LOGIN.LOGIN_BUTTON
              )}
            </Button>
          </form>

          <p className="mt-7 text-center text-[13px] font-medium text-[var(--muted)]">
            {AUTH_TEXTS.LOGIN.NO_ACCOUNT}{" "}
            <Link to={redirectUrl !== "/" ? `/register?redirect=${encodeURIComponent(redirectUrl)}` : "/register"} className="font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-strong)]">
              {AUTH_TEXTS.LOGIN.REGISTER_NOW}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
