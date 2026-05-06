"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications, WsNotification } from '@/hooks/useNotifications';
import { useToast } from '@/components/NotificationToast';
import { HEADER_TEXTS } from '@/constants/texts';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout, isInitialLoading, accessToken } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, [user, isInitialLoading]);

  // ── Notification types & helpers ──────────────────────────────────────────────────────
  interface NotificationItem {
    id: string;        // UUID từ backend
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    metadata: Record<string, unknown>;
    created_at: string;  // ISO string
  }

  const formatRelativeTime = (iso: string): string => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 10)   return "Vừa xong";
    if (diff < 60)   return `${diff} giây trước`;
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Tick mỗi phút để refresh thời gian tương đối
  const [, forceRender] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceRender(x => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // Fetch lịch sử từ API khi đã login
  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(setNotifications)
      .catch(() => {});
  }, [accessToken]);

  const { addToast } = useToast();

  // Nhận real-time từ WebSocket
  const handleWsNotification = useCallback((n: WsNotification) => {
    const newItem: NotificationItem = {
      id: (n.id as string) ?? crypto.randomUUID(),
      type: n.type,
      title: n.title ?? "Thông báo",
      message: n.message ?? "",
      is_read: false,
      metadata: (n.metadata as Record<string, unknown>) ?? {},
      created_at: (n.created_at as string) ?? new Date().toISOString(),
    };
    setNotifications(prev => [newItem, ...prev.slice(0, 29)]);
    addToast(n);
  }, [addToast]);

  // Kết nối WebSocket — chạy xuyên suốt app
  useNotifications({ token: accessToken ?? null, onNotification: handleWsNotification });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (accessToken) {
      fetch('/api/v1/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
  };
  const handleNotificationClick = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setShowNotifications(false);
    if (accessToken) {
      fetch(`/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
  };

  const notifTypeIcon: Record<string, string> = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    system: 'settings',
  };
  const notifTypeColor: Record<string, string> = {
    success: 'text-[hsl(158_64%_44%)] bg-[hsl(158_64%_44%/0.08)]',
    error: 'text-red-400 bg-red-400/10',
    info: 'text-[hsl(239_68%_58%)] bg-[hsl(239_68%_58%/0.08)]',
    system: 'text-[var(--muted)] bg-[var(--surface)]',
  };

  return (
    <header className="h-16 w-full sticky top-0 bg-[var(--header-bg)] backdrop-blur-xl border-b border-[var(--border-color)] flex items-center justify-between px-5 shrink-0 z-50 transition-colors duration-500">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all active:scale-90"
          onClick={onMenuClick}
        >
          <span className="material-symbols-outlined icon-thin text-[20px]">menu</span>
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all relative active:scale-90 ${
              showNotifications
                ? 'bg-[hsl(239_68%_58%/0.10)] text-[hsl(239_68%_58%)] border border-[hsl(239_68%_58%/0.25)]'
                : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]'
            }`}
          >
            <span className="material-symbols-outlined icon-thin text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[hsl(343_85%_58%)] rounded-full border-2 border-[var(--header-bg)]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-[0_16px_40px_hsl(222_47%_4%/0.14),0_4px_12px_hsl(222_47%_4%/0.08)] overflow-hidden z-[60] animate-fade-up backdrop-blur-2xl">
              <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-semibold text-[var(--foreground)]">{HEADER_TEXTS.notifications.title}</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-[hsl(239_68%_58%)] text-white rounded-full text-[9px] font-bold">{unreadCount}</span>
                  )}
                </div>
                <button onClick={markAllAsRead} className="text-[10px] font-bold text-[hsl(239_68%_58%)] hover:text-[hsl(239_62%_50%)] transition-colors">
                  Đọc tất cả
                </button>
              </div>
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar divide-y divide-[var(--border-subtle)]">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n.id)}
                    className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-all duration-150 hover:bg-[var(--surface)] ${
                      !n.is_read ? 'bg-[hsl(239_68%_58%/0.04)]' : ''
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${notifTypeColor[n.type]}`}>
                      <span className="material-symbols-outlined icon-thin text-[14px]">{notifTypeIcon[n.type]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-[var(--foreground)] truncate">{n.title}</p>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(239_68%_58%)] shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[var(--muted)] leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-[var(--muted-light)] mt-1">{formatRelativeTime(n.created_at)}</p>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="p-8 text-center">
                    <span className="material-symbols-outlined icon-thin text-[32px] text-[var(--muted-light)] block mb-2">notifications_off</span>
                    <p className="text-[12px] text-[var(--muted)] font-medium">{HEADER_TEXTS.notifications.empty}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-[var(--border-color)] mx-1" />

        {/* User Profile */}
        <div className="relative" ref={userMenuRef}>
          {(!mounted || isInitialLoading || !user) ? (
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col items-end gap-1.5">
                <div className="w-20 h-2 bg-[var(--surface)] rounded-full shimmer" />
                <div className="w-14 h-1.5 bg-[var(--surface)] rounded-full shimmer" />
              </div>
              <div className="w-9 h-9 rounded-xl bg-[var(--surface)] shimmer" />
            </div>
          ) : (
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-[var(--surface)] transition-all active:scale-95"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] flex items-center justify-center text-white font-bold text-[13px] shadow-[0_2px_8px_hsl(239_68%_58%/0.35)]">
                {(user.full_name?.[0] || 'U').toUpperCase()}
              </div>
              <div className="flex flex-col items-start hidden sm:flex">
                <p className="text-[12px] font-semibold text-[var(--foreground)] leading-none">{user.full_name || HEADER_TEXTS.user.defaultName}</p>
                {user.isPro ? (
                  <span className="text-[9px] font-bold text-[hsl(38_92%_50%)] uppercase tracking-wide mt-0.5">Pro</span>
                ) : (
                  <span className="text-[9px] font-medium text-[var(--muted-light)] mt-0.5">Miễn phí</span>
                )}
              </div>
              <span className="material-symbols-outlined icon-thin text-[14px] text-[var(--muted-light)] hidden sm:block">expand_more</span>
            </button>
          )}

          {showUserMenu && user && (
            <div className="absolute top-full right-0 mt-2 w-52 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-[0_16px_40px_hsl(222_47%_4%/0.14)] overflow-hidden z-[60] animate-fade-up backdrop-blur-2xl">
              <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                <p className="text-[11px] font-semibold text-[var(--foreground)] truncate">{user.full_name}</p>
                <p className="text-[10px] text-[var(--muted)] truncate mt-0.5">{user.email}</p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[hsl(343_85%_58%)] hover:bg-[hsl(343_85%_58%/0.08)] rounded-xl transition-all text-[12px] font-semibold"
                >
                  <span className="material-symbols-outlined icon-thin text-[16px]">logout</span>
                  {HEADER_TEXTS.logout}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
