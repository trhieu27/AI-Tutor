"use client";

import { useState } from "react";
import Link from "next/link";
import UploadArea from "@/components/UploadArea";
import DocumentTable from "@/components/DocumentTable";

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-[1400px] mx-auto pb-24 space-y-10">
      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[40px] p-8 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Nâng tầm tri thức cùng <span className="text-blue-400 font-black">AI Tutor</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl">
            Tải lên tài liệu của bạn và để trí tuệ nhân tạo giúp bạn học tập, tra cứu và luyện tập hiệu quả gấp 10 lần.
          </p>
        </div>
        
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full"></div>
      </div>

      {/* Feature Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            title: "Hỏi đáp với AI", 
            desc: "Tra cứu kiến thức và giải đáp thắc mắc chuyên sâu.", 
            icon: "forum", 
            color: "bg-blue-50 text-blue-600",
            link: "/learning"
          },
          { 
            title: "Luyện tập câu hỏi", 
            desc: "Tự tạo đề thi trắc nghiệm để đánh giá năng lực.", 
            icon: "quiz", 
            color: "bg-orange-50 text-orange-600",
            link: "/practice"
          },
          { 
            title: "Tóm tắt thông minh", 
            desc: "Nắm bắt các ý chính chỉ trong vài giây.", 
            icon: "summarize", 
            color: "bg-purple-50 text-purple-600",
            link: "/learning"
          },
          { 
            title: "Sơ đồ tư duy", 
            desc: "Trực quan hóa cấu trúc kiến thức của tài liệu.", 
            icon: "account_tree", 
            color: "bg-green-50 text-green-600",
            link: "/chat"
          },
          { 
            title: "Câu hỏi ôn tập", 
            desc: "Tổng hợp các câu hỏi mở để ôn tập kiến thức sâu.", 
            icon: "format_list_numbered", 
            color: "bg-emerald-50 text-emerald-600",
            link: "/chat"
          }
        ].map((feat, idx) => (
          <Link 
            href={feat.link} 
            key={idx}
            className="group bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 active:scale-95"
          >
            <div className={`w-14 h-14 ${feat.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
              <span className="material-symbols-outlined text-[32px]">{feat.icon}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{feat.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
          </Link>
        ))}
      </div>

      {/* Main Content: Upload & Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 items-start">
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm sticky top-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-600">cloud_upload</span>
              Tải tài liệu mới
            </h2>
            <UploadArea onUploadSuccess={handleUploadSuccess} />
            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <p className="text-xs text-slate-500 italic">
                 Hỗ trợ file PDF lên đến 50MB. AI sẽ tự động phân tích và sẵn sàng hỗ trợ bạn sau vài giây.
               </p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <DocumentTable refreshTrigger={refreshTrigger} showActions={true} />
        </div>
      </div>
    </div>
  );
}
