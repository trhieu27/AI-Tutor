"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HEADER_TEXTS } from '@/constants/texts';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout, isInitialLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // LOG để kiểm tra tại sao Header bị kẹt Skeleton
  useEffect(() => {
    setMounted(true);
    console.log(`[Header] [DEBUG] Mounted: true, User: ${user?.email || 'N/A'}, InitialLoading: ${isInitialLoading}`);
  }, [user, isInitialLoading]);

  const [notifications, setNotifications] = useState([
    { id: 1, title: "Xử lý thành công", message: "Tài liệu 'Kiến trúc phần mềm.pdf' đã sẵn sàng để chat.", time: "2 phút trước", unread: true, type: "success" },
    { id: 2, title: "Luyện tập mới", message: "AI đã soạn xong 10 câu hỏi trắc nghiệm cho bạn.", time: "1 giờ trước", unread: true, type: "info" },
    { id: 3, title: "Cập nhật hệ thống", message: "Tính năng Sơ đồ tư duy 3D hiện đã khả dụng.", time: "5 giờ trước", unread: false, type: "system" },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  const handleLogout = () => {
    logout();
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (id: number) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, unread: false } : n
    ));
    setShowNotifications(false);
  };

  return (
    <header className="h-16 w-full sticky top-0 bg-[var(--header-bg)] backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-between px-6 shrink-0 z-50 shadow-sm transition-colors duration-500">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white"
          onClick={onMenuClick}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>

      <div className="flex items-center gap-5">
        <ThemeToggle />

        {/* Notifications Section */}
        <div className="flex items-center gap-2 relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all relative ${showNotifications ? 'bg-indigo-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[60]">
              {/* Notification content here... same as before */}
              <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">{HEADER_TEXTS.notifications.title}</h3>
                <button onClick={markAllAsRead} className="text-[10px] text-indigo-500 font-bold uppercase">{HEADER_TEXTS.notifications.markAsRead}</button>
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} onClick={() => handleNotificationClick(n.id)} className={`p-4 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer ${n.unread ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}`}>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">{n.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{n.message}</p>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">{HEADER_TEXTS.notifications.empty}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>

        {/* User Profile Section */}
        <div className="flex items-center gap-3">
          {(!mounted || isInitialLoading || !user) ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-1.5 animate-pulse">
                <div className="w-24 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-end">
                <p className="text-[13px] font-extrabold text-slate-900 dark:text-white line-clamp-1">{user.full_name || HEADER_TEXTS.user.defaultName}</p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                  <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">{HEADER_TEXTS.proBadge}</p>
                </div>
              </div>
              <div className="relative group">
                <button className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shadow-lg">
                  {(user.full_name?.[0] || "U").toUpperCase()}
                </button>

                <div className="absolute top-full right-0 mt-3 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 mb-1">
                    <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{user.email}</p>
                  </div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all font-bold text-[11px]">
                    <span className="material-symbols-outlined text-lg">logout</span>
                    {HEADER_TEXTS.logout}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
