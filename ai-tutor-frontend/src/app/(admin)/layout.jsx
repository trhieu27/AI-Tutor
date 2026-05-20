import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_TEXTS } from "@/constants/texts";
import { cx } from "@/components/ui/Premium";
import { BrandLockup } from "@/components/BrandMark";

function AdminNavItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          "flex h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-[13px] font-bold transition",
          isActive
            ? "bg-[var(--foreground)] text-[var(--background)] shadow-[var(--premium-shadow-sm)]"
            : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
        )
      }
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

function AdminSidebar({ onNavigate }) {
  return (
    <aside className="flex h-full flex-col border-r border-[var(--border-color)] bg-[var(--sidebar-bg)]">
      <div className="flex h-16 shrink-0 items-center border-b border-[var(--border-color)] px-4">
        <BrandLockup to="/admin" title={ADMIN_TEXTS.shell.brand} subtitle={ADMIN_TEXTS.shell.subtitle} size="sm" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 custom-scrollbar" aria-label="Admin">
        {ADMIN_TEXTS.shell.nav.map((item) => (
          <AdminNavItem key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    </aside>
  );
}

function AdminMobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-color)] bg-[var(--sidebar-bg)] px-2 py-2 md:hidden" aria-label="Admin mobile">
      <div className="flex gap-1 overflow-x-auto custom-scrollbar">
        {ADMIN_TEXTS.shell.nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              cx(
                "flex min-w-16 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] px-2 py-2 text-[10px] font-bold transition",
                isActive
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              )
            }
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{item.icon}</span>
            <span className="max-w-20 truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  const title = useMemo(() => {
    const exact = ADMIN_TEXTS.shell.titles[location.pathname];
    if (exact) return exact;
    const matched = [...ADMIN_TEXTS.shell.nav].reverse().find((item) => location.pathname.startsWith(item.to));
    return matched?.label || ADMIN_TEXTS.shell.brand;
  }, [location.pathname]);

  return (
    <div className="app-canvas min-h-screen overflow-x-hidden text-[var(--foreground)]">
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-50 backdrop-blur-sm md:hidden"
          style={{ background: "color-mix(in oklch, var(--foreground) 72%, transparent)" }}
          aria-label={ADMIN_TEXTS.shell.closeMenu}
          onClick={() => setOpen(false)}
        />
      )}

      <div className={cx("fixed inset-y-0 left-0 z-[60] w-72 transform transition-transform duration-200 ease-[var(--ease-reveal)] md:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <AdminSidebar onNavigate={() => setOpen(false)} />
      </div>

      <header className="sticky top-0 z-30 border-b border-[var(--border-color)] bg-[var(--header-bg)] backdrop-blur-xl md:ml-72">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="premium-icon-button md:hidden"
              aria-label={ADMIN_TEXTS.shell.openMenu}
              onClick={() => setOpen(true)}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">menu</span>
            </button>
            <div className="min-w-0">
              <p className="text-[14px] font-[780] leading-5 text-[var(--foreground)]">{title}</p>
              <p className="text-[11px] font-bold leading-4 text-[var(--muted)]">{ADMIN_TEXTS.shell.roleLabel}</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[220px] text-[12px] font-bold leading-5 text-[var(--foreground)]">{user?.full_name || user?.email}</p>
              <p className="max-w-[220px] break-all text-[11px] font-semibold leading-4 text-[var(--muted)]">{user?.email}</p>
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => logout("/admin/login")}
              className="inline-flex h-8 shrink-0 items-center gap-2 rounded-[var(--radius-control)] border border-transparent px-3 text-[12px] font-[760] text-[var(--brand-rose)] transition-all duration-150 ease-[var(--ease-reveal)] hover:bg-[var(--danger-soft)] active:scale-[0.97]"
            >
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">logout</span>
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <div className="min-w-0 md:ml-72">
        <main className="min-w-0 pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>
      <AdminMobileNav />
    </div>
  );
}
