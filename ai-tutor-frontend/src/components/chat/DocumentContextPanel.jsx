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

export default function DocumentContextPanel({ document, sources = [], quota, onQuickAction }) {
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
