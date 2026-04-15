"use client";

import { HEADER_TEXTS } from '@/constants/texts';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isChatPage = pathname?.includes('/chat/');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-8 bg-white shrink-0 border-b border-outline/50 shadow-sm z-10 w-full relative">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 lg:max-w-xl">
        {onMenuClick && (
          <button
            type="button"
            className="lg:hidden w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-surface transition-colors cursor-pointer border border-outline/50 bg-white shadow-sm"
            onClick={() => onMenuClick()}
            aria-label="Toggle Navigation"
          >
            <span className="material-symbols-outlined text-[24px] text-on-surface">menu</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-6 shrink-0 pl-2">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <button className="relative w-11 h-11 flex items-center justify-center rounded-full hover:bg-[#f6f6fc] transition-colors">
            <span className="material-symbols-outlined text-[26px]">notifications</span>
            <span className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>
          <button className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[#f6f6fc] transition-colors hidden sm:flex">
            <span className="material-symbols-outlined text-[26px]">history</span>
          </button>
        </div>

        <div className="hidden sm:block w-px h-8 bg-outline"></div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-on-surface">{HEADER_TEXTS.userName}</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 shadow-lg shadow-blue-100 shrink-0 flex items-center justify-center text-white font-bold text-sm">
              {HEADER_TEXTS.userName.split(' ').map(n => n[0]).join('').slice(-2).toUpperCase()}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-outline/30 py-2 z-[9999] animate-in fade-in zoom-in duration-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
