import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { useToast } from '@/shared/ui/NotificationToast';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { APP_SHELL_TEXTS, HEADER_TEXTS } from '@/shared/constants/texts';
import { fetchNotifications, markAllNotificationsRead, clearAllNotifications } from '@/shared/services/api.service';

// ─── All logic unchanged — only visual layer updated ───────────────────────

export default function Header({ onMenuClick }) {
  const { user, logout, isInitialLoading, accessToken } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const { addToast } = useToast();
  const T = APP_SHELL_TEXTS.header;

  useEffect(() => { setMounted(true); }, []);

  // Load notifications from API on mount
  useEffect(() => {
    if (!accessToken) return;
    fetchNotifications({ limit: 30 }).then(setNotifications).catch(() => { });
  }, [accessToken]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = e => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) setShowNotifications(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotification = useCallback(notification => {
    setNotifications(prev => [{ ...notification, is_read: false }, ...prev]);
    addToast({
      type: notification.type === 'document_ready' ? 'document_ready' : notification.type === 'document_failed' ? 'document_failed' : 'system',
      title: notification.title || T.notificationFallbackTitle,
      message: notification.message || '',
      documentId: notification.document_id,
    });
  }, [addToast]);

  useNotifications({ token: accessToken, onNotification: handleNotification });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead().catch(() => { });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleClearAll = async () => {
    await clearAllNotifications().catch(() => { });
    setNotifications([]);
    setShowNotifications(false);
  };

  // Icon + color per type
  const notifTypeIcon = {
    document_ready: 'description',
    document_failed: 'hide_source',
    payment_success: 'payments',
    payment_failed: 'money_off',
    system: 'settings',
  };
  const notifTypeColor = {
    document_ready: 'text-emerald-400 bg-emerald-400/10',
    document_failed: 'text-red-400 bg-red-400/10',
    payment_success: 'text-amber-400 bg-amber-400/10',
    payment_failed: 'text-orange-400 bg-orange-400/10',
    system: 'text-[var(--muted)] bg-[var(--surface)]',
  };

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return T.timeAgoNow;
    if (m < 60) return T.timeAgoMinute(m);
    const h = Math.floor(m / 60);
    if (h < 24) return T.timeAgoHour(h);
    return T.timeAgoDay(Math.floor(h / 24));
  }

  // ── Skeleton loading state ──
  if (!mounted || isInitialLoading) {
    return (
      <header className="h-16 glass border-b border-[var(--border-color)] flex items-center px-4 gap-3 sticky top-0 z-40">
        <div className="flex-1" />
        <div className="w-8 h-8 rounded-full shimmer-premium" />
        <div className="w-20 h-4 rounded-lg shimmer-premium" />
      </header>
    );
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="h-16 glass border-b border-[var(--border-color)] flex items-center px-4 gap-3 sticky top-0 z-40">

      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all duration-150 active:scale-90 focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)] focus-visible:outline-offset-2"
        aria-label={T.menuAria}
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>

      <div className="min-w-0 flex-1" />

      {/* ── Notification bell ── */}
      <div className="relative" ref={notificationRef}>
        <button
          id="notification-bell"
          onClick={() => {
            setShowNotifications(p => !p);
            setShowUserMenu(false);
            if (!showNotifications && unreadCount > 0) handleMarkAllRead();
          }}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all duration-150 active:scale-90 focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)] focus-visible:outline-offset-2"
          aria-label={T.notificationFallbackTitle}
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {/* Badge with glow pulse on unread */}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full bg-[hsl(343_72%_48%)] text-white text-[9px] font-bold flex items-center justify-center leading-none animate-glow-pulse shadow-[0_0_8px_hsl(343_72%_48%/0.5)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification dropdown — glass panel (floating = allowed) */}
        {showNotifications && (
          <div className="fixed right-4 top-[4.5rem] w-[min(320px,calc(100vw-32px))] bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg shadow-[0_16px_48px_hsl(228_25%_5%/0.18)] z-50 overflow-hidden animate-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
              <p className="text-[13px] font-semibold text-[var(--foreground)]">{T.notificationFallbackTitle}</p>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] text-[var(--muted)] hover:text-[hsl(343_72%_48%)] transition-colors font-medium"
                >
                  {T.clearAllNotifications}
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-[var(--muted)]">
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface)] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px] icon-thin">notifications_off</span>
                  </div>
                  <p className="text-[12px] font-medium">{T.notificationEmpty}</p>
                </div>
              ) : (
                notifications.map((n, i) => {
                  const iconKey = n.type in notifTypeIcon ? n.type : 'system';
                  return (
                    <div
                      key={n.id || i}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 transition-colors hover:bg-[var(--surface)] ${!n.is_read ? 'bg-[hsl(166_61%_35%/0.06)]' : ''}`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${notifTypeColor[iconKey]}`}>
                        <span className="material-symbols-outlined text-[14px] icon-thin">{notifTypeIcon[iconKey]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[var(--foreground)] leading-snug">{n.title}</p>
                        {n.message && (
                          <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                        )}
                        <p className="text-[10px] text-[var(--muted-light)] mt-1 font-medium">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] shrink-0 mt-1.5" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <ThemeToggle />

      {/* ── User menu ── */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => { setShowUserMenu(p => !p); setShowNotifications(false); }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface)] transition-all duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)] focus-visible:outline-offset-2"
        >
          {/* Avatar */}
          <div className="rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] p-[2px] shadow-[var(--premium-shadow-sm)]">
            <div className="w-7 h-7 rounded-full bg-[var(--foreground)] flex items-center justify-center text-[var(--background)] text-[11px] font-bold">
              {initials}
            </div>
          </div>
          <span className="hidden sm:block text-[13px] font-medium text-[var(--foreground)] max-w-[200px] truncate">
            {user?.full_name}
          </span>
          <span className="material-symbols-outlined text-[var(--muted)] text-[16px] transition-transform duration-200" style={{ transform: showUserMenu ? 'rotate(180deg)' : 'none' }}>
            expand_more
          </span>
        </button>

        {/* User dropdown — glass panel (floating = allowed) */}
        {showUserMenu && (
          <div className="fixed right-4 top-[4.5rem] w-52 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg shadow-[0_16px_48px_hsl(228_25%_5%/0.18)] z-50 overflow-hidden py-1 animate-fade-up">
            {/* User info */}
            <div className="px-4 py-3 border-b border-[var(--border-color)]">
              <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">{user?.full_name}</p>
              <p className="text-[11px] text-[var(--muted)] truncate mt-0.5">{user?.email}</p>
              {user?.isPro ? (
                <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full bg-[var(--foreground)] text-[var(--background)] text-[10px] font-bold">
                  {T.proBadge}
                </span>
              ) : (
                <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--muted)] text-[10px] font-semibold border border-[var(--border-color)]">
                  {T.freeBadge}
                </span>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[hsl(343_72%_48%)] hover:bg-[hsl(343_72%_48%/0.06)] transition-colors font-medium focus-visible:outline-none"
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
