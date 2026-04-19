"use client";

import DocumentTable from "@/components/DocumentTable";
import { LEARNING_PAGE_TEXTS } from "@/constants/texts";

export default function LearningPage() {
  return (
    <div className="p-6 md:p-10 w-full pb-12 space-y-10 relative z-10">
      {/* Header Section */}
      <div className="text-center mb-10 space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {LEARNING_PAGE_TEXTS.header.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed font-medium">
          {LEARNING_PAGE_TEXTS.header.subtitle}
        </p>
      </div>

      <div className="space-y-8">
        {/* Document Table */}
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[48px] border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-2xl h-fit max-h-[600px] overflow-hidden flex flex-col transition-colors duration-500">
           <DocumentTable showActions={true} />
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { 
              icon: "manage_search", 
              title: LEARNING_PAGE_TEXTS.cards.query.title, 
              desc: LEARNING_PAGE_TEXTS.cards.query.desc,
              color: "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
            },
            { 
              icon: "lightbulb", 
              title: LEARNING_PAGE_TEXTS.cards.summary.title, 
              desc: LEARNING_PAGE_TEXTS.cards.summary.desc,
              color: "text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10"
            },
            { 
              icon: "assignment", 
              title: LEARNING_PAGE_TEXTS.cards.quiz.title, 
              desc: LEARNING_PAGE_TEXTS.cards.quiz.desc,
              color: "text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10"
            }
          ].map((feature, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900/60 backdrop-blur-xl p-10 rounded-[48px] border border-slate-200 dark:border-white/10 shadow-md dark:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
              <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-8 transition-transform group-hover:scale-110 group-hover:rotate-6 ${feature.color} border border-slate-200 dark:border-white/5`}>
                <span className="material-symbols-outlined text-[32px]">{feature.icon}</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">{feature.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
