"use client";

import DocumentTable from "@/components/DocumentTable";
import { PRACTICE_PAGE_TEXTS } from "@/constants/texts";

export default function PracticeListPage() {
  const cards = [
    {
      icon: "lightbulb",
      title: PRACTICE_PAGE_TEXTS.cards.activeLearning.title,
      desc: PRACTICE_PAGE_TEXTS.cards.activeLearning.desc,
      fromColor: "hsl(27 96% 54% / 0.09)",
      iconCls: "bg-[hsl(27_96%_54%/0.10)] border-[hsl(27_96%_54%/0.20)] text-[hsl(27_80%_42%)]",
      accentCls: "text-[hsl(27_80%_42%)]",
    },
    {
      icon: "analytics",
      title: PRACTICE_PAGE_TEXTS.cards.expertExplanations.title,
      desc: PRACTICE_PAGE_TEXTS.cards.expertExplanations.desc,
      fromColor: "hsl(158 64% 44% / 0.09)",
      iconCls: "bg-[hsl(158_64%_44%/0.10)] border-[hsl(158_64%_44%/0.20)] text-[hsl(158_55%_36%)]",
      accentCls: "text-[hsl(158_55%_36%)]",
    },
  ];

  return (
    <div className="p-6 md:p-10 w-full pb-16 space-y-10 relative z-10">

      {/* ── Hero Header ─────────────────────────────────────────── */}
      <div className="relative text-center space-y-5 max-w-2xl mx-auto">
        {/* Ambient glow — warm amber */}
        <div className="pointer-events-none absolute inset-x-0 -top-16 -z-10 flex justify-center" aria-hidden>
          <div className="w-80 h-48 rounded-full blur-3xl opacity-60"
            style={{ background: "radial-gradient(ellipse, hsl(27 96% 54% / 0.18) 0%, transparent 70%)" }}
          />
        </div>

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(27_96%_54%/0.08)] border border-[hsl(27_96%_54%/0.20)] text-[hsl(27_80%_42%)] text-[11px] font-bold">
          <span className="material-symbols-outlined icon-thin text-[14px]">quiz</span>
          Luyện tập thông minh
        </div>

        <h1 className="font-display text-4xl md:text-[2.75rem] text-[hsl(222_47%_10%)] dark:text-white leading-tight">
          {PRACTICE_PAGE_TEXTS.title}
        </h1>

        <p className="text-[var(--muted)] text-[14px] max-w-lg mx-auto leading-relaxed">
          {PRACTICE_PAGE_TEXTS.subtitle}
        </p>
      </div>

      {/* ── Document Table ──────────────────────────────────────── */}
      <DocumentTable defaultAction="quiz" />

      {/* ── Info Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="group relative overflow-hidden p-7 rounded-3xl border border-[var(--border-color)] shadow-sm hover:shadow-md hover:border-[var(--border-emphasis)] transition-all duration-300"
            style={{ background: `linear-gradient(135deg, ${card.fromColor}, var(--card-bg) 60%)` }}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border ${card.iconCls} group-hover:scale-105 transition-transform duration-200`}>
              <span className="material-symbols-outlined icon-thin text-[24px]">{card.icon}</span>
            </div>
            <h3 className="text-[15px] font-bold text-[var(--foreground)] mb-2">{card.title}</h3>
            <p className="text-[var(--muted)] text-[13px] leading-relaxed font-medium">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
