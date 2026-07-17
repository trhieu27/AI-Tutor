import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchDocument, fetchDocumentQuiz, streamDocumentQuiz, QuotaError } from "@/shared/services/api.service";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import Button from "@/shared/ui/Button";
import LiquidGlassButton from "@/shared/ui/LiquidGlassButton";
import { EmptyState, ErrorState } from "@/shared/ui/States";
import { PageFrame, PageHeader, Surface, cx } from "@/shared/ui/Premium";
import QuizOption from "@/features/user/components/quiz/QuizOption";
import QuizResultPanel from "@/features/user/components/quiz/QuizResultPanel";
import { getDocumentName } from "@/features/user/components/documents/documentUtils";
import { QUIZ_WORKSPACE_TEXTS } from "@/shared/constants/texts";

const T = QUIZ_WORKSPACE_TEXTS;

function QuizLoadingState() {
  return (
    <div
      className="flex min-h-[420px] flex-col items-center justify-center gap-4 px-6 py-14 text-center"
      role="status"
      aria-label={T.loading.title}
      aria-busy="true"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] text-[var(--brand-primary)] shadow-[var(--premium-shadow-sm)]">
        <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-[var(--border-subtle)] border-t-[var(--brand-primary)]" aria-hidden="true" />
      </span>
      <div className="max-w-md">
        <h3 className="text-[17px] font-semibold text-[var(--foreground)]">{T.loading.title}</h3>
        <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--muted)]">{T.loading.subtitle}</p>
      </div>
    </div>
  );
}

/** Skeleton hiển thị khi đang chờ câu hỏi tiếp theo */
function QuestionSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2">
        <div className="h-3 w-20 rounded bg-[var(--border-subtle)]" />
      </div>
      <div className="mt-3 h-5 w-3/4 rounded bg-[var(--border-subtle)]" />
      <div className="mt-4 space-y-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-4">
            <div className="h-7 w-7 shrink-0 rounded-lg bg-[var(--border-subtle)]" />
            <div className="h-4 flex-1 rounded bg-[var(--border-subtle)]" style={{ width: `${55 + i * 10}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Trang trắc nghiệm — sinh quiz từ tài liệu, chấm điểm và xem đáp án */
export default function QuizPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const abortRef = useRef(null);
  const [docData, setDocData] = useState(null);
  const [quiz, setQuiz] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [answers, setAnswers] = useState({});
  const [completed, setCompleted] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // Helper: get correct indices array (backward compat with correct_index)
  const getCorrectIndices = (q) => Array.isArray(q.correct_indices) ? q.correct_indices : (typeof q.correct_index === 'number' ? [q.correct_index] : [0]);
  const isMulti = (q) => getCorrectIndices(q).length > 1;

  const score = useMemo(
    () => quiz.reduce((total, question, index) => {
      const correct = getCorrectIndices(question);
      const userAns = answers[index];
      if (userAns === undefined) return total;
      if (isMulti(question)) {
        const userSet = Array.isArray(userAns) ? userAns : [];
        if (userSet.length !== correct.length) return total;
        return total + (correct.every(c => userSet.includes(c)) ? 1 : 0);
      }
      return total + (userAns === correct[0] ? 1 : 0);
    }, 0),
    [answers, quiz]
  );
  const answeredCount = useMemo(
    () => quiz.reduce((total, question, index) => {
      const ans = answers[index];
      if (ans === undefined) return total;
      if (isMulti(question)) return total + (Array.isArray(ans) && ans.length > 0 ? 1 : 0);
      return total + 1;
    }, 0),
    [answers, quiz]
  );
  const progress = quiz.length > 0 ? Math.round((answeredCount / quiz.length) * 100) : 0;
  const allAnswered = quiz.length > 0 && answeredCount === quiz.length;

  const isValidQuestion = (item) =>
    item?.question && Array.isArray(item?.options) && item.options.length > 0 &&
    (Array.isArray(item.correct_indices) || typeof item.correct_index === 'number');

  const loadQuiz = useCallback(
    async (force = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const isActive = () => abortRef.current === controller;

      setLoading(true);
      setIsStreaming(false);
      setError(null);
      setQuotaExceeded(false);
      setQuiz([]);
      setAnswers({});
      setCompleted(false);

      try {
        const doc = await fetchDocument(documentId);
        if (isActive()) setDocData(doc);

        // Thử lấy quiz cached (không stream)
        let data = [];
        if (!force) data = await fetchDocumentQuiz(documentId, controller.signal);

        if (Array.isArray(data) && data.length > 0) {
          // Có cache — hiển thị ngay
          if (!isActive()) return;
          const valid = data.filter(isValidQuestion);
          if (valid.length > 0) setQuiz(valid);
          else setError(T.errors.cannotGenerate);
        } else {
          // Không có cache — stream progressive
          if (!isActive()) return;
          setIsStreaming(true);
          setLoading(false);

          await streamDocumentQuiz(
            documentId,
            {
              onQuestion: (question) => {
                if (!isActive()) return;
                if (isValidQuestion(question)) {
                  setQuiz(prev => [...prev, question]);
                }
              },
              onDone: (allQuestions) => {
                if (!isActive()) return;
                // Đảm bảo state cuối cùng chính xác
                const valid = (allQuestions || []).filter(isValidQuestion);
                if (valid.length > 0) setQuiz(valid);
                else setError(T.errors.cannotGenerate);
                setIsStreaming(false);
              },
            },
            force,
            controller.signal
          );
        }
      } catch (err) {
        if (err?.name === "AbortError" || !isActive()) return;
        if (err instanceof QuotaError) {
          setQuotaExceeded(true);
          return;
        }
        console.error(err);
        setError(T.errors.loadFailed);
        setIsStreaming(false);
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [documentId]
  );

  useEffect(() => {
    loadQuiz();
    return () => abortRef.current?.abort();
  }, [loadQuiz]);

  const handleSelect = (questionIndex, optionIndex) => {
    if (completed || isStreaming) return;
    const question = quiz[questionIndex];
    if (isMulti(question)) {
      setAnswers((prev) => {
        const current = Array.isArray(prev[questionIndex]) ? [...prev[questionIndex]] : [];
        const idx = current.indexOf(optionIndex);
        if (idx >= 0) current.splice(idx, 1);
        else current.push(optionIndex);
        return { ...prev, [questionIndex]: current };
      });
    } else {
      setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
    }
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    setCompleted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetake = () => {
    setAnswers({});
    setCompleted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading && !isStreaming) {
    return (
      <PageFrame narrow>
        <QuizLoadingState />
      </PageFrame>
    );
  }

  if (isStreaming && quiz.length === 0) {
    return (
      <PageFrame narrow>
        <QuizLoadingState />
      </PageFrame>
    );
  }

  if (quotaExceeded) {
    return (
      <PageFrame narrow>
        <ErrorState
          icon="bolt"
          title={T.quota.title}
          subtitle={T.quota.subtitle}
          action={<Button to="/pricing" icon="workspace_premium">{T.quota.action}</Button>}
        />
      </PageFrame>
    );
  }

  if (error) {
    return (
      <PageFrame narrow>
        <ErrorState
          title={error}
          subtitle={T.errorState.subtitle}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon="refresh" onClick={() => loadQuiz(true)}>
                {T.errorState.regenerate}
              </Button>
              <Button variant="secondary" icon="arrow_back" onClick={() => navigate("/practice")}>
                {T.errorState.back}
              </Button>
            </div>
          }
        />
      </PageFrame>
    );
  }

  if (quiz.length === 0 && !isStreaming) {
    return (
      <PageFrame narrow>
        <EmptyState
          icon="quiz"
          title={T.empty.title}
          subtitle={T.empty.subtitle}
          action={<Button to="/practice" icon="arrow_back">{T.empty.action}</Button>}
        />
      </PageFrame>
    );
  }

  return (
    <>
      <PageFrame className="space-y-6" narrow>
        <PageHeader
          icon="quiz"
          title={T.header.title}
          subtitle={docData ? getDocumentName(docData) : T.header.fallbackDocument}
          actions={
            <>
              <Button variant="secondary" icon="forum" to={`/chat/${documentId}`}>
                {T.header.chat}
              </Button>
              <Button variant="outline" icon="refresh" onClick={() => setShowRegenConfirm(true)}>
                {T.header.regenerate}
              </Button>
            </>
          }
        />

        {completed ? (
          <>
            <QuizResultPanel
              score={score}
              total={quiz.length}
              onRetake={handleRetake}
            />
            <Surface className="p-4 sm:p-5">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{T.review.title}</h2>
              <div className="mt-4 space-y-4">
                {quiz.map((question, index) => {
                  const correctIndices = getCorrectIndices(question);
                  const multi = isMulti(question);
                  const userAns = answers[index];
                  const isCorrect = multi
                    ? (Array.isArray(userAns) && userAns.length === correctIndices.length && correctIndices.every(c => userAns.includes(c)))
                    : userAns === correctIndices[0];
                  return (
                    <article key={index} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white ${isCorrect ? "bg-[var(--brand-success)]" : "bg-[var(--brand-rose)]"}`}>
                          <span className="material-symbols-outlined text-[14px]">{isCorrect ? "check" : "close"}</span>
                        </span>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--muted)]">
                          {T.question.progress(index + 1, quiz.length)}
                        </p>
                        {multi && <span className="rounded-[var(--radius-chip)] border border-[var(--border-subtle)] bg-[var(--card-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand-secondary)]">{T.question.multiSelectHint}</span>}
                      </div>
                      <h3 className="mt-2 text-[14px] font-semibold leading-7 text-[var(--foreground)]">{question.question}</h3>
                      <div className="mt-3 grid gap-2">
                        {question.options.map((option, optionIndex) => (
                          <QuizOption
                            key={optionIndex}
                            option={option}
                            index={optionIndex}
                            selected={multi ? (Array.isArray(userAns) && userAns.includes(optionIndex)) : userAns === optionIndex}
                            correct={correctIndices.includes(optionIndex)}
                            checked={true}
                            disabled={true}
                            multi={multi}
                            onSelect={() => {}}
                          />
                        ))}
                      </div>
                      {question.explanation && (
                        <div className="mt-3 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-[var(--brand-secondary)]">lightbulb</span>
                            <p className="text-[11px] font-bold text-[var(--muted)]">{T.review.explanation}</p>
                          </div>
                          <p className="mt-1.5 text-[12px] font-medium leading-6 text-[var(--muted)]">{question.explanation}</p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </Surface>
          </>
        ) : (
          <Surface className="overflow-hidden">
            <div className="border-b border-[var(--border-subtle)] p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--muted)]">
                    {isStreaming
                      ? `Đang tạo · ${quiz.length} câu`
                      : T.question.answered(answeredCount, quiz.length)}
                  </p>
                  <h2 className="mt-2 text-[20px] font-bold leading-snug text-[var(--foreground)]">{T.question.listTitle}</h2>
                  <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--muted)]">{T.question.listSubtitle}</p>
                </div>
                {!isStreaming && (
                  <span className="w-fit rounded-[var(--radius-chip)] border border-[var(--border-subtle)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[10px] font-bold text-[var(--muted)]">
                    {T.question.completion(progress)}
                  </span>
                )}
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface)]">
                {isStreaming ? (
                  <div className="h-full w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite] rounded-full bg-[var(--brand-primary)]" />
                ) : (
                  <div className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
                )}
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {quiz.map((question, questionIndex) => {
                const multi = isMulti(question);
                const correctIndices = getCorrectIndices(question);
                const userAns = answers[questionIndex];
                return (
                  <article key={questionIndex} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--muted)]">
                        {T.question.progress(questionIndex + 1, quiz.length)}
                      </p>
                      {multi && <span className="rounded-[var(--radius-chip)] border border-[var(--border-subtle)] bg-[var(--card-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand-secondary)]">{T.question.multiSelectHint}</span>}
                    </div>
                    <h3 className="mt-2 text-[15px] font-semibold leading-7 text-[var(--foreground)]">{question.question}</h3>
                    <div className="mt-4 grid gap-2">
                      {question.options.map((option, optionIndex) => (
                        <QuizOption
                          key={optionIndex}
                          option={option}
                          index={optionIndex}
                          selected={multi ? (Array.isArray(userAns) && userAns.includes(optionIndex)) : userAns === optionIndex}
                          correct={correctIndices.includes(optionIndex)}
                          checked={false}
                          disabled={isStreaming}
                          multi={multi}
                          onSelect={() => handleSelect(questionIndex, optionIndex)}
                        />
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Skeleton cho câu hỏi tiếp theo khi đang stream */}
            {isStreaming && (
              <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                <QuestionSkeleton />
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <p className="text-[12px] font-semibold text-[var(--muted)]">
                {isStreaming
                  ? `Đang tạo câu hỏi... (${quiz.length} câu)`
                  : allAnswered ? T.question.answered(answeredCount, quiz.length) : T.question.unansweredHint}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <LiquidGlassButton icon="task_alt" onClick={handleSubmit} disabled={!allAnswered || isStreaming}>
                  {T.question.submit}
                </LiquidGlassButton>
              </div>
            </div>
          </Surface>
        )}
      </PageFrame>

      <ConfirmDialog
        open={showRegenConfirm}
        title={T.confirm.title}
        message={T.confirm.message}
        confirmLabel={T.confirm.confirm}
        cancelLabel={T.confirm.cancel}
        variant="info"
        onConfirm={() => {
          setShowRegenConfirm(false);
          loadQuiz(true);
        }}
        onCancel={() => setShowRegenConfirm(false)}
      />
    </>
  );
}
