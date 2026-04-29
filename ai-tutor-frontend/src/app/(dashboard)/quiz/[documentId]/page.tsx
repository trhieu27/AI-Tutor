"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchDocument,
  fetchDocumentQuiz,
  fetchDocumentQuizStream,
  QuotaError,
  DocumentResponse
} from "@/services/api.service";
import { QUIZ_PAGE_TEXTS, QUOTA_TEXTS } from "@/constants/texts";
import ConfirmDialog from "@/components/ConfirmDialog";

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
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // User performance state
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Confirm dialogs
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // AbortController — hủy stream khi chuyển trang hoặc tạo lại
  const abortRef = useRef<AbortController | null>(null);

  const loadQuiz = async (force = false) => {
    // Hủy request cũ nếu đang chạy
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Helper: chỉ apply state nếu request này vẫn là active
    const isActive = () => abortRef.current === controller;

    setLoading(true);
    setError(null);
    setQuiz([]);
    setUserAnswers({});
    setIsSubmitted(false);
    setScore(0);

    try {
      if (!docData) {
        const doc = await fetchDocument(documentId);
        if (isActive()) setDocData(doc);
      }

      let data: QuizItem[] = [];

      if (!force) {
        data = await fetchDocumentQuiz(documentId, controller.signal);
      }

      if (!data || data.length === 0) {
        let accumulated = "";
        await fetchDocumentQuizStream(documentId, (chunk) => {
          accumulated += chunk;
        }, force, controller.signal);
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

      if (!isActive()) return; // request bị huỷ sau khi fetch xong

      if (data && Array.isArray(data) && data.length > 0) {
        setQuiz(data);
      } else {
        setError("Không thể tạo bộ câu hỏi trắc nghiệm cho tài liệu này.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return; // bị huỷ chủ động — không cập nhật UI
      if (!isActive()) return;
      if (err instanceof QuotaError) {
        setQuotaExceeded(true);
        return;
      }
      console.error(err);
      setError("Đã xảy ra lỗi khi tải bài kiểm tra.");
    } finally {
      // Chỉ tắt loading nếu đây vẫn là request mới nhất
      if (isActive()) setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const doc = await fetchDocument(documentId);
      setDocData(doc);
      await loadQuiz();
    };
    init();

    // Cleanup: hủy stream khi rời trang (tránh tốn token)
    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const handleSelectOption = (qIdx: number, oIdx: number) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
  };

  const handleSubmit = () => {
    if (Object.keys(userAnswers).length < quiz.length) {
      setShowSubmitConfirm(true);
      return;
    }
    doSubmit();
  };

  const doSubmit = () => {
    let correctCount = 0;
    quiz.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct_index) correctCount++;
    });
    setScore(correctCount);
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Loading state ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-6 bg-[var(--card-bg)] backdrop-blur-xl px-14 py-10 rounded-[28px] border border-[var(--border-color)] shadow-[0_8px_32px_hsl(222_47%_4%/0.08)]">
          {/* Icon */}
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-40"
              style={{ background: "radial-gradient(circle, hsl(38 92% 50%) 0%, hsl(27 96% 54%) 100%)" }}
            />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(38_92%_50%)] to-[hsl(27_80%_45%)] flex items-center justify-center shadow-[0_4px_16px_hsl(38_92%_50%/0.30)]">
              <span className="material-symbols-outlined icon-thin text-white text-[26px]">quiz</span>
            </div>
          </div>
          {/* Text */}
          <div className="text-center space-y-1.5">
            <p className="text-[13px] font-bold text-[var(--foreground)]">{QUIZ_PAGE_TEXTS.status.loading.title}</p>
            <p className="text-[11px] text-[var(--muted)] font-medium">{QUIZ_PAGE_TEXTS.status.loading.desc}</p>
          </div>
          {/* Jumping dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[hsl(38_92%_50%)] animate-jumping-dot"
                style={{ animationDelay: `${i * 0.16}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Quota exceeded state ───────────────────────────────── */
  if (quotaExceeded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-3xl flex items-center justify-center mb-6 border border-amber-400/20">
          <span className="material-symbols-outlined text-[36px] text-amber-500">bolt</span>
        </div>
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">{QUOTA_TEXTS.exceeded.title}</h2>
        <p className="text-[var(--muted)] text-[13px] mb-1">{QUOTA_TEXTS.exceeded.ai}</p>
        <p className="text-[var(--muted-light)] text-[12px] mb-6">{QUOTA_TEXTS.exceeded.desc}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/settings")}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white text-[13px] font-bold hover:opacity-90 transition-all active:scale-95 shadow-[0_4px_16px_hsl(239_68%_58%/0.3)]"
          >
            {QUOTA_TEXTS.exceeded.upgradeBtn}
          </button>
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--muted)] text-[13px] font-bold border border-[var(--border-color)] hover:bg-[var(--card-bg)] transition-all active:scale-95"
          >
            {QUIZ_PAGE_TEXTS.status.error.back}
          </button>
        </div>
      </div>
    );
  }

  /* ── Error state ─────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
        <div className="w-20 h-20 bg-[hsl(343_85%_58%/0.08)] text-[hsl(343_72%_48%)] rounded-3xl flex items-center justify-center mb-6 border border-[hsl(343_85%_58%/0.15)]">
          <span className="material-symbols-outlined icon-thin text-[36px]">error</span>
        </div>
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">{error}</h2>
        <p className="text-[var(--muted)] text-[13px] mb-6">Vui lòng thử tạo lại hoặc quay về</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadQuiz(true)}
            className="px-5 py-2.5 rounded-xl bg-[hsl(239_68%_58%)] text-white text-[13px] font-bold hover:bg-[hsl(239_55%_50%)] transition-all active:scale-95"
          >
            Tạo lại
          </button>
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--muted)] text-[13px] font-bold border border-[var(--border-color)] hover:bg-[var(--card-bg)] transition-all active:scale-95"
          >
            {QUIZ_PAGE_TEXTS.status.error.back}
          </button>
        </div>
      </div>
    );
  }

  /* ── Main quiz ──────────────────────────────────────────── */
  return (
    <>
    <div className="min-h-screen bg-[var(--background)] pb-12">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-[var(--header-bg)] backdrop-blur-xl border-b border-[var(--border-color)] px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all active:scale-90"
          >
            <span className="material-symbols-outlined icon-thin text-[20px]">arrow_back</span>
          </button>
          <div className="hidden md:block">
            <h1 className="text-[13px] font-bold text-[var(--foreground)] truncate max-w-md leading-none">{docData?.file_name}</h1>
            <p className="text-[10px] font-bold text-[hsl(239_55%_50%)] mt-0.5">{QUIZ_PAGE_TEXTS.header.badge}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Regenerate button — luôn hiện */}
          <button
            onClick={() => setShowRegenConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-[var(--muted)] hover:text-[hsl(343_72%_48%)] hover:border-[hsl(343_85%_58%/0.25)] hover:bg-[hsl(343_85%_58%/0.04)] text-[11px] font-bold transition-all active:scale-95"
            title="Tạo lại bài kiểm tra mới"
          >
            <span className="material-symbols-outlined icon-thin text-[14px]">refresh</span>
            Tạo lại
          </button>

          {isSubmitted ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-[hsl(239_68%_58%)] text-white rounded-xl text-[11px] font-bold">
                {QUIZ_PAGE_TEXTS.header.scoreBadge(score, quiz.length)}
              </div>
              <button
                onClick={() => { setIsSubmitted(false); setUserAnswers({}); window.scrollTo({ top: 0 }); }}
                className="px-3 py-1.5 bg-[var(--surface)] text-[var(--muted)] rounded-xl text-[11px] font-bold hover:bg-[var(--card-bg)] border border-[var(--border-color)] transition-all active:scale-95"
              >
                {QUIZ_PAGE_TEXTS.header.retake}
              </button>
            </div>
          ) : (
            <div className="text-[11px] font-bold text-[var(--muted)] bg-[var(--surface)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
              {QUIZ_PAGE_TEXTS.header.completed}: {Object.keys(userAnswers).length} / {quiz.length}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-8 pb-4 space-y-10">
        {/* Score summary card */}
        {isSubmitted && (
          <div className="bg-[var(--card-bg)] rounded-3xl p-8 border border-[var(--border-color)] shadow-sm flex flex-col md:flex-row items-center gap-8">
            <div className="relative shrink-0">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-[var(--surface)]" />
                <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="transparent"
                  strokeDasharray={263.8}
                  strokeDashoffset={263.8 - (263.8 * score) / quiz.length}
                  strokeLinecap="round"
                  className="text-[hsl(239_68%_58%)] transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-[var(--foreground)]">{Math.round((score / quiz.length) * 100)}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-3 text-center md:text-left">
              <h2 className="font-display text-2xl text-[hsl(222_47%_10%)] dark:text-white">{QUIZ_PAGE_TEXTS.results.title}</h2>
              <p className="text-[var(--muted)] text-[14px] font-medium leading-relaxed">
                {score === quiz.length
                  ? QUIZ_PAGE_TEXTS.results.perfect
                  : score > quiz.length / 2
                    ? QUIZ_PAGE_TEXTS.results.good
                    : QUIZ_PAGE_TEXTS.results.keepTrying}
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-1">
                <div className="bg-[hsl(158_64%_44%/0.08)] px-3 py-1.5 rounded-xl border border-[hsl(158_64%_44%/0.20)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[hsl(158_64%_44%)]" />
                  <span className="font-bold text-[12px] text-[hsl(158_55%_36%)]">{score} {QUIZ_PAGE_TEXTS.results.correct}</span>
                </div>
                <div className="bg-[hsl(343_85%_58%/0.08)] px-3 py-1.5 rounded-xl border border-[hsl(343_85%_58%/0.20)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[hsl(343_85%_58%)]" />
                  <span className="font-bold text-[12px] text-[hsl(343_72%_48%)]">{quiz.length - score} {QUIZ_PAGE_TEXTS.results.incorrect}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-8">
          {quiz.map((item, qIdx) => (
            <div key={qIdx} className="space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--foreground)] leading-snug">
                <span className="text-[hsl(239_55%_50%)] mr-2">Câu {qIdx + 1}:</span>
                {item.question}
              </h3>

              <div className="grid grid-cols-1 gap-2.5 md:pl-10">
                {item.options.map((opt, oIdx) => {
                  const isSelected = userAnswers[qIdx] === oIdx;
                  const isCorrect = oIdx === item.correct_index;
                  const showResult = isSubmitted;

                  let cardCls = "bg-[var(--card-bg)] border-[var(--border-color)] hover:border-[hsl(239_68%_58%/0.40)] cursor-pointer";
                  if (isSelected && !showResult) cardCls = "bg-[hsl(239_68%_58%/0.05)] border-[hsl(239_68%_58%)] ring-1 ring-[hsl(239_68%_58%/0.10)]";
                  if (showResult) {
                    if (isCorrect) cardCls = "bg-[hsl(158_64%_44%/0.06)] border-[hsl(158_64%_44%/0.40)] cursor-default";
                    else if (isSelected) cardCls = "bg-[hsl(343_85%_58%/0.06)] border-[hsl(343_85%_58%/0.40)] cursor-default";
                    else cardCls = "bg-[var(--card-bg)] border-[var(--border-subtle)] opacity-50 cursor-default";
                  }

                  return (
                    <div
                      key={oIdx}
                      onClick={() => handleSelectOption(qIdx, oIdx)}
                      className={`group p-3.5 rounded-xl border transition-all duration-200 flex items-center gap-3.5 ${cardCls}`}
                    >
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        showResult
                          ? (isCorrect ? "border-[hsl(158_64%_44%)] bg-[hsl(158_64%_44%)]" : isSelected ? "border-[hsl(343_85%_58%)] bg-[hsl(343_85%_58%)]" : "border-[var(--border-color)]")
                          : (isSelected ? "border-[hsl(239_68%_58%)] bg-[hsl(239_68%_58%)]" : "border-[var(--border-color)] group-hover:border-[hsl(239_68%_58%/0.50)]")
                      }`}>
                        {showResult ? (
                          isCorrect ? <span className="material-symbols-outlined text-[12px] text-white">check</span>
                          : isSelected ? <span className="material-symbols-outlined text-[12px] text-white">close</span>
                          : null
                        ) : (
                          isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span className={`text-[13px] font-medium leading-relaxed ${
                        showResult
                          ? (isCorrect ? "text-[hsl(158_55%_36%)]" : isSelected ? "text-[hsl(343_72%_48%)]" : "text-[var(--muted)]")
                          : (isSelected ? "text-[hsl(239_55%_50%)]" : "text-[var(--foreground)]")
                      }`}>
                        {opt}
                      </span>
                    </div>
                  );
                })}

                {/* Explanation */}
                {isSubmitted && (
                  <div className="mt-4 p-5 bg-[hsl(239_68%_58%/0.05)] rounded-2xl border border-[hsl(239_68%_58%/0.15)]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-[hsl(239_68%_58%/0.10)] text-[hsl(239_55%_50%)] flex items-center justify-center">
                        <span className="material-symbols-outlined icon-thin text-[16px]">lightbulb</span>
                      </div>
                      <h4 className="text-[10px] font-bold text-[hsl(239_55%_50%)] uppercase tracking-wider">{QUIZ_PAGE_TEXTS.results.expertExplanation}</h4>
                    </div>
                    <p className="text-[var(--foreground)] text-[13px] leading-loose font-medium">{item.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Submit button */}
        {!isSubmitted && (
          <div className="pt-4 text-center">
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-gradient-to-br from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white rounded-2xl font-bold text-[13px] shadow-[0_4px_16px_hsl(239_68%_58%/0.25)] hover:scale-105 active:scale-95 transition-all"
            >
              {QUIZ_PAGE_TEXTS.actions.submit}
            </button>
          </div>
        )}
      </main>
    </div>

    {/* ── Confirm: nộp bài khi chưa trả lời hết ─── */}
    <ConfirmDialog
      open={showSubmitConfirm}
      title="Nộp bài chưa hoàn thành"
      message={`Bạn còn ${quiz.length - Object.keys(userAnswers).length} câu chưa trả lời. Bạn có chắc muốn nộp bài không?`}
      confirmLabel="Nộp bài"
      cancelLabel="Tiếp tục làm"
      variant="warning"
      onConfirm={() => { setShowSubmitConfirm(false); doSubmit(); }}
      onCancel={() => setShowSubmitConfirm(false)}
    />

    {/* ── Confirm: tạo lại bài kiểm tra ─── */}
    <ConfirmDialog
      open={showRegenConfirm}
      title="Tạo lại bài kiểm tra"
      message="AI sẽ tạo một bộ câu hỏi mới hoàn toàn khác. Tiến trình làm bài hiện tại sẽ bị mất."
      confirmLabel="Tạo lại"
      cancelLabel="Giữ lại"
      variant="info"
      onConfirm={() => { setShowRegenConfirm(false); loadQuiz(true); }}
      onCancel={() => setShowRegenConfirm(false)}
    />
    </>
  );
}
