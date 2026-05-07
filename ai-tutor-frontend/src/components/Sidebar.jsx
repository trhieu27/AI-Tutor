import { Link, useLocation } from 'react-router-dom';
import { SIDEBAR_TEXTS } from '@/constants/texts';
import { useAuth } from '@/context/AuthContext';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const navItems = [{
  href: "/",
  icon: "grid_view",
  label: SIDEBAR_TEXTS.dashboard
}, {
  href: "/learning",
  icon: "auto_stories",
  label: SIDEBAR_TEXTS.learning
}, {
  href: "/practice",
  icon: "quiz",
  label: SIDEBAR_TEXTS.practice
}, {
  href: "/mindmap",
  icon: "hub",
  label: SIDEBAR_TEXTS.mindmap
}];
export default function Sidebar({
  onClose
}) {
  const {
    pathname
  } = useLocation();
  const {
    user
  } = useAuth();
  const isPro = user?.isPro ?? false;
  return /*#__PURE__*/_jsxs("aside", {
    className: "w-64 bg-[var(--sidebar-bg)] h-[100dvh] border-r border-[var(--border-color)] flex flex-col shrink-0 overflow-hidden selection:bg-[hsl(239_68%_58%/0.25)] pb-4 transition-colors duration-500",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "h-16 flex items-center justify-between gap-3 px-4 border-b border-[var(--border-color)] shrink-0",
      children: [/*#__PURE__*/_jsxs(Link, {
        to: "/",
        className: "flex items-center gap-3 group",
        onClick: () => onClose?.(),
        children: [/*#__PURE__*/_jsx("div", {
          className: "w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] flex items-center justify-center text-white shadow-[0_2px_6px_hsl(239_68%_58%/0.20)] group-hover:rotate-6 transition-transform duration-500 shrink-0",
          children: /*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined icon-thin text-[18px]",
            children: "auto_awesome"
          })
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("h1", {
            className: "font-semibold text-[var(--foreground)] text-[14px] leading-none tracking-tight",
            children: SIDEBAR_TEXTS.brand.title
          }), /*#__PURE__*/_jsx("p", {
            className: "text-[10px] text-[var(--muted-light)] font-medium mt-0.5",
            children: "H\u1ECDc t\u1EADp th\xF4ng minh h\u01A1n"
          })]
        })]
      }), onClose && /*#__PURE__*/_jsx("button", {
        className: "lg:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface)] text-[var(--muted)] transition-all active:scale-90",
        onClick: onClose,
        children: /*#__PURE__*/_jsx("span", {
          className: "material-symbols-outlined icon-thin text-[18px]",
          children: "close"
        })
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "px-3 pt-5 pb-2 flex flex-col flex-1 overflow-hidden",
      children: [/*#__PURE__*/_jsxs("nav", {
        className: "flex flex-col gap-0.5",
        children: [/*#__PURE__*/_jsx("p", {
          className: "text-[10px] text-[var(--muted-light)] font-bold mb-2.5 px-3 uppercase tracking-[0.12em]",
          children: "Menu"
        }), navItems.map(item => {
          const isActive = pathname === item.href;
          return /*#__PURE__*/_jsxs(Link, {
            to: item.href,
            onClick: () => onClose?.(),
            className: `group flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-[13px] transition-all duration-150 relative outline-none ${isActive ? 'bg-[hsl(239_68%_58%/0.08)] text-[hsl(239_68%_58%)] border border-[hsl(239_68%_58%/0.15)]' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] border border-transparent'}`,
            children: [isActive && /*#__PURE__*/_jsx("div", {
              className: "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[hsl(239_68%_58%)] rounded-full"
            }), /*#__PURE__*/_jsx("span", {
              className: `material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:scale-105 ${isActive ? 'icon-filled' : 'icon-thin'}`,
              children: item.icon
            }), item.label]
          }, item.href);
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "mt-auto space-y-0.5 pt-3 border-t border-[var(--border-subtle)]",
        children: [/*#__PURE__*/_jsxs(Link, {
          to: "/settings",
          onClick: () => onClose?.(),
          className: "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all text-[13px] font-medium group",
          children: [/*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined icon-thin text-[18px] group-hover:rotate-45 transition-transform duration-300",
            children: "settings"
          }), SIDEBAR_TEXTS.settings]
        }), /*#__PURE__*/_jsxs(Link, {
          to: "/help",
          onClick: () => onClose?.(),
          className: "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all text-[13px] font-medium group",
          children: [/*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined icon-thin text-[18px]",
            children: "help"
          }), SIDEBAR_TEXTS.support]
        })]
      }), !isPro && /*#__PURE__*/_jsx("div", {
        className: "mt-3 px-0.5",
        children: /*#__PURE__*/_jsxs("div", {
          className: "relative overflow-hidden bg-gradient-to-br from-[hsl(239_68%_58%)] to-[hsl(263_70%_55%)] rounded-3xl p-3.5 shadow-[0_2px_8px_hsl(239_68%_58%/0.20)] cursor-pointer transition-all duration-200 hover:opacity-90",
          children: [/*#__PURE__*/_jsx("div", {
            className: "absolute inset-0 opacity-10 rounded-2xl",
            style: {
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")"
            }
          }), /*#__PURE__*/_jsxs("div", {
            className: "relative z-10 flex items-center gap-3",
            children: [/*#__PURE__*/_jsx("div", {
              className: "w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0",
              children: /*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined icon-thin text-white text-[14px]",
                children: "workspace_premium"
              })
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("p", {
                className: "text-[11px] font-bold text-white leading-none",
                children: "Phi\xEAn b\u1EA3n Pro"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-white/75 text-[10px] font-medium mt-0.5 leading-tight",
                children: SIDEBAR_TEXTS.upgrade.desc
              })]
            })]
          })]
        })
      })]
    })]
  });
}