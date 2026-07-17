import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import AuthBranding from "@/features/auth/components/AuthBranding";
import { authService } from "@/shared/services/auth.service";
import { Button } from "@/shared/ui/Premium";
import { FORGOT_PASSWORD_FLOW_TEXTS } from "@/shared/constants/texts";


const TEXTS = FORGOT_PASSWORD_FLOW_TEXTS;

const MAX_OTP_ATTEMPTS = 3;
const RESEND_TIMER_SECONDS = 60;
const LOCKOUT_DURATION_MS = 60000;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [lastEmailSent, setLastEmailSent] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [failedOtpAttempts, setFailedOtpAttempts] = useState(0);
  const [otpLockoutTimer, setOtpLockoutTimer] = useState(0);
  const navigate = useNavigate();
  const inputRefs = useRef([]);

  useEffect(() => {
    const checkEmail = step === "email" ? email : lastEmailSent;
    if (!checkEmail) {
      setOtpLockoutTimer(0);
      return;
    }
    const storedLockout = localStorage.getItem(`otp_lockout_${checkEmail}`);
    if (!storedLockout) {
      setOtpLockoutTimer(0);
      setFailedOtpAttempts(0);
      return;
    }
    const remaining = Math.ceil((parseInt(storedLockout) - Date.now()) / 1000);
    if (remaining > 0) {
      setOtpLockoutTimer(remaining);
      setFailedOtpAttempts(MAX_OTP_ATTEMPTS);
    } else {
      setOtpLockoutTimer(0);
      localStorage.removeItem(`otp_lockout_${checkEmail}`);
    }
  }, [email, lastEmailSent, step]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      setOtpLockoutTimer((prev) => {
        if (prev <= 0) return 0;
        const checkEmail = step === "email" ? email : lastEmailSent;
        if (!checkEmail) return 0;

        const storedLockout = localStorage.getItem(`otp_lockout_${checkEmail}`);
        if (!storedLockout) {
          setFailedOtpAttempts(0);
          return 0;
        }

        const remaining = Math.ceil((parseInt(storedLockout, 10) - Date.now()) / 1000);
        if (remaining <= 0) {
          localStorage.removeItem(`otp_lockout_${checkEmail}`);
          setFailedOtpAttempts(0);
          return 0;
        }
        return remaining;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [email, lastEmailSent, step]);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const nextOtp = [...otpValues];
    nextOtp[index] = value.slice(-1);
    setOtpValues(nextOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSendOtp = async (event = null) => {
    event?.preventDefault();
    if (resendTimer > 0 && email === lastEmailSent) {
      setError(TEXTS.errors.waitBeforeResend(resendTimer));
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      setLastEmailSent(email);
      setOtpValues(["", "", "", "", "", ""]);
      setStep("otp");
      setResendTimer(RESEND_TIMER_SECONDS);
    } catch (err) {
      setError(err.message || TEXTS.errors.emailNotFound);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (otpLockoutTimer > 0) return;
    const otpString = otpValues.join("");
    if (otpString.length < 6) {
      setError(TEXTS.errors.otpIncomplete);
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await authService.verifyOtp(lastEmailSent, otpString);
      setNewPassword("");
      setConfirmPassword("");
      setStep("reset");
      localStorage.removeItem(`otp_lockout_${lastEmailSent}`);
    } catch (err) {
      const newAttempts = failedOtpAttempts + 1;
      setFailedOtpAttempts(newAttempts);
      if (newAttempts >= MAX_OTP_ATTEMPTS) {
        const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        localStorage.setItem(`otp_lockout_${lastEmailSent}`, lockoutUntil.toString());
        setOtpLockoutTimer(LOCKOUT_DURATION_MS / 1000);
      } else {
        setError(err.message || TEXTS.errors.otpWrong(MAX_OTP_ATTEMPTS - newAttempts));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError(TEXTS.errors.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(TEXTS.errors.passwordMismatch);
      return;
    }
    setIsLoading(true);
    try {
      await authService.resetPassword(lastEmailSent, otpValues.join(""), newPassword);
      setStep("success");
    } catch (err) {
      setError(err.message || TEXTS.errors.resetFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const header = {
    ...TEXTS.header[step],
    subtitle: step === "otp" ? TEXTS.header.otp.subtitle(lastEmailSent) : TEXTS.header[step].subtitle,
  };

  const inputClass = "premium-input h-12 px-4 pr-11";

  const renderContent = () => {
    if (step === "email") {
      return (
        <form onSubmit={handleSendOtp} className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold text-[var(--muted)]">{TEXTS.emailLabel}</span>
            <span className="relative block">
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder={TEXTS.emailPlaceholder}
                className={inputClass}
                required
                disabled={isLoading}
              />
              <span className="material-symbols-outlined pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--muted-light)]">
                mail
              </span>
            </span>
          </label>
          <Button type="submit" disabled={isLoading || (resendTimer > 0 && email === lastEmailSent)} className="w-full">
            {isLoading ? TEXTS.processing : resendTimer > 0 && email === lastEmailSent ? TEXTS.retryAfter(resendTimer) : TEXTS.continue}
          </Button>
        </form>
      );
    }

    if (step === "otp") {
      return (
        <form onSubmit={handleVerifyOtp} className="space-y-7 premium-reveal">
          <div className="grid grid-cols-6 gap-3">
            {otpValues.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(event) => handleOtpChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                disabled={isLoading || otpLockoutTimer > 0}
                className="h-12 w-full rounded-lg border border-[var(--border-color)] bg-[var(--surface-raised)] text-center text-[20px] font-bold text-[var(--foreground)] outline-none transition-all focus:border-[var(--muted)] disabled:opacity-50"
                required
              />
            ))}
          </div>
          <div className="space-y-4">
            <Button type="submit" disabled={isLoading || otpLockoutTimer > 0} className="w-full">
              {isLoading ? TEXTS.checking : otpLockoutTimer > 0 ? TEXTS.locked : TEXTS.verifyOtp}
            </Button>
            <p className="text-center text-[13px] font-medium text-[var(--muted)]">
              {TEXTS.noCode}{" "}
              {resendTimer > 0 ? (
                <span className="text-[var(--muted-light)]">{TEXTS.retryAfter(resendTimer)}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  className="font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-strong)]"
                  disabled={otpLockoutTimer > 0}
                >
                  {TEXTS.resendNow}
                </button>
              )}
            </p>
          </div>
        </form>
      );
    }

    if (step === "reset") {
      return (
        <form onSubmit={handleResetPassword} className="space-y-5 premium-reveal">
          {[
            {
              value: newPassword,
              setValue: setNewPassword,
              show: showPassword,
              setShow: setShowPassword,
              placeholder: TEXTS.passwordFields[0].placeholder,
            },
            {
              value: confirmPassword,
              setValue: setConfirmPassword,
              show: showConfirmPassword,
              setShow: setShowConfirmPassword,
              placeholder: TEXTS.passwordFields[1].placeholder,
            },
          ].map((field) => (
            <span key={field.placeholder} className="relative block">
              <input
                type={field.show ? "text" : "password"}
                value={field.value}
                onChange={(event) => field.setValue(event.target.value)}
                placeholder={field.placeholder}
                className={inputClass}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => field.setShow(!field.show)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-light)] hover:text-[var(--brand-primary)]"
                aria-label={field.show ? TEXTS.hidePassword : TEXTS.showPassword}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {field.show ? "visibility_off" : "visibility"}
                </span>
              </button>
            </span>
          ))}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? TEXTS.updating : TEXTS.updatePassword}
          </Button>
        </form>
      );
    }

    return (
      <div className="premium-reveal py-5 text-center">
        <h2 className="text-[24px] font-bold text-[var(--foreground)]">{TEXTS.successTitle}</h2>
        <p className="mt-3 text-[14px] font-medium leading-6 text-[var(--muted)]">
          {TEXTS.successSubtitle}
        </p>
        <Button onClick={() => navigate("/login", { replace: true })} className="mt-7 w-full">
          {TEXTS.loginNow}
        </Button>
      </div>
    );
  };

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

        {step !== "success" && (
          <button
            type="button"
            onClick={() => (step === "email" ? navigate("/login", { replace: true }) : setStep("email"))}
            className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-bold text-[var(--muted)] transition-all hover:bg-[var(--surface)] hover:text-[var(--foreground)] sm:left-8 sm:top-8"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {step === "email" ? TEXTS.back : TEXTS.return}
          </button>
        )}

        <div className="premium-card relative z-10 w-full max-w-[430px] p-5 sm:p-6">
          {step !== "success" && (
            <div className="mb-7">
              <p className="mb-3 font-mono text-[11px] font-semibold text-[var(--muted)]">
                {header.tag}
              </p>
              <h2 className="text-[30px] font-bold leading-[1.05] text-[var(--foreground)]">
                {header.title}
              </h2>
              <p className="mt-3 text-[14px] font-medium leading-6 text-[var(--muted)]">{header.subtitle}</p>
            </div>
          )}

          {(error || (step === "otp" && otpLockoutTimer > 0)) && (
            <div className="mb-5 flex items-center gap-3 rounded-lg border border-[hsl(346_78%_53%/0.24)] bg-[hsl(346_78%_53%/0.08)] p-3">
              <span className="material-symbols-outlined shrink-0 text-[18px] text-[var(--brand-rose)]">
                {step === "otp" && otpLockoutTimer > 0 ? "timer" : "info"}
              </span>
              <p className="text-[13px] font-semibold text-[var(--brand-rose)]">
                {step === "otp" && otpLockoutTimer > 0
                  ? TEXTS.errors.otpLockout(otpLockoutTimer)
                  : error}
              </p>
            </div>
          )}

          {renderContent()}
        </div>
      </div>
    </div>
  );
}
