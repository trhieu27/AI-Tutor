"use client";

import React, { useState } from 'react';

export default function HelpPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "AI Tutor hoạt động như thế nào?",
      answer: "AI Tutor sử dụng công cụ RAG (Retrieval-Augmented Generation) kết hợp với mô hình ngôn ngữ lớn (LLM) để phân tích tài liệu của bạn. Sau khi bạn tải lên, hệ thống sẽ 'đọc' và ghi nhớ nội dung, giúp bạn có thể trò chuyện, đặt câu hỏi, soạn đề thi hoặc tóm tắt tài liệu đó một cách chính xác."
    },
    {
      question: "Dữ liệu của tôi có được bảo mật không?",
      answer: "Hoàn toàn bảo mật. Tất cả tài liệu tải lên đều được mã hóa và lưu trữ riêng tư cho tài khoản của bạn. Chúng tôi không sử dụng dữ liệu cá nhân của bạn để huấn luyện các mô hình AI công khai."
    },
    {
      question: "Tôi có thể tải lên các định dạng tệp nào?",
      answer: "Hiện tại chúng tôi hỗ trợ tốt nhất cho định dạng PDF. Các định dạng tệp văn bản khác như Word (.docx) và Plain Text (.txt) đang được phát triển và sẽ sớm ra mắt."
    },
    {
      question: "Làm thế nào để tạo Sơ đồ tư duy hiệu quả?",
      answer: "Sau khi tài liệu được xử lý thành công, hãy chọn tính năng 'Sơ đồ tư duy'. Hệ thống sẽ tự động trích xuất các ý chính và phân cấp chúng. Bạn có thể tương tác với các nút trên sơ đồ để mở rộng hoặc thu gọn các kiến thức liên quan."
    }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12 pb-24 relative z-10 transition-colors duration-500">
      {/* Header section */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Trung tâm hỗ trợ</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold max-w-xl mx-auto">
          Chào mừng bạn đến với AI Tutor Support. Chúng tôi ở đây để giúp bạn tối ưu hóa trải nghiệm học tập thông minh.
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 rounded-[32px] border border-indigo-500/20 group hover:border-indigo-500/40 transition-all cursor-pointer">
           <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-indigo-500/20">
              <span className="material-symbols-outlined text-2xl">book</span>
           </div>
           <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Hướng dẫn sử dụng</h3>
           <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Tìm hiểu mọi tính năng từ cơ bản đến nâng cao để làm chủ AI Tutor trong 5 phút.</p>
        </div>

        <div className="p-8 bg-gradient-to-br from-amber-500/10 to-orange-600/10 rounded-[32px] border border-amber-500/20 group hover:border-amber-500/40 transition-all cursor-pointer">
           <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-amber-500/20">
              <span className="material-symbols-outlined text-2xl">support_agent</span>
           </div>
           <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Liên hệ hỗ trợ</h3>
           <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Đội ngũ kỹ thuật của chúng tôi luôn sẵn sàng giải đáp các thắc mắc của bạn qua Email/Hotline.</p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
           <span className="material-symbols-outlined text-indigo-500">help</span>
           Câu hỏi thường gặp
        </h3>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`rounded-3xl border transition-all duration-300 overflow-hidden ${activeFaq === index ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-white/10'}`}
            >
              <button 
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left group"
              >
                <span className={`text-[15px] font-bold transition-colors ${activeFaq === index ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-slate-200 group-hover:text-indigo-500'}`}>
                  {faq.question}
                </span>
                <span className={`material-symbols-outlined transition-transform duration-300 ${activeFaq === index ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`}>
                  expand_more
                </span>
              </button>
              
              {activeFaq === index && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="h-px bg-slate-200 dark:bg-white/5 mb-4"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium capitalize-first">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Banner */}
      <div className="p-10 bg-slate-900 dark:bg-slate-900 rounded-[40px] border border-white/10 text-center space-y-6 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-[120px] text-white">mail</span>
         </div>
         <h3 className="text-2xl font-black text-white relative z-10">Bạn vẫn còn thắc mắc?</h3>
         <p className="text-[13px] text-slate-400 font-bold max-w-md mx-auto relative z-10">Đừng ngần ngại liên hệ trực tiếp với chúng tôi. Chúng tôi sẽ phản hồi bạn trong vòng 24 giờ làm việc.</p>
         <div className="pt-4 relative z-10">
            <button className="px-10 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-2xl shadow-white/10">
               GỬI EMAIL HỖ TRỢ
            </button>
         </div>
      </div>
    </div>
  );
}
