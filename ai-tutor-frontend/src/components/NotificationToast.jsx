/**
 * NotificationToast — floating popup notification
 * - Hiển thị góc dưới phải màn hình
 * - Auto-dismiss sau 5 giây với progress bar
 * - Stack nhiều toast cùng lúc
 * - Slide-in animation
 */

import { useEffect, useState, useCallback, createContext, useContext, useRef } from "react";

// ── Context ───────────────────────────────────────────────────────────────────
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const ToastContext = /*#__PURE__*/createContext({
  addToast: _n => {}
});
export function useToast() {
  return useContext(ToastContext);
}

// ── Toast Item ────────────────────────────────────────────────────────────────

const DURATION = 5000;
const typeConfig = {
  document_ready: {
    icon: "check_circle",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    bar: "bg-emerald-400",
    border: "border-emerald-400/20"
  },
  document_failed: {
    icon: "error",
    color: "text-red-400",
    bg: "bg-red-400/10",
    bar: "bg-red-400",
    border: "border-red-400/20"
  },
  system: {
    icon: "settings",
    color: "text-[var(--muted)]",
    bg: "bg-[var(--surface)]",
    bar: "bg-[var(--muted)]",
    border: "border-[var(--border-color)]"
  }
};
function ToastItem({
  toast,
  onDismiss
}) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const rafRef = useRef(0);
  const cfg = typeConfig[toast.type] ?? typeConfig.system;

  // Slide-in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Progress bar countdown
  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - elapsed / DURATION * 100);
      setProgress(pct);
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        handleDismiss();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.toastId), 300);
  }, [toast.toastId, onDismiss]);
  return /*#__PURE__*/_jsxs("div", {
    className: `
        relative w-[340px] rounded-2xl border bg-[var(--card-bg)] shadow-[0_8px_32px_hsl(222_47%_4%/0.35)]
        overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${cfg.border}
        ${visible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}
      `,
    children: [/*#__PURE__*/_jsxs("div", {
      className: "flex items-start gap-3 px-4 pt-4 pb-3",
      children: [/*#__PURE__*/_jsx("div", {
        className: `w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`,
        children: /*#__PURE__*/_jsx("span", {
          className: `material-symbols-outlined text-[18px] ${cfg.color}`,
          children: cfg.icon
        })
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex-1 min-w-0 pt-0.5",
        children: [/*#__PURE__*/_jsx("p", {
          className: "text-[13px] font-semibold text-[var(--foreground)] leading-snug",
          children: toast.title
        }), toast.message && /*#__PURE__*/_jsx("p", {
          className: "text-[12px] text-[var(--muted)] mt-0.5 leading-relaxed",
          children: toast.message
        })]
      }), /*#__PURE__*/_jsx("button", {
        onClick: handleDismiss,
        className: "w-6 h-6 rounded-lg flex items-center justify-center text-[var(--muted-light)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all shrink-0 -mt-0.5",
        children: /*#__PURE__*/_jsx("span", {
          className: "material-symbols-outlined text-[14px]",
          children: "close"
        })
      })]
    }), /*#__PURE__*/_jsx("div", {
      className: "h-0.5 bg-[var(--border-subtle)] mx-4 mb-3 rounded-full overflow-hidden",
      children: /*#__PURE__*/_jsx("div", {
        className: `h-full rounded-full transition-none ${cfg.bar}`,
        style: {
          width: `${progress}%`
        }
      })
    })]
  });
}

// ── Provider + Container ──────────────────────────────────────────────────────

export function NotificationToastProvider({
  children
}) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);
  const addToast = useCallback(n => {
    const toastId = `toast-${++counterRef.current}`;
    setToasts(prev => [...prev, {
      ...n,
      toastId,
      createdAt: Date.now()
    }]);
  }, []);
  const dismissToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.toastId !== id));
  }, []);
  return /*#__PURE__*/_jsxs(ToastContext.Provider, {
    value: {
      addToast
    },
    children: [children, /*#__PURE__*/_jsx("div", {
      className: "fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none",
      "aria-live": "polite",
      "aria-label": "Th\xF4ng b\xE1o",
      children: toasts.map(toast => /*#__PURE__*/_jsx("div", {
        className: "pointer-events-auto",
        children: /*#__PURE__*/_jsx(ToastItem, {
          toast: toast,
          onDismiss: dismissToast
        })
      }, toast.toastId))
    })]
  });
}