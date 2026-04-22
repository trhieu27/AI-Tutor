"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import UploadArea from "@/components/UploadArea";
import DocumentTable from "@/components/DocumentTable";
import { DASHBOARD_TEXTS } from "@/constants/texts";

export default function Dashboard() {
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  const handleUploadSuccess = () => setRefreshTrigger((prev) => prev + 1);

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
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) fileInput.click();
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
      bg: "hsl(217 91% 60% / 0.08)",
      border: "hsl(217 91% 60% / 0.20)",
      link: "/learning"
    },
    {
      title: DASHBOARD_TEXTS.features.practice.title,
      desc: DASHBOARD_TEXTS.features.practice.desc,
      icon: "model_training",
      color: "hsl(27 96% 54%)",
      bg: "hsl(27 96% 54% / 0.08)",
      border: "hsl(27 96% 54% / 0.20)",
      link: "/practice"
    },
    {
      title: DASHBOARD_TEXTS.features.summary.title,
      desc: DASHBOARD_TEXTS.features.summary.desc,
      icon: "summarize",
      color: "hsl(263 70% 62%)",
      bg: "hsl(263 70% 62% / 0.08)",
      border: "hsl(263 70% 62% / 0.20)",
      link: "/learning"
    },
    {
      title: DASHBOARD_TEXTS.features.mindmap.title,
      desc: DASHBOARD_TEXTS.features.mindmap.desc,
      icon: "account_tree",
      color: "hsl(158 64% 44%)",
      bg: "hsl(158 64% 44% / 0.08)",
      border: "hsl(158 64% 44% / 0.20)",
      link: "/mindmap"
    }
  ];

  return (
    <div className="p-6 md:p-10 w-full pb-12 space-y-8 relative z-10">

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 border border-[hsl(239_68%_58%/0.25)] bg-gradient-to-br from-[hsl(239_68%_50%)] to-[hsl(263_70%_45%)]">
        {/* Noise texture */}
        <div
          className="absolute inset-0 rounded-[40px] opacity-[0.06]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")" }}
        />
        {/* Glow orb */}
        <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-[400px] h-[400px] bg-white/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/12 border border-white/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span className="text-[10px] font-bold text-white/90 uppercase tracking-[0.2em]">AI Trợ lý học tập</span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] text-white">
            {DASHBOARD_TEXTS.welcome.title.split('AI Tutor')[0]}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-white">AI Tutor</span>
          </h1>

          <p className="text-white/75 text-[15px] md:text-base leading-relaxed max-w-xl font-medium">
            {DASHBOARD_TEXTS.welcome.subtitle}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={scrollToUpload}
              className="px-6 py-3 bg-white text-[hsl(239_68%_50%)] font-bold rounded-2xl hover:bg-white/90 transition-all shadow-[0_4px_16px_hsl(0_0%_0%/0.15)] active:scale-95 text-[13px] tracking-wide"
            >
              Bắt đầu học ngay
            </button>
            <Link
              href="/learning"
              className="px-6 py-3 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/20 border border-white/20 transition-all text-[13px]"
            >
              Khám phá tính năng
            </Link>
          </div>
        </div>
      </div>

      {/* ── Feature Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {featureCards.map((feat, idx) => (
          <Link
            href={feat.link}
            key={idx}
            className="group relative bg-[var(--card-bg)] p-5 rounded-3xl border border-[var(--border-color)] shadow-sm hover:border-[var(--border-emphasis)] transition-all duration-200"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200"
              style={{ background: feat.bg, border: `1px solid ${feat.border}` }}
            >
              <span className="material-symbols-outlined icon-thin text-[20px]" style={{ color: feat.color }}>{feat.icon}</span>
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--foreground)] mb-1.5 tracking-tight">{feat.title}</h3>
            <p className="text-[12px] text-[var(--muted)] leading-relaxed">{feat.desc}</p>

            {/* Hover arrow */}
            <div className="mt-4 flex items-center gap-1 text-[hsl(239_68%_58%)] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-[11px] font-semibold">Mở ngay</span>
              <span className="material-symbols-outlined icon-thin text-[14px]">arrow_forward</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Data Section ──────────────────────────────────────────────── */}
      <div ref={uploadSectionRef} className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2 items-start">

        {/* Upload column */}
        <div className="xl:col-span-1">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-sm p-5 flex flex-col gap-4 min-h-[480px]">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[hsl(239_68%_58%/0.10)] border border-[hsl(239_68%_58%/0.20)] flex items-center justify-center text-[hsl(239_68%_58%)]">
                <span className="material-symbols-outlined icon-thin text-[18px]">cloud_upload</span>
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-[var(--foreground)] tracking-tight">{DASHBOARD_TEXTS.upload.title}</h2>
                <p className="text-[10px] text-[var(--muted-light)] font-medium">PDF, DOCX được hỗ trợ</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <UploadArea onUploadSuccess={handleUploadSuccess} />
            </div>

            <div className="p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] shrink-0">
              <p className="text-[11px] text-[var(--muted)] font-medium leading-relaxed italic">
                {DASHBOARD_TEXTS.upload.tip}
              </p>
            </div>
          </div>
        </div>

        {/* Table column */}
        <div className="xl:col-span-2">
          <DocumentTable refreshTrigger={refreshTrigger} showActions={true} />
        </div>
      </div>
    </div>
  );
}
