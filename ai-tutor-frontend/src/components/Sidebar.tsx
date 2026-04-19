"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SIDEBAR_TEXTS } from '@/constants/texts';

const navItems = [
  { href: "/", icon: "grid_view", label: SIDEBAR_TEXTS.dashboard },
  { href: "/learning", icon: "auto_stories", label: SIDEBAR_TEXTS.learning },
  { href: "/practice", icon: "quiz", label: SIDEBAR_TEXTS.practice },
  { href: "/mindmap", icon: "hub", label: SIDEBAR_TEXTS.mindmap },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[var(--sidebar-bg)] h-screen border-r border-[var(--border-color)] flex flex-col shrink-0 overflow-hidden selection:bg-indigo-500/30 pb-4 transition-colors duration-500">
      {/* Brand */}
      <div className="h-16 flex items-center gap-4 px-4 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)] shrink-0 sticky top-0 z-20 transition-colors duration-500">
        <div className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform duration-500">
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-black text-slate-900 dark:text-white text-base leading-none tracking-tight transition-colors duration-500">{SIDEBAR_TEXTS.brand.title}</h1>
            <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black tracking-[0.2em] uppercase mt-1">Học tập thông minh</p>
          </div>
        </div>

        {onClose && (
          <button
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      <div className="px-4 pt-6 pb-2 flex flex-col flex-1">
        {/* Navigation */}
        <nav className="flex flex-col gap-1.5">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-4 px-3">Menu Chính</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-3 rounded-2xl font-bold text-sm transition-all duration-300 relative outline-none ${isActive
                  ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-white shadow-sm dark:shadow-lg border border-indigo-100 dark:border-white/10"
                  : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent"
                  }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 dark:bg-indigo-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                )}
                <span className={`material-symbols-outlined transition-transform duration-300 ${isActive ? 'scale-110 text-indigo-500 dark:text-indigo-300' : 'group-hover:scale-110 text-slate-400 dark:text-slate-400'}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="mt-auto space-y-0.5 pt-6 border-t border-slate-100 dark:border-white/10 transition-colors duration-500">
          <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-sm font-bold group">
            <span className="material-symbols-outlined text-xl text-slate-400 dark:text-slate-400 group-hover:rotate-45 transition-transform duration-500">settings</span>
            {SIDEBAR_TEXTS.settings}
          </Link>
          <Link href="/help" className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-sm font-bold group">
            <span className="material-symbols-outlined text-xl text-slate-400 dark:text-slate-400 group-hover:scale-110 transition-transform">help</span>
            {SIDEBAR_TEXTS.support}
          </Link>
        </div>

        {/* PRO Card */}
        <div className="px-1 mt-3">
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:via-purple-600 dark:to-purple-800 rounded-2xl p-3 shadow-lg shadow-indigo-500/15 dark:shadow-2xl group cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-[32px] text-white">auto_awesome</span>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="material-symbols-outlined text-[14px] text-indigo-200">workspace_premium</span>
                <p className="text-[9px] font-black text-white uppercase tracking-[0.2em]">{SIDEBAR_TEXTS.upgrade.header}</p>
              </div>
              <p className="text-white/70 text-[9px] font-bold leading-relaxed text-center mx-auto mt-1">
                {SIDEBAR_TEXTS.upgrade.desc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
