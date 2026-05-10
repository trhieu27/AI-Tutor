import { useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import UploadArea from "@/components/UploadArea";
import DocumentTable from "@/components/DocumentTable";
import { DASHBOARD_TEXTS } from "@/constants/texts";

// ─── All logic unchanged — only visual layer updated ───────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const uploadSectionRef = useRef(null);
  const handleUploadSuccess = () => setRefreshTrigger(prev => prev + 1);
  const scrollToUpload = () => {
    uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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

  const featureCards = [
    {
      title: DASHBOARD_TEXTS.features.chat.title,
      desc: DASHBOARD_TEXTS.features.chat.desc,
      icon: "forum",
      color: "hsl(217 91% 60%)",
      bg: "hsl(217 91% 60% / 0.10)",
      border: "hsl(217 91% 60% / 0.22)",
      link: "/learning",
    },
    {
      title: DASHBOARD_TEXTS.features.practice.title,
      desc: DASHBOARD_TEXTS.features.practice.desc,
      icon: "model_training",
      color: "hsl(27 96% 54%)",
      bg: "hsl(27 96% 54% / 0.10)",
      border: "hsl(27 96% 54% / 0.22)",
      link: "/practice",
    },
    {
      title: DASHBOARD_TEXTS.features.summary.title,
      desc: DASHBOARD_TEXTS.features.summary.desc,
      icon: "summarize",
      color: "hsl(263 70% 62%)",
      bg: "hsl(263 70% 62% / 0.10)",
      border: "hsl(263 70% 62% / 0.22)",
      link: "/learning",
    },
    {
      title: DASHBOARD_TEXTS.features.mindmap.title,
      desc: DASHBOARD_TEXTS.features.mindmap.desc,
      icon: "account_tree",
      color: "hsl(158 64% 44%)",
      bg: "hsl(158 64% 44% / 0.10)",
      border: "hsl(158 64% 44% / 0.22)",
      link: "/mindmap",
    },
  ];

  return (
    <div className="p-6 md:p-10 w-full pb-16 space-y-8 relative z-10">

      {/* ══════════════════════════════════════════════════════
          HERO — no eyebrow chip pill (anti-pattern), no gradient text
          Clean bold headline with solid white text on deep gradient
          ══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-12">
        {/* Aurora gradient background */}
        <div className="absolute inset-0 animate-aurora rounded-3xl" />
        {/* Noise texture */}
        <div
          className="absolute inset-0 rounded-3xl opacity-[0.06]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")" }}
        />
        {/* Floating glow blob — decorative only */}
        <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-[360px] h-[360px] bg-white/8 blur-[80px] rounded-full pointer-events-none animate-float" />

        {/* Content */}
        <div className="relative z-10 max-w-2xl space-y-5">
          {/* Status chip — small, not the massive eyebrow pill anti-pattern */}
          <div className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-[0.15em]">
              AI Trợ lý học tập
            </span>
          </div>

          {/* Headline — solid white, Inter 800, no gradient text */}
          <h1 className="font-sans text-4xl md:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-white">
            {DASHBOARD_TEXTS.welcome.title.split('AI Tutor')[0]}
            <span className="text-white/90">AI Tutor</span>
          </h1>

          <p className="text-white/70 text-[15px] md:text-base leading-relaxed max-w-xl font-medium">
            {DASHBOARD_TEXTS.welcome.subtitle}
          </p>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={scrollToUpload}
              className="px-6 py-3 bg-white text-[hsl(239_68%_50%)] font-bold rounded-xl hover:bg-white/95 active:scale-[0.97] transition-all duration-150 shadow-[0_4px_16px_hsl(0_0%_0%/0.15)] text-[13px] tracking-tight text-center"
            >
              Bắt đầu học ngay
            </button>
            <Link
              to="/learning"
              className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/18 border border-white/20 transition-all duration-150 text-[13px] text-center"
            >
              Khám phá tính năng
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          FEATURE CARDS — Bento grid
          Chat card spans 2 cols (wide), others are 1 col
          No nested cards, no glassmorphism here (non-floating)
          ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {featureCards.map((feat, idx) => (
          <Link
            key={idx}
            to={feat.link}
            className="group bento-card neon-border p-5 flex flex-col gap-3 focus-visible:outline-2 focus-visible:outline-[hsl(239_68%_58%/0.6)] focus-visible:outline-offset-2"
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              style={{ background: feat.bg, border: `1px solid ${feat.border}` }}
            >
              <span className="material-symbols-outlined icon-thin text-[20px]" style={{ color: feat.color }}>
                {feat.icon}
              </span>
            </div>

            <div className="flex-1">
              <h3 className="text-[14px] font-semibold text-[var(--foreground)] tracking-tight">{feat.title}</h3>
              <p className="text-[12px] text-[var(--muted)] leading-relaxed mt-1">{feat.desc}</p>
            </div>

            {/* CTA arrow — appears on hover */}
            <div className="flex items-center gap-1 text-[hsl(239_68%_58%)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 -translate-x-1 group-hover:translate-x-0 transition-transform">
              <span className="text-[11px] font-semibold">Mở ngay</span>
              <span className="material-symbols-outlined icon-thin text-[14px]">arrow_forward</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          UPLOAD + DOCUMENT TABLE
          ══════════════════════════════════════════════════════ */}
      <div ref={uploadSectionRef} className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2 items-start">

        {/* Upload card */}
        <div className="xl:col-span-1">
          <div className="bento-card p-5 flex flex-col gap-4 min-h-[480px]">
            {/* Card header */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[hsl(239_68%_58%/0.10)] border border-[hsl(239_68%_58%/0.22)] flex items-center justify-center text-[hsl(239_68%_58%)]">
                <span className="material-symbols-outlined icon-thin text-[18px]">cloud_upload</span>
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-[var(--foreground)] tracking-tight">
                  {DASHBOARD_TEXTS.upload.title}
                </h2>
                <p className="text-[11px] text-[var(--muted-light)] font-medium mt-0.5">
                  PDF, DOCX được hỗ trợ
                </p>
              </div>
            </div>

            {/* Upload area */}
            <div className="flex-1 flex flex-col">
              <UploadArea onUploadSuccess={handleUploadSuccess} />
            </div>

            {/* Tip — flat surface, not nested card */}
            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <p className="text-[11px] text-[var(--muted)] font-medium leading-relaxed">
                {DASHBOARD_TEXTS.upload.tip}
              </p>
            </div>
          </div>
        </div>

        {/* Document table */}
        <div className="xl:col-span-2">
          <DocumentTable refreshTrigger={refreshTrigger} showActions={true} />
        </div>
      </div>
    </div>
  );
}