"use client";

import Link from "next/link";
import DocumentTable from "@/components/DocumentTable";
import { SIDEBAR_TEXTS } from "@/constants/texts";

export default function LearningPage() {
  return (
    <div className="p-5 md:p-10 max-w-[1200px] mx-auto pb-20">
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="text-[32px] font-bold text-on-surface mb-3 tracking-tight">
          {SIDEBAR_TEXTS.learning}
        </h1>
        <p className="text-on-surface-variant text-[16px] leading-relaxed">
          Chọn một tài liệu từ thư viện của bạn để bắt đầu phân tích, tóm tắt và đặt câu hỏi chuyên sâu cùng AI Tutor.
        </p>
      </div>

      <div>
        <DocumentTable />
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-outline/20 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[28px]">search_insights</span>
          </div>
          <h3 className="font-bold text-on-surface mb-2">Truy vấn Kiến thức</h3>
          <p className="text-sm text-on-surface-variant">Hỏi và đáp dựa trên nội dung chính xác từ tài liệu của bạn.</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-outline/20 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[28px]">format_list_bulleted</span>
          </div>
          <h3 className="font-bold text-on-surface mb-2">Tóm tắt Thông minh</h3>
          <p className="text-sm text-on-surface-variant">Tự động trích xuất các ý chính và sơ đồ hóa kiến thức phức tạp.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-outline/20 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[28px]">edit_note</span>
          </div>
          <h3 className="font-bold text-on-surface mb-2">Luyện tập & Đánh giá</h3>
          <p className="text-sm text-on-surface-variant">Tạo đề thi trắc nghiệm từ tài liệu để kiểm tra mức độ hiểu bài.</p>
        </div>
      </div>
    </div>
  );
}
