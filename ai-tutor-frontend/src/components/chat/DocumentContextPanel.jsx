import { useState } from "react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import SourceCitationList from "@/components/chat/SourceCitationList";
import QuickActionBar from "@/components/chat/QuickActionBar";
import { Skeleton } from "@/components/ui/States";
import { CHAT_WORKSPACE_TEXTS } from "@/constants/texts";
import {
  getDocumentDate,
  getDocumentExt,
  getDocumentIcon,
  getDocumentName,
  getDocumentPages,
  getDocumentSize,
  normalizeDocumentStatus,
} from "@/components/documents/documentUtils";

const T = CHAT_WORKSPACE_TEXTS.contextPanel;

function PipelineDebugPanel({ pipeline }) {
  if (!pipeline) {
    return (
      <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-2.5">
        <p className="text-[11px] font-medium leading-5 text-[var(--muted)]">
          Gửi câu hỏi để xem thông tin pipeline
        </p>
      </div>
    );
  }

  const rows = [
    { label: "Chiến lược", value: pipeline.strategyDescription || pipeline.strategy, icon: "route" },
    { label: "Cache", value: pipeline.cacheHit ? "Hit ✓" : "Miss", icon: "bolt" },
    { label: "Kết quả tìm kiếm", value: pipeline.searchResultCount, icon: "search" },
    { label: "Chunks đã chọn", value: pipeline.selectedCount, icon: "filter_list" },
    { label: "Thời gian", value: pipeline.totalTimeMs ? `${pipeline.totalTimeMs}ms` : "—", icon: "timer" },
  ];

  // Extended debug info
  const debugRows = pipeline.rewrittenQuery ? [
    { label: "Truy vấn gốc", value: pipeline.originalQuery },
    { label: "Truy vấn đã viết lại", value: pipeline.rewrittenQuery },
    { label: "Lý do chọn chiến lược", value: (pipeline.strategyReasons || []).join(", ") },
    { label: "Chunks sau re-rank", value: pipeline.rerankedCount },
    { label: "Token ước tính", value: pipeline.tokenEstimate },
  ] : [];

  const timingRows = pipeline.timings ? [
    { label: "Viết lại truy vấn", value: `${pipeline.timings.rewrite || 0}ms` },
    { label: "Tìm kiếm", value: `${pipeline.timings.search || 0}ms` },
    { label: "Xếp hạng lại", value: `${pipeline.timings.rerank || 0}ms` },
    { label: "Chọn context", value: `${pipeline.timings.select || 0}ms` },
    { label: "Tạo câu trả lời", value: `${pipeline.timings.generate || 0}ms` },
  ] : [];

  return (
    <div className="space-y-2">
      <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-2.5">
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2 text-[10.5px] font-semibold">
              <span className="inline-flex items-center gap-1 text-[var(--muted)]">
                <span className="material-symbols-outlined icon-thin text-[13px]">{row.icon}</span>
                {row.label}
              </span>
              <span className="shrink-0 text-[var(--foreground)]">{row.value ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Extended debug details */}
      {debugRows.length > 0 && (
        <details className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)]">
          <summary className="cursor-pointer px-2.5 py-2 text-[10.5px] font-bold text-[var(--foreground)]">
            Chi tiết pipeline
          </summary>
          <div className="space-y-1.5 border-t border-[var(--border-subtle)] px-2.5 py-2">
            {debugRows.map((row) => (
              <div key={row.label} className="text-[10px]">
                <span className="font-bold text-[var(--muted)]">{row.label}: </span>
                <span className="font-medium text-[var(--foreground)]">{row.value || "—"}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Timing breakdown */}
      {timingRows.length > 0 && (
        <details className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)]">
          <summary className="cursor-pointer px-2.5 py-2 text-[10.5px] font-bold text-[var(--foreground)]">
            Thời gian chi tiết
          </summary>
          <div className="space-y-1 border-t border-[var(--border-subtle)] px-2.5 py-2">
            {timingRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2 text-[10px] font-semibold">
                <span className="text-[var(--muted)]">{row.label}</span>
                <span className="font-mono text-[var(--foreground)]">{row.value}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default function DocumentContextPanel({ document, sources = [], quota, onQuickAction, lastPipeline }) {
  const [debugMode, setDebugMode] = useState(false);
  const quotaRows = quota && !quota.isPro
    ? [
        { label: T.chatMessages, remaining: quota.chatRemaining?.() },
        { label: T.aiGenerations, remaining: quota.aiRemaining?.() },
      ].filter((row) => row.remaining !== undefined)
    : [];

  return (
    <aside className="flex h-full flex-col border-l border-[var(--border-color)] bg-[var(--card-bg)]">
      <div className="border-b border-[var(--border-subtle)] p-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-normal text-[var(--muted)]">{T.selectedSource}</p>
        {document ? (
          <div className="mt-2.5 flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-[var(--brand-primary)]">
              <span className="material-symbols-outlined icon-thin text-[16px]" aria-hidden="true">{getDocumentIcon(document)}</span>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[12px] font-semibold leading-5 text-[var(--foreground)]" title={getDocumentName(document)}>{getDocumentName(document)}</h2>
              <p className="mt-0.5 truncate text-[10.5px] font-medium text-[var(--muted)]">
                {getDocumentExt(document)} · {getDocumentSize(document)} · {getDocumentDate(document)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-2.5 flex items-start gap-2.5" role="status" aria-label={T.loadingDocument} aria-busy="true">
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-2.5 w-2/3" />
            </div>
          </div>
        )}

        {document && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={normalizeDocumentStatus(document.status)} />
            <span className="inline-flex max-w-[90px] items-center truncate rounded-[var(--radius-chip)] border border-[var(--border-subtle)] bg-[var(--surface)] px-2 py-1 text-[10.5px] font-semibold leading-none text-[var(--muted)]">
              {getDocumentPages(document)}
            </span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button to="/chat" variant="outline" size="sm" icon="swap_horiz" className="max-w-[128px] px-2.5 text-[11px]" iconClassName="text-[15px]">
            {T.switchSource}
          </Button>
          {document && (
            <Button to="/learning" variant="ghost" size="sm" icon="library_books" className="max-w-[110px] px-2.5 text-[11px]" iconClassName="text-[15px]">
              {T.library}
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
        <section>
          <h3 className="mb-1.5 text-[11.5px] font-semibold text-[var(--foreground)]">{T.quickActions}</h3>
          <QuickActionBar compact onAction={onQuickAction} />
        </section>

        <section className="mt-4">
          <h3 className="mb-1.5 text-[11.5px] font-semibold text-[var(--foreground)]">{T.citations}</h3>
          {/* Debug/Advanced mode: pipeline details — only shows when debug data is available */}
          {lastPipeline?.rewrittenQuery && (
            <>
              <div className="mb-1.5 flex items-center justify-between">
                <span />
                <button
                  type="button"
                  onClick={() => setDebugMode((v) => !v)}
                  className={`grid h-6 w-6 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${debugMode ? "bg-[var(--surface)] text-[var(--foreground)]" : ""}`}
                  title={debugMode ? "Ẩn chi tiết pipeline" : "Hiện chi tiết pipeline"}
                  aria-label={debugMode ? "Ẩn chi tiết pipeline" : "Hiện chi tiết pipeline"}
                >
                  <span className="material-symbols-outlined icon-thin text-[15px]">{debugMode ? "code_off" : "code"}</span>
                </button>
              </div>
              {debugMode && (
                <div className="mb-3">
                  <PipelineDebugPanel pipeline={lastPipeline} />
                </div>
              )}
            </>
          )}

          {sources.length > 0 ? (
            <SourceCitationList sources={sources} compact />
          ) : (
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-2.5">
              <p className="text-[11px] font-medium leading-5 text-[var(--muted)]">
                {T.citationsEmpty}
              </p>
            </div>
          )}
        </section>

        {quotaRows.length > 0 && (
          <section className="mt-4 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-2.5">
            <h3 className="text-[11.5px] font-semibold text-[var(--foreground)]">{T.usage}</h3>
            <div className="mt-2 space-y-1.5 text-[10.5px] font-semibold text-[var(--muted)]">
              {quotaRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{row.label}</span>
                  <span className="shrink-0">{T.remaining(row.remaining)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
