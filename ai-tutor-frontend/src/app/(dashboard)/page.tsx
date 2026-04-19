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

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

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
      color: "from-blue-500/20 to-indigo-500/20 text-blue-500 dark:text-blue-400",
      link: "/learning"
    },
    { 
      title: DASHBOARD_TEXTS.features.practice.title, 
      desc: DASHBOARD_TEXTS.features.practice.desc, 
      icon: "model_training", 
      color: "from-orange-500/20 to-red-500/20 text-orange-500 dark:text-orange-400",
      link: "/practice"
    },
    { 
      title: DASHBOARD_TEXTS.features.summary.title, 
      desc: DASHBOARD_TEXTS.features.summary.desc, 
      icon: "summarize", 
      color: "from-purple-500/20 to-pink-500/20 text-purple-500 dark:text-purple-400",
      link: "/learning"
    },
    { 
      title: DASHBOARD_TEXTS.features.mindmap.title, 
      desc: DASHBOARD_TEXTS.features.mindmap.desc, 
      icon: "account_tree", 
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-500 dark:text-emerald-400",
      link: "/mindmap"
    }
  ];

  return (
    <div className="p-6 md:p-12 w-full pb-12 space-y-8 relative z-10 font-sans">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-slate-900 dark:to-slate-900 border border-indigo-500/20 dark:border-white/10 rounded-[48px] p-10 md:p-16 text-white shadow-xl dark:shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
        <div className="relative z-10 max-w-2xl space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 dark:bg-indigo-500/10 border border-white/20 dark:border-indigo-500/30 rounded-full">
             <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-indigo-400 animate-ping"></span>
             <span className="text-[10px] font-extrabold text-white/90 dark:text-indigo-300 uppercase tracking-[0.2em] leading-none">AI Trợ lý học tập mới nhất</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
            {DASHBOARD_TEXTS.welcome.title.split('AI Tutor')[0]}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-indigo-200 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300 whitespace-nowrap">AI Tutor</span>
          </h1>
          <p className="text-white/80 dark:text-slate-200 text-lg md:text-xl leading-relaxed max-w-xl font-semibold tracking-tight">
            {DASHBOARD_TEXTS.welcome.subtitle}
          </p>
          <div className="pt-4">
             <button onClick={scrollToUpload} className="px-8 py-4 bg-white text-indigo-700 dark:text-slate-950 font-extrabold rounded-2xl hover:bg-slate-50 dark:hover:bg-indigo-400 dark:hover:text-white transition-all shadow-xl active:scale-95 text-sm uppercase tracking-[0.15em]">
                Bắt đầu học ngay
             </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-white/10 dark:bg-indigo-500/20 blur-[130px] rounded-full"></div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {featureCards.map((feat, idx) => (
          <Link href={feat.link} key={idx} className="group relative bg-white dark:bg-slate-900/60 backdrop-blur-md p-8 rounded-[40px] border border-slate-200 dark:border-white/10 shadow-md dark:shadow-2xl hover:shadow-lg dark:hover:shadow-indigo-500/10 transition-all duration-500">
            <div className={`w-16 h-16 bg-gradient-to-br ${feat.color} rounded-[24px] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 shadow-lg`}>
              <span className="material-symbols-outlined text-[32px]">{feat.icon}</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">{feat.title}</h3>
            <p className="text-slate-500 dark:text-slate-300 text-[13px] leading-[1.7] font-medium tracking-tight opacity-90">{feat.desc}</p>
          </Link>
        ))}
      </div>

      {/* Data Section */}
      <div ref={uploadSectionRef} className="grid grid-cols-1 xl:grid-cols-3 gap-8 pt-4 items-start">
        {/* Upload Column */}
        <div className="xl:col-span-1">
          <div className="min-h-[520px] h-auto bg-white dark:bg-slate-900/80 backdrop-blur-2xl p-10 rounded-[48px] border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-[0_40px_80px_rgba(0,0,0,0.5)] flex flex-col transition-colors duration-500">
             <div className="flex items-center justify-between mb-8 shrink-0">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                  <span className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                    <span className="material-symbols-outlined ">cloud_upload</span>
                  </span>
                  {DASHBOARD_TEXTS.upload.title}
                </h2>
             </div>
             
             <div className="flex-1 flex flex-col">
               <UploadArea onUploadSuccess={handleUploadSuccess} />
             </div>

             <div className="mt-6 p-6 bg-slate-50 dark:bg-white/[0.03] rounded-3xl border border-slate-200 dark:border-white/10 shrink-0 transition-colors duration-500">
                <p className="text-[11px] text-slate-500 dark:text-slate-200 font-bold uppercase tracking-widest leading-relaxed italic opacity-80">
                  {DASHBOARD_TEXTS.upload.tip}
                </p>
             </div>
          </div>
        </div>

        {/* Table Column */}
        <div className="xl:col-span-2 h-fit max-h-[520px]">
          <div className="h-fit max-h-[520px] bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[48px] border border-slate-200 dark:border-white/10 p-2 overflow-hidden shadow-lg dark:shadow-2xl flex flex-col transition-colors duration-500">
            <DocumentTable refreshTrigger={refreshTrigger} showActions={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
