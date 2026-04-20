"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  fetchDocument, 
  fetchDocumentQuiz, 
  fetchDocumentQuizStream,
  DocumentResponse 
} from "@/services/api.service";
import { QUIZ_PAGE_TEXTS } from "@/constants/texts";

interface QuizItem {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export default function InteractiveQuizPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;

  const [docData, setDocData] = useState<DocumentResponse | null>(null);
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User performance state
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true);
        const doc = await fetchDocument(documentId);
        setDocData(doc);

        // Try to fetch existing quiz or generate new one
        let data = await fetchDocumentQuiz(documentId);
        
        // If data is empty, it might be generating. We don't want to wait forever, 
        // but let's try streaming if empty as a fallback logic
        if (!data || data.length === 0) {
           let accumulated = "";
           await fetchDocumentQuizStream(documentId, (chunk) => {
             accumulated += chunk;
           });
           try {
             let jsonStr = accumulated.trim();
             if (jsonStr.includes("```json")) {
                jsonStr = jsonStr.split("```json")[1].split("```")[0];
             } else if (jsonStr.includes("```")) {
                jsonStr = jsonStr.split("```")[1].split("```")[0];
             }
             data = JSON.parse(jsonStr.trim());
           } catch (e) {
             console.error("Failed to parse streamed quiz", e);
           }
        }

        if (data && Array.isArray(data)) {
          setQuiz(data);
        } else {
          setError("Không thể tạo bộ câu hỏi trắc nghiệm cho tài liệu này.");
        }
      } catch (err: any) {
        console.error(err);
        setError("Đã xảy ra lỗi khi tải bài kiểm tra.");
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [documentId]);

  const handleSelectOption = (qIdx: number, oIdx: number) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
  };

  const handleSubmit = () => {
    if (Object.keys(userAnswers).length < quiz.length) {
      if (!confirm(QUIZ_PAGE_TEXTS.actions.confirmIncomplete)) return;
    }

    let correctCount = 0;
    quiz.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct_index) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <span className="material-symbols-outlined text-indigo-500 animate-pulse">quiz</span>
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{QUIZ_PAGE_TEXTS.status.loading.title}</h2>
          <p className="text-slate-500 text-sm">{QUIZ_PAGE_TEXTS.status.loading.desc}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl">error</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{error}</h2>
        <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">{QUIZ_PAGE_TEXTS.status.error.back}</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-4">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="hidden md:block">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-md">{docData?.file_name}</h1>
            <p className="text-[11px] font-bold text-indigo-500">{QUIZ_PAGE_TEXTS.header.badge}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSubmitted ? (
            <div className="flex items-center gap-3">
               <div className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[11px] font-bold">
                  {QUIZ_PAGE_TEXTS.header.scoreBadge(score, quiz.length)}
               </div>
               <button onClick={() => window.location.reload()} className="px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white rounded-full text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-all">
                  {QUIZ_PAGE_TEXTS.header.retake}
               </button>
            </div>
          ) : (
            <div className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">
               {QUIZ_PAGE_TEXTS.header.completed}: {Object.keys(userAnswers).length} / {quiz.length}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-6 pb-4 space-y-10">
        {isSubmitted && (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-200 dark:border-white/10 shadow-sm animate-in zoom-in-95 duration-500 flex flex-col md:flex-row items-center gap-8">
             <div className="relative">
                <svg className="w-24 h-24 transform -rotate-90">
                   <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-white/5" />
                   <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={263.8} strokeDashoffset={263.8 - (263.8 * score) / quiz.length} strokeLinecap="round" className="text-indigo-600 dark:text-indigo-400 transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-xl font-bold text-slate-900 dark:text-white">{Math.round((score / quiz.length) * 100)}%</span>
                </div>
             </div>
             <div className="flex-1 space-y-3 text-center md:text-left">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{QUIZ_PAGE_TEXTS.results.title}</h2>
                <p className="text-slate-600 dark:text-slate-400 text-base font-medium leading-relaxed">
                  {score === quiz.length 
                    ? QUIZ_PAGE_TEXTS.results.perfect 
                    : score > quiz.length / 2 
                      ? QUIZ_PAGE_TEXTS.results.good 
                      : QUIZ_PAGE_TEXTS.results.keepTrying}
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-1">
                   <div className="bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="font-bold text-[13px] text-emerald-700 dark:text-emerald-400">{score} {QUIZ_PAGE_TEXTS.results.correct}</span>
                   </div>
                   <div className="bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-100 dark:border-red-500/20 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="font-bold text-[13px] text-red-700 dark:text-red-400">{quiz.length - score} {QUIZ_PAGE_TEXTS.results.incorrect}</span>
                   </div>
                </div>
             </div>
          </div>
        )}

        <div className="space-y-8">
          {quiz.map((item, qIdx) => (
            <div key={qIdx} className={`space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[${qIdx * 100}ms]`}>
              <div className="flex items-start gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                  <span className="mr-2">
                    Câu {qIdx + 1}:
                  </span>
                  {item.question}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3 pl-0 md:pl-12">
                {item.options.map((opt, oIdx) => {
                  const isSelected = userAnswers[qIdx] === oIdx;
                  const isCorrect = oIdx === item.correct_index;
                  const showResult = isSubmitted;

                  let cardStyle = "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer";
                  if (isSelected && !showResult) cardStyle = "bg-white dark:bg-slate-900 border-indigo-500 ring-1 ring-indigo-500/10";
                  if (showResult) {
                    if (isCorrect) cardStyle = "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-500/50 cursor-default";
                    else if (isSelected && !isCorrect) cardStyle = "bg-red-50/50 dark:bg-red-500/5 border-red-500/50 cursor-default";
                    else cardStyle = "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 opacity-50 cursor-default";
                  }

                  return (
                    <div
                      key={oIdx}
                      onClick={() => handleSelectOption(qIdx, oIdx)}
                      className={`group p-3 md:p-3.5 rounded-xl border transition-all duration-200 flex items-center gap-4 ${cardStyle}`}
                    >
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        showResult 
                          ? (isCorrect ? "border-emerald-500 bg-emerald-500" : (isSelected ? "border-red-500 bg-red-500" : "border-slate-300 dark:border-white/10"))
                          : (isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300 dark:border-white/20 group-hover:border-indigo-400")
                      }`}>
                         {showResult ? (
                           isCorrect ? <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>
                           : isSelected ? <span className="material-symbols-outlined text-[12px] text-white font-bold">close</span>
                           : null
                         ) : (
                           isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                         )}
                      </div>
                      <span className={`text-[13px] font-medium leading-relaxed ${
                        showResult 
                          ? (isCorrect ? "text-emerald-700 dark:text-emerald-400" : (isSelected ? "text-red-700 dark:text-red-400" : "text-slate-400"))
                          : (isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300")
                      }`}>
                        {opt}
                      </span>
                    </div>
                  );
                })}

                {isSubmitted && (
                   <div className="mt-8 p-8 bg-indigo-50 dark:bg-indigo-500/5 rounded-[32px] border border-indigo-200/50 dark:border-indigo-500/20 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="flex items-center gap-3 mb-4">
                         <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">lightbulb</span>
                         </div>
                         <h4 className="text-[10px] font-bold text-indigo-500 uppercase">{QUIZ_PAGE_TEXTS.results.expertExplanation}</h4>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-loose text-base font-medium">
                        {item.explanation}
                      </p>
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!isSubmitted && (
          <div className="pt-4 text-center">
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all uppercase"
            >
              {QUIZ_PAGE_TEXTS.actions.submit}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
