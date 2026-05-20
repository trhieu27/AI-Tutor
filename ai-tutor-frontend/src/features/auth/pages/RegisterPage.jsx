import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/features/auth/context/AuthContext";
import { AUTH_TEXTS } from "@/shared/constants/texts";
import AuthBranding from "@/features/auth/components/AuthBranding";
import GoogleIcon from "@/shared/ui/GoogleIcon";
import { Button } from "@/shared/ui/Premium";


export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const { register, googleLogin: loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (event) => {
    event.preventDefault();
    setLocalError("");
    if (password !== confirmPassword) {
      setLocalError(AUTH_TEXTS.REGISTER.PASSWORD_MISMATCH);
      return;
    }
    try {
      await register(name, email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setLocalError(err?.message || AUTH_TEXTS.REGISTER.REGISTER_ERROR);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLocalError("");
      try {
        await loginWithGoogle(tokenResponse.access_token);
        navigate("/", { replace: true });
      } catch (err) {
        setLocalError(err.message || AUTH_TEXTS.GOOGLE.ERROR);
      }
    },
    onError: () => setLocalError(AUTH_TEXTS.GOOGLE.ERROR),
  });

  const fieldClass = "premium-input h-12 px-4";

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

        <div className="premium-card relative z-10 w-full max-w-[460px] p-5 sm:p-6">
          <div className="mb-7">
            <p className="mb-3 font-mono text-[11px] font-semibold text-[var(--muted)]">
              {AUTH_TEXTS.REGISTER.KICKER}
            </p>
            <h2 className="text-[30px] font-bold leading-[1.05] text-[var(--foreground)]">
              {AUTH_TEXTS.REGISTER.WELCOME_TITLE}
            </h2>
            <p className="mt-3 text-[14px] font-medium leading-6 text-[var(--muted)]">
              {AUTH_TEXTS.REGISTER.WELCOME_SUBTITLE}
            </p>
          </div>

          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={isLoading}
            className="premium-button premium-button-secondary mb-5 w-full"
          >
            <GoogleIcon size={18} />
            <span>{AUTH_TEXTS.REGISTER.CONTINUE_WITH_GOOGLE}</span>
          </button>

          <div className="mb-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-[var(--border-color)]" />
            <p className="font-mono text-[10px] font-semibold text-[var(--muted-light)]">
              {AUTH_TEXTS.REGISTER.OR_REGISTER_WITH_EMAIL}
            </p>
            <div className="h-px flex-1 bg-[var(--border-color)]" />
          </div>

          {localError && (
            <div className="mb-5 flex items-center gap-3 rounded-lg border border-[hsl(346_78%_53%/0.24)] bg-[hsl(346_78%_53%/0.08)] p-3">
              <span className="material-symbols-outlined shrink-0 text-[18px] text-[var(--brand-rose)]">error</span>
              <p className="text-[13px] font-semibold text-[var(--brand-rose)]">{localError}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[var(--muted)]">
                {AUTH_TEXTS.REGISTER.NAME_LABEL}
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={AUTH_TEXTS.REGISTER.NAME_PLACEHOLDER}
                className={fieldClass}
                required
                disabled={isLoading}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[var(--muted)]">
                {AUTH_TEXTS.REGISTER.EMAIL_LABEL}
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={AUTH_TEXTS.REGISTER.EMAIL_PLACEHOLDER}
                className={fieldClass}
                required
                disabled={isLoading}
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold text-[var(--muted)]">
                  {AUTH_TEXTS.REGISTER.PASSWORD_LABEL}
                </span>
                <span className="relative block">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={AUTH_TEXTS.REGISTER.PASSWORD_PLACEHOLDER}
                    className={`${fieldClass} pr-11`}
                    autoComplete="new-password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-light)] hover:text-[var(--brand-primary)]"
                    aria-label={showPassword ? AUTH_TEXTS.COMMON.hidePassword : AUTH_TEXTS.COMMON.showPassword}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold text-[var(--muted)]">
                  {AUTH_TEXTS.REGISTER.CONFIRM_PASSWORD_LABEL}
                </span>
                <span className="relative block">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={AUTH_TEXTS.REGISTER.CONFIRM_PASSWORD_PLACEHOLDER}
                    className={`${fieldClass} pr-11`}
                    autoComplete="new-password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-light)] hover:text-[var(--brand-primary)]"
                    aria-label={showConfirmPassword ? AUTH_TEXTS.COMMON.hidePassword : AUTH_TEXTS.COMMON.showPassword}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showConfirmPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </span>
              </label>
            </div>

            <Button type="submit" disabled={isLoading} className="mt-2 w-full">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden="true" />
                  {AUTH_TEXTS.REGISTER.REGISTER_LOADING}
                </span>
              ) : (
                AUTH_TEXTS.REGISTER.REGISTER_BUTTON
              )}
            </Button>
          </form>

          <p className="mt-7 text-center text-[13px] font-medium text-[var(--muted)]">
            {AUTH_TEXTS.REGISTER.HAVE_ACCOUNT}{" "}
            <Link to="/login" className="font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-strong)]">
              {AUTH_TEXTS.REGISTER.LOGIN_NOW}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
