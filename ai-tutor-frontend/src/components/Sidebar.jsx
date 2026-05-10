import { Link, useLocation } from 'react-router-dom';
import { SIDEBAR_TEXTS } from '@/constants/texts';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { href: '/', icon: 'grid_view', label: SIDEBAR_TEXTS.dashboard },
  { href: '/learning', icon: 'auto_stories', label: SIDEBAR_TEXTS.learning },
  { href: '/practice', icon: 'quiz', label: SIDEBAR_TEXTS.practice },
  { href: '/mindmap', icon: 'hub', label: SIDEBAR_TEXTS.mindmap },
];

export default function Sidebar({ onClose }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isPro = user?.isPro ?? false;

  return (
    <aside className="w-64 bg-[var(--sidebar-bg)] h-[100dvh] border-r border-[var(--border-color)] flex flex-col shrink-0 overflow-hidden pb-4 transition-colors duration-500">

      {/* ── Brand header ── */}
      <div className="h-16 flex items-center justify-between gap-3 px-4 border-b border-[var(--border-color)] shrink-0">
        <Link to="/" className="flex items-center gap-3 group" onClick={() => onClose?.()}>
          {/* Logo orb — aurora gradient, rotates on hover */}
          <div className="w-9 h-9 rounded-xl animate-aurora flex items-center justify-center text-white shadow-[0_4px_12px_hsl(239_68%_58%/0.30)] group-hover:scale-105 transition-transform duration-300 shrink-0">
            <span className="material-symbols-outlined icon-thin text-[18px]">auto_awesome</span>
          </div>
          <div>
            <p className="font-bold text-[var(--foreground)] text-[14px] leading-none tracking-tight">
              {SIDEBAR_TEXTS.brand.title}
            </p>
            <p className="text-[11px] text-[var(--muted)] font-medium mt-0.5">
              Học tập thông minh hơn
            </p>
          </div>
        </Link>
        {onClose && (
          <button
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-150 active:scale-90 focus-visible:outline-2 focus-visible:outline-[hsl(239_68%_58%/0.6)] focus-visible:outline-offset-2"
            onClick={onClose}
            aria-label="Đóng menu"
          >
            <span className="material-symbols-outlined icon-thin text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="px-3 pt-5 pb-2 flex flex-col flex-1 overflow-hidden">

        {/* Section label */}
        <p className="text-[10px] text-[var(--muted-light)] font-semibold mb-2.5 px-3 uppercase tracking-[0.12em]">
          Menu
        </p>

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => onClose?.()}
                className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-[13px] transition-all duration-200 relative outline-none focus-visible:ring-2 focus-visible:ring-[hsl(239_68%_58%/0.5)] ${isActive
                    ? 'bg-gradient-to-r from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white shadow-[0_4px_16px_hsl(239_68%_58%/0.28)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]'
                  }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:scale-110 ${isActive ? 'icon-filled' : 'icon-thin'
                    }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div className="mt-auto space-y-0.5 pt-3 border-t border-[var(--border-subtle)]">
          <Link
            to="/settings"
            onClick={() => onClose?.()}
            className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all duration-150 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-[hsl(239_68%_58%/0.6)] focus-visible:outline-offset-2"
          >
            <span className="material-symbols-outlined icon-thin text-[18px] group-hover:rotate-45 transition-transform duration-300">
              settings
            </span>
            {SIDEBAR_TEXTS.settings}
          </Link>
          <Link
            to="/help"
            onClick={() => onClose?.()}
            className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all duration-150 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-[hsl(239_68%_58%/0.6)] focus-visible:outline-offset-2"
          >
            <span className="material-symbols-outlined icon-thin text-[18px] group-hover:scale-110 transition-transform duration-200">
              help
            </span>
            {SIDEBAR_TEXTS.support}
          </Link>
        </div>

        {/* Upgrade Pro banner — aurora gradient, shimmer overlay, no gradient text */}
        {!isPro && (
          <Link to="/pricing" onClick={() => onClose?.()} className="mt-3 px-0.5 block">
            <div className="relative overflow-hidden animate-aurora rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_8px_24px_hsl(239_68%_58%/0.30)] active:scale-100">
              {/* Shimmer overlay */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, hsl(0 0% 100% / 0.3) 50%, transparent 60%)',
                  backgroundSize: '200% 100%',
                  animation: 'aurora-shift 3s ease-in-out infinite',
                }}
              />
              {/* Noise texture */}
              <div
                className="absolute inset-0 opacity-[0.08] rounded-2xl"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")" }}
              />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined icon-filled text-white text-[16px]">workspace_premium</span>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-white leading-none">Nâng cấp Pro</p>
                  <p className="text-[10px] text-white/70 font-medium mt-0.5">Mở khoá tất cả tính năng</p>
                </div>
              </div>
            </div>
          </Link>
        )}

      </div>
    </aside>
  );
}
