import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchDocument, fetchDocumentQuiz, fetchDocumentQuizStream, QuotaError } from "@/services/api.service";
import ConfirmDialog from "@/components/ConfirmDialog";
import Button from "@/components/ui/Button";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { PageFrame, PageHeader, Surface, cx } from "@/components/ui/Premium";
import QuizOption from "@/components/quiz/QuizOption";
import QuizResultPanel from "@/components/quiz/QuizResultPanel";
import { getDocumentName } from "@/components/documents/documentUtils";
import { QUIZ_WORKSPACE_TEXTS } from "@/constants/texts";

const T = QUIZ_WORKSPACE_TEXTS;

function parseStreamedQuiz(text) {
  let jsonStr = text.trim();
  if (jsonStr.includes("```json")) {
    jsonStr = jsonStr.split("```json")[1].split("```")[0];
  } else if (jsonStr.includes("```")) {
    jsonStr = jsonStr.split("```")[1].split("```")[0];
  }
  return JSON.parse(jsonStr.trim());
}

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

export default function InteractiveQuizPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const abortRef = useRef(null);
  const [docData, setDocData] = useState(null);
  const [quiz, setQuiz] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [answers, setAnswers] = useState({});
  const [completed, setCompleted] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const score = useMemo(
    () => quiz.reduce((total, question, index) => total + (answers[index] === question.correct_index ? 1 : 0), 0),
    [answers, quiz]
  );
  const answeredCount = useMemo(
    () => quiz.reduce((total, _question, index) => total + (answers[index] !== undefined ? 1 : 0), 0),
    [answers, quiz]
  );
  const progress = quiz.length > 0 ? Math.round((answeredCount / quiz.length) * 100) : 0;
  const allAnswered = quiz.length > 0 && answeredCount === quiz.length;

  const loadQuiz = useCallback(
    async (force = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const isActive = () => abortRef.current === controller;

      setLoading(true);
      setError(null);
      setQuotaExceeded(false);
      setQuiz([]);
      setAnswers({});
      setCompleted(false);

      try {
        const doc = await fetchDocument(documentId);
        if (isActive()) setDocData(doc);

        let data = [];
        if (!force) data = await fetchDocumentQuiz(documentId, controller.signal);

        if (!Array.isArray(data) || data.length === 0) {
          let accumulated = "";
          await fetchDocumentQuizStream(
            documentId,
            (chunk) => {
              accumulated += chunk;
            },
            force,
            controller.signal
          );
          data = parseStreamedQuiz(accumulated);
        }

        if (!isActive()) return;
        const valid = Array.isArray(data)
          ? data.filter((item) => item?.question && Array.isArray(item?.options) && item.options.length > 0)
          : [];

        if (valid.length > 0) setQuiz(valid);
        else setError(T.errors.cannotGenerate);
      } catch (err) {
        if (err?.name === "AbortError" || !isActive()) return;
        if (err instanceof QuotaError) {
          setQuotaExceeded(true);
          return;
        }
        console.error(err);
        setError(T.errors.loadFailed);
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
    if (completed) return;
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
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

  if (loading) {
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

  if (quiz.length === 0) {
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
              <div className="mt-4 space-y-3">
                {quiz.map((question, index) => {
                  const correct = answers[index] === question.correct_index;
                  const userAnswer = question.options?.[answers[index]] || T.review.notSelected;
                  const correctAnswer = question.options?.[question.correct_index] || T.review.notSelected;
                  return (
                    <article key={index} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                      <div className="flex items-start gap-3">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${correct ? "bg-[var(--brand-success)]" : "bg-[var(--brand-rose)]"}`}>
                          <span className="material-symbols-outlined text-[15px]">{correct ? "check" : "close"}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[13px] font-semibold leading-6 text-[var(--foreground)]">{question.question}</h3>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <div
                              className={cx(
                                "rounded-[var(--radius-panel)] border p-3",
                                correct
                                  ? "border-[var(--success-border)] bg-[var(--success-soft)]"
                                  : "border-[var(--danger-border)] bg-[var(--danger-soft)]"
                              )}
                            >
                              <p className="text-[11px] font-bold text-[var(--muted)]">{T.review.yourAnswer}</p>
                              <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--foreground)]">{userAnswer}</p>
                            </div>
                            <div className="rounded-[var(--radius-panel)] border border-[var(--success-border)] bg-[var(--success-soft)] p-3">
                              <p className="text-[11px] font-bold text-[var(--muted)]">{T.review.correctAnswer}</p>
                              <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--foreground)]">{correctAnswer}</p>
                            </div>
                          </div>
                          {question.explanation && (
                            <div className="mt-3 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-3">
                              <p className="text-[11px] font-bold text-[var(--muted)]">{T.review.explanation}</p>
                              <p className="mt-1 text-[12px] font-medium leading-6 text-[var(--muted)]">{question.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
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
                    {T.question.answered(answeredCount, quiz.length)}
                  </p>
                  <h2 className="mt-2 text-[20px] font-bold leading-snug text-[var(--foreground)]">{T.question.listTitle}</h2>
                  <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--muted)]">{T.question.listSubtitle}</p>
                </div>
                <span className="w-fit rounded-[var(--radius-chip)] border border-[var(--border-subtle)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[10px] font-bold text-[var(--muted)]">
                  {T.question.completion(progress)}
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface)]">
                <div className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {quiz.map((question, questionIndex) => (
                <article key={questionIndex} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--muted)]">
                    {T.question.progress(questionIndex + 1, quiz.length)}
                  </p>
                  <h3 className="mt-2 text-[15px] font-semibold leading-7 text-[var(--foreground)]">{question.question}</h3>
                  <div className="mt-4 grid gap-2">
                    {question.options.map((option, optionIndex) => (
                      <QuizOption
                        key={optionIndex}
                        option={option}
                        index={optionIndex}
                        selected={answers[questionIndex] === optionIndex}
                        correct={optionIndex === question.correct_index}
                        checked={false}
                        disabled={false}
                        onSelect={() => handleSelect(questionIndex, optionIndex)}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <p className="text-[12px] font-semibold text-[var(--muted)]">
                {allAnswered ? T.question.answered(answeredCount, quiz.length) : T.question.unansweredHint}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <LiquidGlassButton icon="task_alt" onClick={handleSubmit} disabled={!allAnswered}>
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
