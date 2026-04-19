"use client";

import DocumentTable from "@/components/DocumentTable";
import { PRACTICE_PAGE_TEXTS } from "@/constants/texts";

export default function PracticeListPage() {
  return (
    <div className="p-8 md:p-12 max-w-[1400px] mx-auto pb-32 space-y-8 relative z-10">
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          {PRACTICE_PAGE_TEXTS.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-300 text-lg md:text-xl leading-relaxed font-medium">
          {PRACTICE_PAGE_TEXTS.subtitle}
        </p>
      </div>

      {/* Document Table */}
      <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[48px] border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-2xl h-fit max-h-[600px] overflow-hidden flex flex-col transition-colors duration-500">
        <DocumentTable defaultAction="quiz" />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl p-10 rounded-[48px] border border-slate-200 dark:border-white/10 shadow-md dark:shadow-2xl group transition-all duration-500 hover:-translate-y-2">
           <div className="w-16 h-16 rounded-[24px] bg-orange-50 dark:bg-orange-500/10 text-orange-500 dark:text-orange-400 flex items-center justify-center mb-8 border border-orange-200 dark:border-orange-500/20 group-hover:scale-110 transition-transform">
             <span className="material-symbols-outlined text-[32px]">lightbulb</span>
           </div>
           <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">{PRACTICE_PAGE_TEXTS.cards.activeLearning.title}</h3>
           <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">{PRACTICE_PAGE_TEXTS.cards.activeLearning.desc}</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl p-10 rounded-[48px] border border-slate-200 dark:border-white/10 shadow-md dark:shadow-2xl group transition-all duration-500 hover:-translate-y-2">
           <div className="w-16 h-16 rounded-[24px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center mb-8 border border-emerald-200 dark:border-emerald-500/20 group-hover:scale-110 transition-transform">
             <span className="material-symbols-outlined text-[32px]">analytics</span>
           </div>
           <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">{PRACTICE_PAGE_TEXTS.cards.expertExplanations.title}</h3>
           <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">{PRACTICE_PAGE_TEXTS.cards.expertExplanations.desc}</p>
        </div>
      </div>
    </div>
  );
}
