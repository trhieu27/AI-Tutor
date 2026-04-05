"use client";

import DocumentTable from "@/components/DocumentTable";
import { SIDEBAR_TEXTS } from "@/constants/texts";

export default function PracticePage() {
  return (
    <div className="p-5 md:p-10 max-w-[1200px] mx-auto pb-20">
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="text-[32px] font-bold text-on-surface mb-3 tracking-tight">
          Luyện tập Trắc nghiệm
        </h1>
        <p className="text-on-surface-variant text-[16px] leading-relaxed">
          Chọn tài liệu bạn đã học để AI soạn thảo bộ câu hỏi trắc nghiệm kiểm tra kiến thức ngay lập tức!
        </p>
      </div>

      <div className="bg-white rounded-[32px] p-1 border border-outline/10 shadow-sm overflow-hidden">
        <DocumentTable />
      </div>

      <div className="mt-12 p-8 bg-blue-50/50 rounded-[32px] border border-blue-100 flex flex-col md:flex-row items-center gap-8 shadow-sm">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-[28px] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[40px]">psychology</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-blue-900 mb-2">Học tập đa phương thức</h3>
          <p className="text-blue-700/80 leading-relaxed">
            AI Tutor không chỉ giúp bạn hỏi đáp mà còn tự động trích xuất các câu hỏi hóc búa nhất từ chính tài liệu của bạn. Hãy thử chọn một tài liệu và bấm vào nút <b>"Luyện tập"</b> trong trang Chat nhé!
          </p>
        </div>
      </div>
    </div>
  );
}
