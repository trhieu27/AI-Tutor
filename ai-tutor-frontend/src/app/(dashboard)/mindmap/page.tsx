"use client";

import DocumentTable from "@/components/DocumentTable";
import { MINDMAP_PAGE_TEXTS } from "@/constants/texts";

export default function MindmapListPage() {
  return (
    <div className="p-5 md:p-10 max-w-[1200px] mx-auto pb-20">
      <div className="mb-12 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
          {MINDMAP_PAGE_TEXTS.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-300 text-lg leading-relaxed font-medium">
          {MINDMAP_PAGE_TEXTS.subtitle}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[48px] border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-2xl h-fit max-h-[600px] overflow-hidden flex flex-col transition-colors duration-500">
        <DocumentTable defaultAction="mindmap" />
      </div>

      <div className="mt-8 p-12 bg-white dark:bg-slate-900/60 backdrop-blur-xl rounded-[48px] border border-slate-200 dark:border-white/10 flex flex-col items-center text-center shadow-md dark:shadow-2xl relative overflow-hidden group transition-colors duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div className="w-20 h-20 rounded-[28px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mb-8 border border-indigo-200 dark:border-indigo-500/20 shadow-lg dark:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-transform group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[42px]">account_tree</span>
        </div>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight relative z-10">{MINDMAP_PAGE_TEXTS.heroTitle}</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-base leading-relaxed font-medium relative z-10">
          {MINDMAP_PAGE_TEXTS.heroDesc}
        </p>
      </div>
    </div>
  );
}
