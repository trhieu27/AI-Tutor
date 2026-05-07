import DocumentTable from "@/components/DocumentTable";
import { LEARNING_PAGE_TEXTS } from "@/constants/texts";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function LearningPage() {
  const features = [{
    icon: "manage_search",
    title: LEARNING_PAGE_TEXTS.cards.query.title,
    desc: LEARNING_PAGE_TEXTS.cards.query.desc,
    fromColor: "hsl(239 68% 58% / 0.09)",
    iconCls: "bg-[hsl(239_68%_58%/0.10)] border-[hsl(239_68%_58%/0.20)] text-[hsl(239_55%_50%)]",
    accentCls: "text-[hsl(239_55%_50%)]"
  }, {
    icon: "lightbulb",
    title: LEARNING_PAGE_TEXTS.cards.summary.title,
    desc: LEARNING_PAGE_TEXTS.cards.summary.desc,
    fromColor: "hsl(263 70% 62% / 0.09)",
    iconCls: "bg-[hsl(263_70%_62%/0.10)] border-[hsl(263_70%_62%/0.20)] text-[hsl(263_55%_52%)]",
    accentCls: "text-[hsl(263_55%_52%)]"
  }, {
    icon: "assignment",
    title: LEARNING_PAGE_TEXTS.cards.quiz.title,
    desc: LEARNING_PAGE_TEXTS.cards.quiz.desc,
    fromColor: "hsl(27 96% 54% / 0.09)",
    iconCls: "bg-[hsl(27_96%_54%/0.10)] border-[hsl(27_96%_54%/0.20)] text-[hsl(27_80%_42%)]",
    accentCls: "text-[hsl(27_80%_42%)]"
  }];
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
            background: "radial-gradient(ellipse, hsl(239 68% 58% / 0.18) 0%, transparent 70%)"
          }
        })
      }), /*#__PURE__*/_jsxs("div", {
        className: "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(239_68%_58%/0.08)] border border-[hsl(239_68%_58%/0.18)] text-[hsl(239_55%_50%)] text-[11px] font-bold",
        children: [/*#__PURE__*/_jsx("span", {
          className: "material-symbols-outlined icon-thin text-[14px]",
          children: "school"
        }), "AI Tr\u1EE3 l\xFD h\u1ECDc t\u1EADp"]
      }), /*#__PURE__*/_jsx("h1", {
        className: "font-display text-4xl md:text-[2.75rem] text-[hsl(222_47%_10%)] dark:text-white leading-tight",
        children: LEARNING_PAGE_TEXTS.header.title
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[var(--muted)] text-[14px] max-w-lg mx-auto leading-relaxed",
        children: LEARNING_PAGE_TEXTS.header.subtitle
      })]
    }), /*#__PURE__*/_jsx(DocumentTable, {
      showActions: true
    }), /*#__PURE__*/_jsx("div", {
      className: "grid grid-cols-1 md:grid-cols-3 gap-5",
      children: features.map((feat, idx) => /*#__PURE__*/_jsxs("div", {
        className: "group relative overflow-hidden p-7 rounded-3xl border border-[var(--border-color)] shadow-sm hover:shadow-md hover:border-[var(--border-emphasis)] transition-all duration-300 cursor-default",
        style: {
          background: `linear-gradient(135deg, ${feat.fromColor}, var(--card-bg) 60%)`
        },
        children: [/*#__PURE__*/_jsx("div", {
          className: `w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border ${feat.iconCls} group-hover:scale-105 transition-transform duration-200`,
          children: /*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined icon-thin text-[24px]",
            children: feat.icon
          })
        }), /*#__PURE__*/_jsx("h3", {
          className: "text-[15px] font-bold text-[var(--foreground)] mb-2",
          children: feat.title
        }), /*#__PURE__*/_jsx("p", {
          className: "text-[var(--muted)] text-[13px] leading-relaxed font-medium",
          children: feat.desc
        })]
      }, idx))
    })]
  });
}