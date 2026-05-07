import DocumentTable from "@/components/DocumentTable";
import { MINDMAP_LIST_TEXTS } from "@/constants/texts";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function MindmapListPage() {
  return /*#__PURE__*/_jsxs("div", {
    className: "p-6 md:p-10 w-full pb-16 space-y-10 relative z-10",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "relative text-center space-y-5 max-w-2xl mx-auto",
      children: [/*#__PURE__*/_jsx("div", {
        className: "pointer-events-none absolute inset-x-0 -top-16 -z-10 flex justify-center",
        "aria-hidden": true,
        children: /*#__PURE__*/_jsx("div", {
          className: "w-80 h-48 rounded-full blur-3xl opacity-60",
          style: {
            background: "radial-gradient(ellipse, hsl(173 58% 42% / 0.20) 0%, hsl(239 68% 58% / 0.08) 60%, transparent 100%)"
          }
        })
      }), /*#__PURE__*/_jsxs("div", {
        className: "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(173_58%_42%/0.08)] border border-[hsl(173_58%_42%/0.20)] text-[hsl(173_50%_36%)] text-[11px] font-bold",
        children: [/*#__PURE__*/_jsx("span", {
          className: "material-symbols-outlined icon-thin text-[14px]",
          children: "account_tree"
        }), "S\u01A1 \u0111\u1ED3 t\u01B0 duy AI"]
      }), /*#__PURE__*/_jsx("h1", {
        className: "font-display text-4xl md:text-[2.75rem] text-[hsl(222_47%_10%)] dark:text-white leading-tight",
        children: MINDMAP_LIST_TEXTS.title
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[var(--muted)] text-[14px] max-w-lg mx-auto leading-relaxed",
        children: MINDMAP_LIST_TEXTS.subtitle
      })]
    }), /*#__PURE__*/_jsx(DocumentTable, {
      defaultAction: "mindmap"
    }), /*#__PURE__*/_jsxs("div", {
      className: "group relative overflow-hidden p-10 rounded-3xl border border-[var(--border-color)] shadow-sm hover:shadow-md hover:border-[hsl(173_58%_42%/0.35)] transition-all duration-300 flex flex-col items-center text-center",
      style: {
        background: "linear-gradient(135deg, hsl(173 58% 42% / 0.07), var(--card-bg) 55%)"
      },
      children: [/*#__PURE__*/_jsx("div", {
        className: "pointer-events-none absolute top-0 right-0 w-48 h-48 opacity-30",
        style: {
          background: "radial-gradient(circle at top right, hsl(173 58% 42% / 0.25) 0%, transparent 70%)"
        },
        "aria-hidden": true
      }), /*#__PURE__*/_jsx("div", {
        className: "w-16 h-16 rounded-2xl bg-[hsl(173_58%_42%/0.10)] border border-[hsl(173_58%_42%/0.20)] text-[hsl(173_50%_36%)] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200 relative z-10",
        children: /*#__PURE__*/_jsx("span", {
          className: "material-symbols-outlined icon-thin text-[30px]",
          children: "account_tree"
        })
      }), /*#__PURE__*/_jsx("h3", {
        className: "font-display text-2xl text-[hsl(222_47%_10%)] dark:text-white mb-3 relative z-10",
        children: MINDMAP_LIST_TEXTS.heroTitle
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[var(--muted)] text-[13px] max-w-md leading-relaxed font-medium relative z-10",
        children: MINDMAP_LIST_TEXTS.heroDesc
      })]
    })]
  });
}