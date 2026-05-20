import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { ADMIN_TEXTS } from "@/shared/constants/texts";
import Button from "@/shared/ui/Button";
import { BrandMark } from "@/shared/ui/BrandMark";

const ADMIN_SCOPES = [
  { label: "Tài liệu", value: "Quản lý và xử lý tài liệu", icon: "description" },
  { label: "Người dùng", value: "Quản lý tài khoản và quyền", icon: "group" },
  { label: "Doanh thu", value: "Theo dõi gói dịch vụ", icon: "payments" },
];

const ACCESS_ROWS = [
  { label: "Vai trò", value: "Quản trị viên hệ thống" },
  { label: "Quản lý", value: "Tài liệu, người dùng, gói dịch vụ" },
  { label: "Ghi nhận", value: "Mọi thao tác được lưu nhật ký" },
];

function AdminBrandingBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            `linear-gradient(to right, var(--grid-line-light) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line-light) 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--glow-primary),transparent_38%,var(--glow-accent))]" />
      <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />
      <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08]" />
      <div className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />
      <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--glow-primary)_0%,transparent_70%)]" />
    </div>
  );
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin01@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const { adminLogin, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");
    try {
      await adminLogin(email, password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setLocalError(err.message || ADMIN_TEXTS.login.error);
    }
  };

  const displayError = localError || error;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="relative grid min-h-[100dvh] lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
        <section
          className="relative hidden min-h-[100dvh] flex-col justify-between overflow-hidden border-r border-white/10 bg-[var(--auth-dark-bg)] px-8 py-7 text-white lg:flex xl:px-12"
        >
          <AdminBrandingBackdrop />

          <div className="relative z-10 flex items-center gap-4">
            <div className="flex min-w-0 items-center gap-3" aria-label="AI Tutor">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/[0.12] ring-1 ring-white/[0.15]">
                <span className="material-symbols-outlined text-[22px] text-white" aria-hidden="true">school</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[16px] font-[780] leading-5 text-white">AI Tutor</span>
                <span className="block truncate text-[11px] font-bold leading-4 text-white/55">Quản trị hệ thống</span>
              </span>
            </div>
          </div>

          <div className="relative z-10 mx-auto grid w-full max-w-[850px] grid-cols-[minmax(0,1fr)_280px] items-end gap-7">
            <div className="min-w-0 flex-1 pb-10">
              <h1 className="max-w-[560px] text-[38px] font-[780] leading-[1.04] text-white xl:text-[46px]">
                {ADMIN_TEXTS.login.title}
              </h1>
              <p className="mt-5 max-w-[520px] text-[14px] font-medium leading-7 text-white/68">
                {ADMIN_TEXTS.login.subtitle}
              </p>

              <div className="mt-9 max-w-[620px] overflow-hidden rounded-[var(--radius-panel)] border border-white/10 bg-white/[0.06] shadow-[0_18px_44px_var(--shadow-deep)]">
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-[13px] font-[760] leading-5 text-white">Thông tin truy cập</p>
                </div>
                <div className="divide-y divide-white/10">
                  {ACCESS_ROWS.map((row) => (
                    <div key={row.label} className="grid grid-cols-[130px_1fr] items-center gap-4 px-4 py-3">
                      <span className="text-[12px] font-bold text-white/55">{row.label}</span>
                      <span className="min-w-0 truncate text-[13px] font-[760] text-white">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-[var(--radius-panel)] border border-white/10 bg-white/[0.06] p-3 shadow-[0_18px_44px_var(--shadow-deep)]">
              <div className="mb-2 flex items-center justify-between gap-3 px-2 py-1">
                <p className="text-[12px] font-[760] text-white">Chức năng quản lý</p>
                <span className="material-symbols-outlined text-[16px] text-white/55" aria-hidden="true">tune</span>
              </div>
              <div className="space-y-2">
                {ADMIN_SCOPES.map((item) => (
                  <div key={item.label} className="grid grid-cols-[34px_1fr] items-center gap-3 rounded-[var(--radius-control)] p-2 transition-colors duration-150 hover:bg-white/[0.06]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-chip)] border border-white/10 bg-white/[0.08] text-white/68">
                      <span className="material-symbols-outlined text-[17px]" aria-hidden="true">{item.icon}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-[760] leading-5 text-white">{item.label}</span>
                      <span className="block truncate text-[11px] font-semibold leading-4 text-white/55">{item.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <span aria-hidden="true" />
        </section>

        <main className="relative flex min-h-[100dvh] flex-col overflow-hidden border-[var(--border-color)] bg-[var(--card-bg)] px-5 py-5 shadow-[var(--premium-shadow-md)] lg:border-l sm:px-8">
          {/* Subtle background decoration */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -right-20 -top-20 h-[340px] w-[340px] rounded-full opacity-40" style={{ background: 'radial-gradient(circle, var(--glow-primary) 0%, transparent 70%)' }} />
            <div className="absolute -bottom-16 -left-16 h-[260px] w-[260px] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, var(--glow-accent) 0%, transparent 70%)' }} />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(var(--foreground) 0.8px, transparent 0.8px)', backgroundSize: '20px 20px' }} />
          </div>

          <div className="relative z-10 flex items-center gap-3 lg:hidden">
            <div className="flex min-w-0 items-center gap-3" aria-label="AI Tutor">
              <BrandMark />
              <span className="min-w-0">
                <span className="block truncate text-[16px] font-[780] leading-5">AI Tutor</span>
              </span>
            </div>
          </div>

          <div className="relative z-10 flex flex-1 items-center justify-center py-10">
            <form onSubmit={handleSubmit} className="w-full max-w-[390px]">
              <div className="mb-7">
                <h2 className="text-[26px] font-[780] leading-[1.12] text-[var(--foreground)]">Đăng nhập quản trị</h2>
                <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--muted)]">Sử dụng tài khoản admin được cấp quyền.</p>
              </div>

              {displayError && (
                <div
                  className="mb-5 flex items-start gap-3 rounded-[var(--radius-panel)] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-3 text-[var(--brand-rose)]"
                  role="alert"
                  aria-live="polite"
                >
                  <span className="material-symbols-outlined shrink-0 text-[18px]" aria-hidden="true">error</span>
                  <p className="text-[13px] font-bold leading-5">{displayError}</p>
                </div>
              )}

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-bold text-[var(--muted)]">{ADMIN_TEXTS.login.email}</span>
                  <span className="relative block">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="premium-input h-12 px-4 pr-11"
                      placeholder="admin@aitutor.vn"
                      autoComplete="username"
                      disabled={isLoading}
                      required
                    />
                    <span className="material-symbols-outlined pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--muted-light)]" aria-hidden="true">
                      mail
                    </span>
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-bold text-[var(--muted)]">{ADMIN_TEXTS.login.password}</span>
                  <span className="relative block">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="premium-input h-12 px-4 pr-11"
                      autoComplete="current-password"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={isLoading}
                      className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-chip)] text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{showPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </span>
                </label>
              </div>

              <Button type="submit" icon="login" loading={isLoading} disabled={isLoading} className="mt-5 h-12 w-full">
                {isLoading ? ADMIN_TEXTS.login.loading : ADMIN_TEXTS.login.submit}
              </Button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
