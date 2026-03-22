"use client";

import { HEADER_TEXTS } from '@/constants/texts';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { logout } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-[88px] flex items-center justify-between px-4 lg:px-8 bg-white shrink-0 border-b border-outline/50 shadow-sm z-10 w-full relative">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 lg:w-[500px] lg:flex-none">
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
        <div className="relative flex items-center w-full max-w-xl">
          <span className="material-symbols-outlined absolute left-4 text-on-surface-variant text-xl">search</span>
          <input 
            type="text" 
            placeholder={HEADER_TEXTS.searchPlaceholder} 
            className="w-full bg-[#f6f6fc] rounded-full py-3.5 pl-12 pr-4 outline-none border border-transparent focus:border-primary text-sm transition-colors text-on-surface placeholder-on-surface-variant/80"
          />
        </div>
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

        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-on-surface">{HEADER_TEXTS.userName}</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#f4b39b] shadow-sm shrink-0"></div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-outline/50 py-2 z-50">
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
