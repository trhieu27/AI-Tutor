import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/components/NotificationToast';
import { HEADER_TEXTS } from '@/constants/texts';
import {
  fetchNotifications,
  markAllNotificationsRead,
  clearAllNotifications,
} from '@/services/api.service';

export default function Header({ onMenuClick }) {
  const { user, logout, isInitialLoading, accessToken } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => { setMounted(true); }, []);

  // Load notifications from API on mount
  useEffect(() => {
    if (!accessToken) return;
    fetchNotifications().then(setNotifications).catch(() => {});
  }, [accessToken]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) setShowNotifications(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotification = useCallback((notification) => {
    // Add to local list
    setNotifications(prev => [{ ...notification, is_read: false }, ...prev]);

    addToast({
      type: notification.type === 'document_ready' ? 'document_ready'
        : notification.type === 'document_failed' ? 'document_failed'
        : 'system',
      title: notification.title || 'Thông báo',
      message: notification.message || '',
      documentId: notification.document_id,
    });
  }, [addToast]);

  useNotifications({
    token: accessToken,
    onNotification: handleNotification,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleClearAll = async () => {
    await clearAllNotifications().catch(() => {});
    setNotifications([]);
    setShowNotifications(false);
  };

  // Icon + color theo type
  const notifTypeIcon = {
    document_ready:  'description',
    document_failed: 'hide_source',
    payment_success: 'payments',
    payment_failed:  'money_off',
    system:          'settings',
  };

  const notifTypeColor = {
    document_ready:  'text-emerald-400 bg-emerald-400/10',
    document_failed: 'text-red-400 bg-red-400/10',
    payment_success: 'text-amber-400 bg-amber-400/10',
    payment_failed:  'text-orange-400 bg-orange-400/10',
    system:          'text-[var(--muted)] bg-[var(--surface)]',
  };

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    return `${Math.floor(h / 24)} ngày trước`;
  }

  if (!mounted || isInitialLoading) {
    return (
      <header className="h-14 bg-[var(--card-bg)] border-b border-[var(--border-color)] flex items-center px-4 gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--surface)] animate-pulse" />
        <div className="flex-1 h-5 bg-[var(--surface)] rounded animate-pulse max-w-xs" />
      </header>
    );
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="h-14 bg-[var(--card-bg)] border-b border-[var(--border-color)] flex items-center px-4 gap-3 sticky top-0 z-40">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface)] transition-colors"
        aria-label="Menu"
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notification bell */}
      <div className="relative" ref={notificationRef}>
        <button
          id="notification-bell"
          onClick={() => {
            setShowNotifications(p => !p);
            setShowUserMenu(false);
            if (!showNotifications && unreadCount > 0) handleMarkAllRead();
          }}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface)] transition-colors"
          aria-label="Thông báo"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[hsl(343_72%_48%)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-full mt-1 w-80 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
              <p className="text-[13px] font-semibold text-[var(--foreground)]">Thông báo</p>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] text-[var(--muted)] hover:text-[hsl(343_72%_48%)] transition-colors"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--muted)]">
                  <span className="material-symbols-outlined text-[32px] icon-thin">notifications_off</span>
                  <p className="text-[12px]">Chưa có thông báo</p>
                </div>
              ) : (
                notifications.map((n, i) => {
                  const iconKey = n.type in notifTypeIcon ? n.type : 'system';
                  return (
                    <div
                      key={n.id || i}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 transition-colors ${!n.is_read ? 'bg-[hsl(239_68%_58%/0.04)]' : ''}`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${notifTypeColor[iconKey]}`}>
                        <span className="material-symbols-outlined text-[14px] icon-thin">{notifTypeIcon[iconKey]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[var(--foreground)] leading-snug">{n.title}</p>
                        {n.message && (
                          <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                        )}
                        <p className="text-[10px] text-[var(--muted-light)] mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[hsl(239_68%_58%)] shrink-0 mt-1.5" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => { setShowUserMenu(p => !p); setShowNotifications(false); }}
          className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-[var(--surface)] transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] flex items-center justify-center text-white text-[11px] font-bold">
            {initials}
          </div>
          <span className="hidden sm:block text-[13px] font-medium text-[var(--foreground)] max-w-[120px] truncate">
            {user?.full_name}
          </span>
          <span className="material-symbols-outlined text-[var(--muted)] text-[16px]">expand_more</span>
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-xl z-50 overflow-hidden py-1">
            <div className="px-4 py-3 border-b border-[var(--border-color)]">
              <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">{user?.full_name}</p>
              <p className="text-[11px] text-[var(--muted)] truncate">{user?.email}</p>
              {/* Plan badge */}
              {user?.isPro ? (
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white text-[10px] font-bold">
                  <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  Pro
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--muted)] text-[10px] font-semibold border border-[var(--border-color)]">
                  Free
                </span>
              )}
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[hsl(343_72%_48%)] hover:bg-[hsl(343_85%_58%/0.06)] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              {HEADER_TEXTS.logout}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
