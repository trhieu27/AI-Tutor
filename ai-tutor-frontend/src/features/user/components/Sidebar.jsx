import { Link, useLocation } from "react-router-dom";
import { APP_SHELL_TEXTS, SIDEBAR_TEXTS } from "@/shared/constants/texts";
import { useAuth } from "@/features/auth/context/AuthContext";
import { cx } from "@/shared/ui/Premium";

const mainNav = APP_SHELL_TEXTS.nav;
const bottomNav = APP_SHELL_TEXTS.bottomNav;
const T = APP_SHELL_TEXTS.sidebar;

function NavLink({ item, isActive, onClose }) {
  return (
    <Link
      to={item.href}
      onClick={() => onClose?.()}
      className={cx(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold transition-all duration-200",
        isActive
          ? "bg-[var(--foreground)] text-[var(--background)] shadow-[0_12px_28px_hsl(222_29%_12%/0.16)]"
          : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
      )}
    >
      <span
        className={cx(
          "material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:scale-110",
          isActive ? "icon-filled" : "icon-thin"
        )}
      >
        {item.icon}
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export default function Sidebar({ onClose }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isPro = user?.isPro ?? user?.is_pro ?? false;

  return (
    <aside className="flex h-[100dvh] w-64 shrink-0 flex-col overflow-hidden border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] transition-colors duration-300">
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-color)] px-4">
        <Link to="/" className="group flex min-w-0 items-center gap-3" onClick={() => onClose?.()}>
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--foreground)] text-[var(--background)] shadow-[0_10px_24px_hsl(222_29%_12%/0.16)] transition-transform duration-200 group-hover:-translate-y-0.5">
            <span className="material-symbols-outlined text-[18px]">school</span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold leading-none text-[var(--foreground)]">
              {SIDEBAR_TEXTS.brand.title}
            </span>
            <span className="mt-1 block truncate font-mono text-[10px] font-semibold text-[var(--muted)]">
              {T.brandSubtitle}
            </span>
          </span>
        </Link>

        {onClose && (
          <button className="premium-icon-button lg:hidden" onClick={() => onClose()} aria-label={T.closeMenu}>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-3 py-4">
        <div className="mb-3 px-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-normal text-[var(--muted-light)]">
            {T.workspaceLabel}
          </p>
        </div>

        <nav className="flex flex-col gap-1" aria-label={T.mainNavAria}>
          {mainNav.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return <NavLink key={item.href} item={item} isActive={isActive} onClose={onClose} />;
          })}
        </nav>

        {/* Khoảng trống đẩy xuống */}
        <div className="flex-1" />

        {/* Thẻ nâng cấp — chỉ hiển với user miễn phí */}
        {!isPro && (
          <Link to="/pricing" onClick={() => onClose?.()} className="block">
            <div className="rounded-lg bg-[var(--brand-primary)] p-3 text-white transition-transform duration-200 hover:-translate-y-0.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold">{T.upgradeTitle}</p>
                  <p className="mt-0.5 truncate text-[10px] font-medium opacity-75">{T.upgradeSubtitle}</p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Đường kẻ ngăn cách */}
        <div className="my-3 border-t border-[var(--border-color)]" />

        {/* Nav phụ — Cài đặt & Trợ giúp */}
        <nav className="flex flex-col gap-1">
          {bottomNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return <NavLink key={item.href} item={item} isActive={isActive} onClose={onClose} />;
          })}
        </nav>
      </div>
    </aside>
  );
}
