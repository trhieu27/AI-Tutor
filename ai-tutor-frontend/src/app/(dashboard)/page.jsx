import { useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import UploadArea from "@/components/UploadArea";
import DocumentTable from "@/components/DocumentTable";
import { DASHBOARD_TEXTS } from "@/constants/texts";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Dashboard() {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const uploadSectionRef = useRef(null);
  const handleUploadSuccess = () => setRefreshTrigger(prev => prev + 1);
  const scrollToUpload = () => {
    uploadSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  };
  const hasTriggeredUpload = useRef(false);
  useEffect(() => {
    if (hasTriggeredUpload.current) return;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('action') === 'upload') {
      hasTriggeredUpload.current = true;
      setTimeout(() => {
        scrollToUpload();
        setTimeout(() => {
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) fileInput?.click();
          window.history.replaceState({}, '', '/');
        }, 600);
      }, 300);
    }
  }, []);
  const featureCards = [{
    title: DASHBOARD_TEXTS.features.chat.title,
    desc: DASHBOARD_TEXTS.features.chat.desc,
    icon: "forum",
    color: "hsl(217 91% 60%)",
    bg: "hsl(217 91% 60% / 0.08)",
    border: "hsl(217 91% 60% / 0.20)",
    link: "/learning"
  }, {
    title: DASHBOARD_TEXTS.features.practice.title,
    desc: DASHBOARD_TEXTS.features.practice.desc,
    icon: "model_training",
    color: "hsl(27 96% 54%)",
    bg: "hsl(27 96% 54% / 0.08)",
    border: "hsl(27 96% 54% / 0.20)",
    link: "/practice"
  }, {
    title: DASHBOARD_TEXTS.features.summary.title,
    desc: DASHBOARD_TEXTS.features.summary.desc,
    icon: "summarize",
    color: "hsl(263 70% 62%)",
    bg: "hsl(263 70% 62% / 0.08)",
    border: "hsl(263 70% 62% / 0.20)",
    link: "/learning"
  }, {
    title: DASHBOARD_TEXTS.features.mindmap.title,
    desc: DASHBOARD_TEXTS.features.mindmap.desc,
    icon: "account_tree",
    color: "hsl(158 64% 44%)",
    bg: "hsl(158 64% 44% / 0.08)",
    border: "hsl(158 64% 44% / 0.20)",
    link: "/mindmap"
  }];
  return /*#__PURE__*/_jsxs("div", {
    className: "p-6 md:p-10 w-full pb-12 space-y-8 relative z-10",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "relative overflow-hidden rounded-3xl p-8 md:p-12 border border-[hsl(239_68%_58%/0.25)] bg-gradient-to-br from-[hsl(239_68%_50%)] to-[hsl(263_70%_45%)]",
      children: [/*#__PURE__*/_jsx("div", {
        className: "absolute inset-0 rounded-[40px] opacity-[0.06]",
        style: {
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"
        }
      }), /*#__PURE__*/_jsx("div", {
        className: "absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-[400px] h-[400px] bg-white/10 blur-[100px] rounded-full pointer-events-none"
      }), /*#__PURE__*/_jsxs("div", {
        className: "relative z-10 max-w-2xl space-y-6",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/12 border border-white/20 rounded-full",
          children: [/*#__PURE__*/_jsx("span", {
            className: "w-1.5 h-1.5 rounded-full bg-white animate-ping"
          }), /*#__PURE__*/_jsx("span", {
            className: "text-[10px] font-bold text-white/90 uppercase tracking-[0.2em]",
            children: "AI Tr\u1EE3 l\xFD h\u1ECDc t\u1EADp"
          })]
        }), /*#__PURE__*/_jsxs("h1", {
          className: "font-serif text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] text-white",
          children: [DASHBOARD_TEXTS.welcome.title.split('AI Tutor')[0], /*#__PURE__*/_jsx("span", {
            className: "text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-white",
            children: "AI Tutor"
          })]
        }), /*#__PURE__*/_jsx("p", {
          className: "text-white/75 text-[15px] md:text-base leading-relaxed max-w-xl font-medium",
          children: DASHBOARD_TEXTS.welcome.subtitle
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-3 pt-2",
          children: [/*#__PURE__*/_jsx("button", {
            onClick: scrollToUpload,
            className: "px-6 py-3 bg-white text-[hsl(239_68%_50%)] font-bold rounded-2xl hover:bg-white/90 transition-all shadow-[0_4px_16px_hsl(0_0%_0%/0.15)] active:scale-95 text-[13px] tracking-wide",
            children: "B\u1EAFt \u0111\u1EA7u h\u1ECDc ngay"
          }), /*#__PURE__*/_jsx(Link, {
            to: "/learning",
            className: "px-6 py-3 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/20 border border-white/20 transition-all text-[13px]",
            children: "Kh\xE1m ph\xE1 t\xEDnh n\u0103ng"
          })]
        })]
      })]
    }), /*#__PURE__*/_jsx("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
      children: featureCards.map((feat, idx) => /*#__PURE__*/_jsxs(Link, {
        to: feat.link,
        className: "group relative bg-[var(--card-bg)] p-5 rounded-3xl border border-[var(--border-color)] shadow-sm hover:border-[var(--border-emphasis)] transition-all duration-200",
        children: [/*#__PURE__*/_jsx("div", {
          className: "w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200",
          style: {
            background: feat.bg,
            border: `1px solid ${feat.border}`
          },
          children: /*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined icon-thin text-[20px]",
            style: {
              color: feat.color
            },
            children: feat.icon
          })
        }), /*#__PURE__*/_jsx("h3", {
          className: "text-[14px] font-semibold text-[var(--foreground)] mb-1.5 tracking-tight",
          children: feat.title
        }), /*#__PURE__*/_jsx("p", {
          className: "text-[12px] text-[var(--muted)] leading-relaxed",
          children: feat.desc
        }), /*#__PURE__*/_jsxs("div", {
          className: "mt-4 flex items-center gap-1 text-[hsl(239_68%_58%)] opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          children: [/*#__PURE__*/_jsx("span", {
            className: "text-[11px] font-semibold",
            children: "M\u1EDF ngay"
          }), /*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined icon-thin text-[14px]",
            children: "arrow_forward"
          })]
        })]
      }, idx))
    }), /*#__PURE__*/_jsxs("div", {
      ref: uploadSectionRef,
      className: "grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2 items-start",
      children: [/*#__PURE__*/_jsx("div", {
        className: "xl:col-span-1",
        children: /*#__PURE__*/_jsxs("div", {
          className: "bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-sm p-5 flex flex-col gap-4 min-h-[480px]",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "flex items-center gap-3 shrink-0",
            children: [/*#__PURE__*/_jsx("div", {
              className: "w-9 h-9 rounded-xl bg-[hsl(239_68%_58%/0.10)] border border-[hsl(239_68%_58%/0.20)] flex items-center justify-center text-[hsl(239_68%_58%)]",
              children: /*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined icon-thin text-[18px]",
                children: "cloud_upload"
              })
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("h2", {
                className: "text-[14px] font-semibold text-[var(--foreground)] tracking-tight",
                children: DASHBOARD_TEXTS.upload.title
              }), /*#__PURE__*/_jsx("p", {
                className: "text-[10px] text-[var(--muted-light)] font-medium",
                children: "PDF, DOCX \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3"
              })]
            })]
          }), /*#__PURE__*/_jsx("div", {
            className: "flex-1 flex flex-col",
            children: /*#__PURE__*/_jsx(UploadArea, {
              onUploadSuccess: handleUploadSuccess
            })
          }), /*#__PURE__*/_jsx("div", {
            className: "p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] shrink-0",
            children: /*#__PURE__*/_jsx("p", {
              className: "text-[11px] text-[var(--muted)] font-medium leading-relaxed italic",
              children: DASHBOARD_TEXTS.upload.tip
            })
          })]
        })
      }), /*#__PURE__*/_jsx("div", {
        className: "xl:col-span-2",
        children: /*#__PURE__*/_jsx(DocumentTable, {
          refreshTrigger: refreshTrigger,
          showActions: true
        })
      })]
    })]
  });
}