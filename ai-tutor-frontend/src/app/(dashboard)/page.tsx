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

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('action') === 'upload') {
      setTimeout(() => {
        scrollToUpload();
        // Trigger file input after a short delay for smooth scroll
        setTimeout(() => {
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) fileInput.click();
          // Clean up URL without refreshing
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
      color: "from-blue-500/20 to-indigo-500/20 text-blue-400",
      link: "/learning"
    },
    { 
      title: DASHBOARD_TEXTS.features.practice.title, 
      desc: DASHBOARD_TEXTS.features.practice.desc, 
      icon: "model_training", 
      color: "from-orange-500/20 to-red-500/20 text-orange-400",
      link: "/practice"
    },
    { 
      title: DASHBOARD_TEXTS.features.summary.title, 
      desc: DASHBOARD_TEXTS.features.summary.desc, 
      icon: "summarize", 
      color: "from-purple-500/20 to-pink-500/20 text-purple-400",
      link: "/learning"
    },
    { 
      title: DASHBOARD_TEXTS.features.mindmap.title, 
      desc: DASHBOARD_TEXTS.features.mindmap.desc, 
      icon: "account_tree", 
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400",
      link: "/mindmap"
    }
  ];

  return (
    <div className="p-6 md:p-12 w-full pb-12 space-y-8 relative z-10 font-sans">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 border border-white/10 rounded-[48px] p-10 md:p-16 text-white shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
        <div className="relative z-10 max-w-2xl space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full">
             <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
             <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest leading-none">AI Trợ lý học tập mới nhất</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-white">
            {DASHBOARD_TEXTS.welcome.title.split('AI Tutor')[0]}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">AI Tutor</span>
          </h1>
          <p className="text-slate-200 text-lg md:text-xl leading-relaxed max-w-xl font-medium tracking-tight opacity-90">
            {DASHBOARD_TEXTS.welcome.subtitle}
          </p>
          <div className="pt-4">
             <button onClick={scrollToUpload} className="px-8 py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-indigo-400 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95 text-sm uppercase tracking-widest">
                Bắt đầu học ngay
             </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-indigo-500/20 blur-[130px] rounded-full"></div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {featureCards.map((feat, idx) => (
          <Link href={feat.link} key={idx} className="group relative bg-slate-900/60 backdrop-blur-md p-8 rounded-[40px] border border-white/10 shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
            <div className={`w-16 h-16 bg-gradient-to-br ${feat.color} rounded-[24px] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 shadow-lg`}>
              <span className="material-symbols-outlined text-[32px]">{feat.icon}</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feat.title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed font-medium opacity-90">{feat.desc}</p>
          </Link>
        ))}
      </div>

      {/* Data Section - Left grows, Right stays fixed */}
      <div ref={uploadSectionRef} className="grid grid-cols-1 xl:grid-cols-3 gap-8 pt-4 items-start">
        {/* Upload Column - Starts at 520px, can grow */}
        <div className="xl:col-span-1">
          <div className="min-h-[520px] h-auto bg-slate-900/80 backdrop-blur-2xl p-10 rounded-[48px] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] flex flex-col">
             <div className="flex items-center justify-between mb-8 shrink-0">
                <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                  <span className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                    <span className="material-symbols-outlined ">cloud_upload</span>
                  </span>
                  {DASHBOARD_TEXTS.upload.title}
                </h2>
             </div>
             
             <div className="flex-1 flex flex-col">
               <UploadArea onUploadSuccess={handleUploadSuccess} />
             </div>

             <div className="mt-6 p-6 bg-white/[0.03] rounded-3xl border border-white/10 shrink-0">
                <p className="text-[11px] text-slate-200 font-bold uppercase tracking-widest leading-relaxed italic opacity-80">
                  {DASHBOARD_TEXTS.upload.tip}
                </p>
             </div>
          </div>
        </div>

        {/* Table Column - Content-aware height with 520px cap */}
        <div className="xl:col-span-2 h-fit max-h-[520px]">
          <div className="h-fit max-h-[520px] bg-slate-900/40 backdrop-blur-md rounded-[48px] border border-white/10 p-2 overflow-hidden shadow-2xl flex flex-col">
            <DocumentTable refreshTrigger={refreshTrigger} showActions={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
