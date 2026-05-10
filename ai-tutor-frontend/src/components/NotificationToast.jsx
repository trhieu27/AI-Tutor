/**
 * NotificationToast — JolyUI-inspired animated toast
 *
 * Thiết kế:
 *  - Spring slide-in từ phải + scale (CSS keyframes)
 *  - Border-left accent màu theo type (giống JolyUI border-l-4)
 *  - Progress bar countdown mượt mà
 *  - Stagger entrance khi stack nhiều toast
 *  - Exit animation slide phải + fade
 *  - Không dùng Tailwind — 100% CSS variables + inline styles
 */

// @refresh reset
import { useEffect, useState, useCallback, createContext, useContext, useRef } from "react";

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext({ addToast: () => { } });

export function useToast() {
  return useContext(ToastContext);
}

// ── Constants & Config ────────────────────────────────────────────────────────

const DURATION = 5000; // ms

const TYPE_CONFIG = {
  document_ready: {
    icon: "check_circle",
    accent: "hsl(158 64% 44%)",
    iconBg: "hsl(158 64% 44% / 0.12)",
  },
  document_failed: {
    icon: "error",
    accent: "hsl(343 85% 58%)",
    iconBg: "hsl(343 85% 58% / 0.12)",
  },
  info: {
    icon: "info",
    accent: "hsl(217 91% 60%)",
    iconBg: "hsl(217 91% 60% / 0.12)",
  },
  warning: {
    icon: "warning",
    accent: "hsl(38 92% 50%)",
    iconBg: "hsl(38 92% 50% / 0.12)",
  },
  system: {
    icon: "notifications",
    accent: "var(--border-emphasis, hsl(239 68% 58%))",
    iconBg: "hsl(239 68% 58% / 0.10)",
  },
};

// ── Inject CSS keyframes once ─────────────────────────────────────────────────

const STYLE_ID = "nt-animated-toast-css";

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes _nt_in {
      0%   { opacity: 0; transform: translateX(32px) scale(0.88); }
      55%  { opacity: 1; transform: translateX(-6px) scale(1.02); }
      100% { opacity: 1; transform: translateX(0px)  scale(1);    }
    }
    @keyframes _nt_out {
      0%   { opacity: 1; transform: translateX(0px)  scale(1);    }
      100% { opacity: 0; transform: translateX(36px) scale(0.90); }
    }
    ._nt_item {
      animation: _nt_in 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    ._nt_item._nt_exiting {
      animation: _nt_out 0.24s cubic-bezier(0.55, 0, 1, 0.45) both;
    }
    ._nt_close:hover {
      background: var(--surface) !important;
      color: var(--foreground) !important;
    }
  `;
  document.head.appendChild(el);
}

// ── Toast Item ────────────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss, stackIndex }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const rafRef = useRef(null);

  const cfg = TYPE_CONFIG[toast.type] ?? TYPE_CONFIG.system;

  // Countdown RAF loop
  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        dismiss();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.toastId), 240);
  }, [toast.toastId, onDismiss]);

  return (
    <div
      className={`_nt_item${exiting ? " _nt_exiting" : ""}`}
      style={{
        animationDelay: exiting ? "0ms" : `${stackIndex * 55}ms`,
        position: "relative",
        width: 356,
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        borderLeft: `4px solid ${cfg.accent}`,
        boxShadow:
          "0 4px 6px -1px hsl(0 0% 0% / 0.08), 0 10px 30px -4px hsl(222 47% 6% / 0.22)",
        pointerEvents: "auto",
      }}
    >
      {/* ── Body ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "14px 12px 10px 14px",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: cfg.iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          <span
            className="material-symbols-outlined icon-thin"
            style={{ fontSize: 18, color: cfg.accent }}
          >
            {cfg.icon}
          </span>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--foreground)",
              lineHeight: 1.35,
              letterSpacing: "-0.01em",
            }}
          >
            {toast.title}
          </p>
          {toast.message && (
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 12,
                color: "var(--muted)",
                lineHeight: 1.55,
              }}
            >
              {toast.message}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={dismiss}
          className="_nt_close"
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted-light)",
            flexShrink: 0,
            transition: "background 0.15s, color 0.15s",
            marginTop: -1,
          }}
          aria-label="Đóng"
        >
          <span className="material-symbols-outlined icon-thin" style={{ fontSize: 15 }}>
            close
          </span>
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div
        style={{
          height: 3,
          background: "var(--border-subtle)",
          margin: "0 14px 10px",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 99,
            background: cfg.accent,
            opacity: 0.65,
            width: `${progress}%`,
            transition: "none",
          }}
        />
      </div>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function NotificationToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  useEffect(() => { ensureStyles(); }, []);

  const addToast = useCallback((n) => {
    const toastId = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { ...n, toastId, createdAt: Date.now() }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast stack — bottom-right */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "flex-end",
          pointerEvents: "none",
        }}
        aria-live="polite"
        aria-label="Thông báo"
      >
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.toastId}
            toast={toast}
            onDismiss={dismissToast}
            stackIndex={index}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}