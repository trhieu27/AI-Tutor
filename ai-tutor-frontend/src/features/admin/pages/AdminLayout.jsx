import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";
import { useAuth } from "@/features/auth/context/AuthContext";
import { ADMIN_TEXTS } from "@/shared/constants/texts";
import { cx } from "@/shared/ui/Premium";
import { BrandLockup } from "@/shared/ui/BrandMark";

function AdminNavItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          "admin-nav-link flex h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-[13px] font-bold",
          isActive && "is-active"
        )
      }
    >
      <span className="admin-nav-icon" aria-hidden="true">
        <span className="material-symbols-outlined icon-strong text-[18px]">{item.icon}</span>
      </span>
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

function AdminSidebar({ onNavigate }) {
  return (
    <aside className="admin-sidebar flex h-full flex-col border-r border-[var(--admin-sidebar-border)]">
      <div className="flex h-16 shrink-0 items-center border-b border-[var(--admin-sidebar-border)] px-4">
        <Link to="/admin" onClick={onNavigate} className="admin-sidebar-brand flex min-w-0 items-center gap-3" aria-label={ADMIN_TEXTS.shell.brand}>
          <span className="admin-sidebar-brand-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-panel)] shadow-[var(--premium-shadow-sm)]">
            <span className="material-symbols-outlined icon-strong text-[19px]" aria-hidden="true">school</span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-[780] leading-5">{ADMIN_TEXTS.shell.brand}</span>
            <span className="admin-sidebar-subtitle mt-0.5 block truncate text-[11px] font-bold leading-4">{ADMIN_TEXTS.shell.subtitle}</span>
          </span>
        </Link>
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
    <nav className="admin-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t px-2 py-2 md:hidden" aria-label="Admin mobile">
      <div className="flex gap-1 overflow-x-auto custom-scrollbar">
        {ADMIN_TEXTS.shell.nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              cx(
                "admin-mobile-link flex min-w-16 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] px-2 py-2 text-[10px] font-bold text-[var(--muted)] transition",
                isActive && "is-active"
              )
            }
          >
            <span className="material-symbols-outlined icon-strong text-[18px]" aria-hidden="true">{item.icon}</span>
            <span className="max-w-20 truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const userMenuRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    setShowUserMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = (user?.full_name || user?.email || "A").slice(0, 2).toUpperCase();

  return (
    <div className="admin-shell min-h-screen overflow-x-hidden text-[var(--foreground)]">
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

      <header className="admin-topbar h-16 border-b flex items-center px-4 gap-3 fixed top-0 right-0 left-0 z-40 md:left-72">
        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all duration-150 active:scale-90 focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)] focus-visible:outline-offset-2"
          aria-label={ADMIN_TEXTS.shell.openMenu}
          onClick={() => setOpen(true)}
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* Brand on mobile */}
        <div className="md:hidden">
          <BrandLockup to="/admin" title={ADMIN_TEXTS.shell.brand} subtitle={ADMIN_TEXTS.shell.subtitle} size="sm" />
        </div>

        <div className="min-w-0 flex-1" />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User menu dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu((p) => !p)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface)] transition-all duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)] focus-visible:outline-offset-2"
          >
            <div className="rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] p-[2px] shadow-[var(--premium-shadow-sm)]">
              <div className="w-7 h-7 rounded-full bg-[var(--foreground)] flex items-center justify-center text-[var(--background)] text-[11px] font-bold">
                {initials}
              </div>
            </div>
            <span className="hidden sm:block text-[13px] font-medium text-[var(--foreground)] max-w-[140px] truncate">
              {user?.full_name || user?.email}
            </span>
            <span className="material-symbols-outlined hidden sm:block text-[16px] text-[var(--muted)]" aria-hidden="true">expand_more</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--premium-shadow-md)]">
              <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                <p className="text-[13px] font-bold text-[var(--foreground)]">{user?.full_name || "Quản trị viên"}</p>
                <p className="mt-0.5 break-all text-[11px] font-medium text-[var(--muted)]">{user?.email}</p>
                <span className="mt-2 inline-flex items-center rounded-full bg-[var(--foreground)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--background)]">
                  Quản trị
                </span>
              </div>
              <button
                type="button"
                onClick={() => logout("/admin/login")}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-[var(--brand-rose)] hover:bg-[var(--danger-soft)] transition-colors focus-visible:outline-none"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">logout</span>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="min-w-0 pt-16 md:ml-72">
        <main className="min-w-0 pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>
      <AdminMobileNav />
    </div>
  );
}
