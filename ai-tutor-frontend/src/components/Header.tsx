"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HEADER_TEXTS } from '@/constants/texts';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const notificationRef = useRef<HTMLDivElement>(null);
  
  const [showNotifications, setShowNotifications] = useState(false);
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
    router.push('/login');
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
    // Logic điều hướng có thể thêm ở đây, ví dụ: router.push('/chat/...');
  };

  return (
    <header className="h-16 w-full sticky top-0 bg-[var(--header-bg)] backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-between px-6 shrink-0 z-50 shadow-2xl transition-colors duration-500">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 dark:bg-white/5 light:bg-slate-100 text-white dark:text-white light:text-slate-600 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-200 transition-all"
          onClick={onMenuClick}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>

      <div className="flex items-center gap-5">
        <ThemeToggle />
        
        <div className="flex items-center gap-2 relative" ref={notificationRef}>
          {/* Notification Button */}
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all relative ${showNotifications ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
            )}
          </button>

          {/* Notification Dropdown Container */}
          {showNotifications && (
            <div className="absolute top-full right-0 mt-3 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[60]">
                <div className="px-4 py-3 bg-white/5 flex items-center justify-between border-b border-white/10">
                  <h3 className="text-sm font-black text-white">Thông báo</h3>
                  <div className="flex gap-3">
                    <button 
                      onClick={markAllAsRead}
                      className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-tight"
                    >
                      Đã đọc
                    </button>
                    <button 
                      onClick={clearAllNotifications}
                      className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase tracking-tight"
                    >
                      Xóa hết
                    </button>
                  </div>
                </div>
                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n.id)}
                      className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer relative ${n.unread ? 'bg-indigo-500/5' : ''}`}
                    >
                      {n.unread && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[11px] font-black text-white">{n.title}</span>
                        <span className="text-[9px] text-slate-500 font-bold">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        {n.message}
                      </p>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="py-12 text-center flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-slate-700 text-4xl">notifications_off</span>
                      <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">Không có thông báo mới</p>
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-3 text-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border-t border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Xem toàn bộ</span>
                  </div>
                )}
              </div>
          )}
        </div>

        <div className="h-6 w-px bg-white/10 mx-1"></div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <p className="text-[13px] font-black text-white tracking-tight leading-none mb-1">
              {user?.full_name || user?.username || "Người dùng"}
            </p>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
              <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{HEADER_TEXTS.proBadge}</p>
            </div>
          </div>
          <div className="relative group">
            <button className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300 border border-white/10">
              {(user?.full_name?.[0] || user?.username?.[0] || "U").toUpperCase()}
            </button>
            
            <div className="absolute top-full right-0 mt-3 w-52 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right group-hover:translate-y-0 translate-y-2 p-2 z-50">
               <div className="px-4 py-3 border-b border-white/5 mb-2">
                  <p className="text-xs font-bold text-white truncate">{user?.email || "Chưa đăng nhập"}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">ID: {user?.id?.slice(0, 8) || "00000000"}</p>
               </div>
               <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-bold text-xs"
               >
                 <span className="material-symbols-outlined text-lg">logout</span>
                 {HEADER_TEXTS.logout}
               </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
