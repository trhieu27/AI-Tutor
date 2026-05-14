import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDocuments } from "@/context/DocumentContext";
import { fetchRecentChatSessions } from "@/services/api.service";
import { DASHBOARD_WORKSPACE_TEXTS } from "@/constants/texts";
import Button from "@/components/ui/Button";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/States";
import { PageFrame, StatCard, Surface, cx } from "@/components/ui/Premium";
import {
  getDocumentDate,
  getDocumentExt,
  getDocumentIcon,
  getDocumentName,
  getDocumentPages,
  normalizeDocumentStatus,
} from "@/components/documents/documentUtils";

const T = DASHBOARD_WORKSPACE_TEXTS;

const STEP_STYLES = {
  done: "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--brand-success)]",
  active: "border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--brand-secondary)]",
  locked: "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--muted)]",
};

const TONE_STYLES = {
  green: "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--brand-primary)]",
  blue: "border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--brand-secondary)]",
  warm: "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--brand-warm)]",
  rose: "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--brand-rose)]",
};

function getSessionTarget(session) {
  const documentId = session?.documentId || session?.document_id;
  const sessionId = session?.sessionId || session?.id;
  if (!documentId) return "/chat";
  return sessionId ? `/chat/${documentId}?session=${sessionId}` : `/chat/${documentId}`;
}

function formatSessionTime(value) {
  if (!value) return "Vừa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa cập nhật";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProgressStep({ index, icon, title, meta, state }) {
  return (
    <li
      className={cx(
        "grid grid-cols-[auto_1fr] gap-3 rounded-[var(--radius-panel)] border p-3",
        STEP_STYLES[state] || STEP_STYLES.locked
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-chip)] border border-current/20 bg-[var(--card-bg)]">
        <span className="material-symbols-outlined icon-thin text-[17px]" aria-hidden="true">
          {icon}
        </span>
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-current/75">0{index}</span>
          <span className="truncate text-[12px] font-bold text-[var(--foreground)]">{title}</span>
        </div>
        <p className="mt-1 truncate text-[11px] font-medium text-[var(--muted)]">{meta}</p>
      </div>
    </li>
  );
}

function RecentDocument({ doc }) {
  return (
    <Link
      to={doc.status === "READY" ? `/chat/${doc.id}` : "/learning"}
      className="flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-3 transition hover:border-[var(--border-emphasis)] hover:bg-[var(--card-bg-hover)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--card-bg)] text-[var(--brand-primary)]">
        <span className="material-symbols-outlined icon-thin text-[19px]">{getDocumentIcon(doc)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-[var(--foreground)]">{getDocumentName(doc)}</span>
        <span className="mt-0.5 block truncate text-[11px] font-medium text-[var(--muted)]">
          {getDocumentExt(doc)} · {getDocumentPages(doc)} · {getDocumentDate(doc)}
        </span>
      </span>
      <span className="hidden shrink-0 md:block">
        <StatusBadge status={normalizeDocumentStatus(doc.status)} />
      </span>
    </Link>
  );
}

function SessionRow({ session }) {
  const documentName = session.documentName || session.document_name || "Tài liệu";
  return (
    <Link
      to={getSessionTarget(session)}
      className="group flex items-center gap-3 rounded-[var(--radius-panel)] border border-[color:var(--border-subtle)] bg-[var(--surface)] p-3 transition hover:border-[color:var(--border-emphasis)] hover:bg-[var(--card-bg-hover)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--brand-secondary)]">
        <span className="material-symbols-outlined icon-thin text-[19px]" aria-hidden="true">
          forum
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-[var(--foreground)]">
          {session.title || "Cuộc trò chuyện"}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-medium text-[var(--muted)]">
          {documentName} · {formatSessionTime(session.updatedAt || session.updated_at)}
        </span>
      </span>
    </Link>
  );
}

function LearningContextSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label={T.context.loadingTitle} aria-busy="true">
      <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-[var(--radius-panel)]" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-8 w-24 shrink-0 rounded-[var(--radius-chip)]" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Skeleton className="h-9 rounded-[var(--radius-control)]" />
          <Skeleton className="h-9 rounded-[var(--radius-control)]" />
          <Skeleton className="h-9 rounded-[var(--radius-control)]" />
        </div>
      </div>
      <Skeleton className="h-14 rounded-[var(--radius-panel)]" />
    </div>
  );
}

function ReadyDocumentPanel({ document }) {
  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--brand-primary)]">
            <span className="material-symbols-outlined icon-thin text-[21px]" aria-hidden="true">
              {getDocumentIcon(document)}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-[var(--foreground)]">{getDocumentName(document)}</p>
            <p className="mt-1 truncate text-[11px] font-medium text-[var(--muted)]">
              {T.context.readyMeta(getDocumentPages(document))} · {getDocumentDate(document)}
            </p>
          </div>
          <StatusBadge status="ready" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button to={`/chat/${document.id}`} icon="forum" size="sm" className="w-full">
            {T.context.chat}
          </Button>
          <Button to={`/quiz/${document.id}`} variant="secondary" icon="quiz" size="sm" className="w-full">
            Trắc nghiệm
          </Button>
          <Button to={`/mindmap/${document.id}`} variant="outline" icon="account_tree" size="sm" className="w-full">
            Sơ đồ
          </Button>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-[var(--radius-panel)] border border-dashed border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2.5 text-[11px] font-medium leading-5 text-[var(--muted)]">
        <span className="material-symbols-outlined icon-thin mt-0.5 text-[16px] text-[var(--brand-primary)]" aria-hidden="true">
          auto_awesome
        </span>
        <span>Tài liệu đã sẵn sàng. Bắt đầu hỏi AI hoặc tạo một bài ôn tập ngắn để giữ nhịp học.</span>
      </div>
    </div>
  );
}

function EmptyLearningPanel() {
  return (
    <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--border-color)] bg-[var(--surface)] px-4 py-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--muted)]">
        <span className="material-symbols-outlined icon-thin text-[25px]" aria-hidden="true">
          library_add
        </span>
      </span>
      <h3 className="mt-3 text-[15px] font-bold text-[var(--foreground)]">{T.context.emptyTitle}</h3>
      <p className="mx-auto mt-2 max-w-sm text-[12px] font-medium leading-6 text-[var(--muted)]">
        {T.context.emptySubtitle}
      </p>
    </div>
  );
}

function QuickAction({ icon, title, meta, to, tone = "green" }) {
  return (
    <Link
      to={to}
      className="group flex min-h-[112px] min-w-0 flex-col items-start justify-between gap-3 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--border-emphasis)] hover:bg-[var(--card-bg-hover)] hover:shadow-[var(--premium-shadow-sm)] sm:min-h-[76px] sm:flex-row sm:items-center sm:justify-start"
    >
      <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-panel)] border sm:h-10 sm:w-10", TONE_STYLES[tone])}>
        <span className="material-symbols-outlined icon-thin text-[18px] sm:text-[19px]" aria-hidden="true">
          {icon}
        </span>
      </span>
      <span className="block w-full min-w-0 flex-1 overflow-hidden">
        <span className="block truncate text-[12px] font-bold leading-4 text-[var(--foreground)] sm:text-[13px]">{title}</span>
        <span className="mt-1 block w-full min-w-0 truncate text-[11px] font-medium leading-4 text-[var(--muted)] sm:mt-0.5 sm:leading-normal">{meta}</span>
      </span>
    </Link>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { documents, loading } = useDocuments();
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentSessionsLoading, setRecentSessionsLoading] = useState(true);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("action") === "upload") {
      navigate("/learning?action=upload", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    setRecentSessionsLoading(true);
    fetchRecentChatSessions(5)
      .then((sessions) => {
        if (active) setRecentSessions(sessions);
      })
      .catch(() => {
        if (active) setRecentSessions([]);
      })
      .finally(() => {
        if (active) setRecentSessionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const ready = documents.filter((doc) => doc.status === "READY").length;
    const processing = documents.filter((doc) => doc.status === "PROCESSING" || doc.status === "UPLOADING").length;
    const failed = documents.filter((doc) => doc.status === "FAILED").length;
    const pages = documents.reduce((sum, doc) => sum + (Number(doc.page_count) || 0), 0);
    return { ready, processing, failed, pages };
  }, [documents]);

  const readyDocuments = useMemo(
    () =>
      documents
        .filter((doc) => doc.status === "READY")
        .sort((a, b) => new Date(b.uploaded_at || b.uploadedAt) - new Date(a.uploaded_at || a.uploadedAt)),
    [documents]
  );
  const recentDocuments = useMemo(
    () =>
      [...documents]
        .sort((a, b) => new Date(b.uploaded_at || b.uploadedAt) - new Date(a.uploaded_at || a.uploadedAt))
        .slice(0, 4),
    [documents]
  );

  const latestReady = readyDocuments[0];
  const latestSession = recentSessions[0];
  const continueTarget = latestSession?.documentId
    ? getSessionTarget(latestSession)
    : latestReady
      ? `/chat/${latestReady.id}`
      : "/learning?action=upload";
  const hasDocuments = documents.length > 0;
  const primaryCtaLabel = latestReady || latestSession ? T.hero.continue : T.hero.upload;
  const primaryCtaIcon = latestReady || latestSession ? "play_arrow" : "upload_file";
  const studySteps = [
    {
      icon: "upload_file",
      title: "Nguồn học",
      meta: hasDocuments ? "Thư viện đã có tài liệu để khai thác" : "Thêm PDF, DOC hoặc DOCX đầu tiên",
      state: hasDocuments ? "done" : "active",
    },
    {
      icon: "forum",
      title: "Trao đổi",
      meta: recentSessions.length > 0 ? "Có phiên hỏi đáp để quay lại" : latestReady ? "Mở câu hỏi từ tài liệu" : "Chờ tài liệu sẵn sàng",
      state: recentSessions.length > 0 ? "done" : latestReady ? "active" : "locked",
    },
    {
      icon: "school",
      title: "Ghi nhớ",
      meta: latestReady ? "Ôn bằng câu hỏi hoặc sơ đồ" : "Mở sau khi xử lý hoàn tất",
      state: latestReady ? "active" : "locked",
    },
  ];
  const actionTarget = latestReady ? latestReady.id : null;
  const quickActions = [
    {
      icon: "upload_file",
      title: T.actions.upload,
      meta: hasDocuments ? "Thêm tài liệu mới vào thư viện" : "Tạo điểm bắt đầu cho phiên học",
      to: "/learning?action=upload",
      tone: "green",
    },
    {
      icon: "forum",
      title: T.actions.chat,
      meta: latestReady ? getDocumentName(latestReady) : "Chọn tài liệu để hỏi AI",
      to: actionTarget ? `/chat/${actionTarget}` : "/learning?action=upload",
      tone: "blue",
    },
    {
      icon: "quiz",
      title: T.actions.quiz,
      meta: latestReady ? "Kiểm tra mức độ hiểu bài" : "Cần tài liệu đã xử lý",
      to: actionTarget ? `/quiz/${actionTarget}` : "/learning?action=upload",
      tone: "warm",
    },
    {
      icon: "account_tree",
      title: T.actions.mindmap,
      meta: latestReady ? "Nhìn cấu trúc kiến thức" : "Cần tài liệu đã xử lý",
      to: actionTarget ? `/mindmap/${actionTarget}` : "/learning?action=upload",
      tone: "rose",
    },
  ];

  return (
    <PageFrame className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
        <Surface className="p-5 sm:p-6" accent>
          <div className="grid h-full gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="flex min-w-0 flex-col">
              <div>
                <h1 className="max-w-3xl text-balance text-[2rem] font-semibold leading-[1.05] text-[var(--foreground)] sm:text-[2.45rem]">
                  {T.hero.title}
                </h1>
                <p className="mt-4 max-w-2xl text-[14px] font-medium leading-7 text-[var(--muted)]">
                  {T.hero.subtitle}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <LiquidGlassButton to={continueTarget} icon={primaryCtaIcon} size="lg">
                  {primaryCtaLabel}
                </LiquidGlassButton>
                <Button to="/learning" variant="secondary" icon="library_books" size="lg">
                  {T.hero.openLibrary}
                </Button>
              </div>
            </div>
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-3 shadow-[inset_0_1px_0_oklch(99%_0.006_205_/_0.5)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[12px] font-bold text-[var(--foreground)]">Lộ trình học</p>
                <span className="rounded-[var(--radius-chip)] border border-[var(--border-subtle)] bg-[var(--surface)] px-2 py-1 font-mono text-[10px] font-bold text-[var(--muted)]">
                  3 bước
                </span>
              </div>
              <ol className="space-y-2">
                {studySteps.map((step, index) => (
                  <ProgressStep key={step.title} index={index + 1} {...step} />
                ))}
              </ol>
            </div>
          </div>
        </Surface>

        <Surface className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{T.context.title}</h2>
            <Button to="/chat" variant="ghost" icon="forum" size="sm">
              {T.context.chat}
            </Button>
          </div>
          {recentSessions.length > 0 ? (
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <SessionRow
                  key={session.id || `${session.documentId}-${session.updatedAt}`}
                  session={session}
                />
              ))}
            </div>
          ) : loading || recentSessionsLoading ? (
            <LearningContextSkeleton />
          ) : latestReady ? (
            <ReadyDocumentPanel document={latestReady} />
          ) : (
            <EmptyLearningPanel />
          )}
        </Surface>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={T.stats.ready.label} value={stats.ready} icon="task_alt" tone="green" helper={T.stats.ready.helper} />
        <StatCard label={T.stats.processing.label} value={stats.processing} icon="progress_activity" tone="blue" helper={T.stats.processing.helper} />
        <StatCard label={T.stats.sessions.label} value={recentSessions.length} icon="forum" tone="warm" helper={T.stats.sessions.helper} />
        <StatCard label={T.stats.pages.label} value={stats.pages} icon="article" tone="rose" helper={stats.failed ? T.stats.pages.failedHelper(stats.failed) : T.stats.pages.helper} />
      </div>

      <Surface className="p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{T.actions.title}</h2>
            {T.actions.subtitle && (
              <p className="mt-1 text-[12px] font-medium text-[var(--muted)]">{T.actions.subtitle}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <QuickAction key={action.title} {...action} />
          ))}
        </div>
      </Surface>

      <Surface className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{T.recentDocuments.title}</h2>
            {T.recentDocuments.subtitle && (
              <p className="mt-1 text-[12px] font-medium text-[var(--muted)]">{T.recentDocuments.subtitle}</p>
            )}
          </div>
          <Button to="/learning" variant="ghost" trailingIcon="arrow_forward" size="sm">
            {T.recentDocuments.viewAll}
          </Button>
        </div>
        {recentDocuments.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {recentDocuments.map((doc) => (
              <RecentDocument key={doc.id} doc={doc} />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--border-color)] bg-[var(--surface)] px-4 py-8 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--muted)]">
              <span className="material-symbols-outlined icon-thin text-[24px]" aria-hidden="true">
                folder_open
              </span>
            </span>
            <h3 className="mt-3 text-[14px] font-bold text-[var(--foreground)]">{T.recentDocuments.emptyTitle}</h3>
            <p className="mt-1 text-[12px] font-medium text-[var(--muted)]">{T.recentDocuments.emptySubtitle}</p>
          </div>
        )}
      </Surface>
    </PageFrame>
  );
}
