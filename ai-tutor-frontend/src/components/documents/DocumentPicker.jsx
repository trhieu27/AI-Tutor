import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDocuments } from "@/context/DocumentContext";
import { DOCUMENT_PICKER_TEXTS } from "@/constants/texts";
import Button from "@/components/ui/Button";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import StatusBadge from "@/components/ui/StatusBadge";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { cx } from "@/components/ui/Premium";
import {
  getDocumentDate,
  getDocumentExt,
  getDocumentIcon,
  getDocumentName,
  getDocumentPages,
  getDocumentSize,
  normalizeDocumentStatus,
} from "@/components/documents/documentUtils";

const PAGE_SIZE_OPTIONS = [5, 10, 20];

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const items = [];
  items.push(1, 2);

  if (currentPage > 4) {
    items.push("ellipsis-start");
  }

  const rangeStart = Math.max(3, currentPage - 1);
  const rangeEnd = Math.min(totalPages - 2, currentPage + 1);
  for (let i = rangeStart; i <= rangeEnd; i++) {
    if (!items.includes(i)) items.push(i);
  }

  if (currentPage < totalPages - 3) {
    items.push("ellipsis-end");
  }

  if (!items.includes(totalPages - 1)) items.push(totalPages - 1);
  if (!items.includes(totalPages)) items.push(totalPages);

  return items;
}

export default function DocumentPicker({
  title = DOCUMENT_PICKER_TEXTS.defaults.title,
  subtitle = DOCUMENT_PICKER_TEXTS.defaults.subtitle,
  actionLabel = DOCUMENT_PICKER_TEXTS.defaults.actionLabel,
  actionIcon = "arrow_forward",
  actionForDocument,
  emptyAction,
  onSelect,
  selectedId,
  liquidAction = false,
  showOnlyReady = true,
}) {
  const { documents, loading } = useDocuments();
  const [query, setQuery] = useState("");
  const [localSelectedId, setLocalSelectedId] = useState(selectedId || null);
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  const visibleDocuments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents
      .filter((doc) => (showOnlyReady ? normalizeDocumentStatus(doc.status) === "ready" : true))
      .filter((doc) => !q || getDocumentName(doc).toLowerCase().includes(q))
      .sort((a, b) => new Date(b.uploaded_at || b.uploadedAt) - new Date(a.uploaded_at || a.uploadedAt));
  }, [documents, query, showOnlyReady]);

  const totalPages = Math.max(1, Math.ceil(visibleDocuments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedDocuments = visibleDocuments.slice(pageStart, pageStart + pageSize);
  const rangeStart = visibleDocuments.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(pageStart + pageSize, visibleDocuments.length);
  const pageItems = getPaginationItems(currentPage, totalPages);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const activeId = selectedId || localSelectedId;
  const activeDocument = visibleDocuments.find((doc) => String(doc.id) === String(activeId));
  const ActionComponent = liquidAction ? LiquidGlassButton : Button;

  if (loading && documents.length === 0) {
    return <LoadingState title={DOCUMENT_PICKER_TEXTS.loading.title} subtitle={DOCUMENT_PICKER_TEXTS.loading.subtitle} />;
  }

  return (
    <section className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--premium-shadow-sm)]">
      <div className="border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-semibold text-[var(--foreground)]">{title}</h2>
              <span className="rounded-[var(--radius-chip)] border border-[var(--border-subtle)] bg-[var(--surface)] px-2 py-1 text-[10px] font-bold text-[var(--muted)]">
                {DOCUMENT_PICKER_TEXTS.count(visibleDocuments.length)}
              </span>
            </div>
            {subtitle && <p className="mt-1 max-w-2xl text-[13px] font-medium leading-6 text-[var(--muted)]">{subtitle}</p>}
          </div>
          <label className="relative w-full md:w-72">
            <span className="material-symbols-outlined icon-thin pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[var(--muted)]">
              search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={DOCUMENT_PICKER_TEXTS.searchPlaceholder}
              className="premium-input h-10 pl-9 pr-3"
            />
          </label>
        </div>
      </div>

      {visibleDocuments.length === 0 ? (
        <EmptyState
          icon="library_add"
          title={query ? DOCUMENT_PICKER_TEXTS.empty.filteredTitle : DOCUMENT_PICKER_TEXTS.empty.readyTitle}
          subtitle={
            query
              ? DOCUMENT_PICKER_TEXTS.empty.filteredSubtitle
              : DOCUMENT_PICKER_TEXTS.empty.readySubtitle
          }
          action={emptyAction || <LiquidGlassButton to="/learning?action=upload" icon="upload_file">{DOCUMENT_PICKER_TEXTS.empty.uploadFirst}</LiquidGlassButton>}
        />
      ) : (
        <div>
          <div className="max-h-[456px] space-y-3 overflow-y-auto overscroll-contain p-3 custom-scrollbar md:max-h-[480px] md:space-y-0 md:divide-y md:divide-[var(--border-subtle)] md:p-0">
          {paginatedDocuments.map((doc) => {
            const isSelected = String(activeId) === String(doc.id);
            const actionTarget = actionForDocument?.(doc);
            const rowClassName = cx(
              "group grid gap-4 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3.5 py-4 text-left transition-[background,border-color,box-shadow] duration-150 sm:px-5 sm:py-4 md:min-h-[96px] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:rounded-none md:border-0 md:bg-transparent md:px-5 md:shadow-none",
              isSelected
                ? "bg-[hsl(166_61%_35%/0.06)]"
                : "hover:bg-[var(--surface)]"
            );
            const actionControlClassName = cx(
              "inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] border px-4 text-[13px] font-semibold leading-snug transition-[background,border-color,color,box-shadow,transform] duration-150 group-hover:-translate-y-0.5 md:ml-auto md:h-10 md:w-auto",
              liquidAction
                ? "border-transparent bg-[linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))] text-[var(--on-primary)] shadow-[0_12px_26px_var(--shadow-primary)]"
                : isSelected
                  ? "border-transparent bg-[var(--brand-primary)] text-[var(--on-primary)] shadow-[0_10px_24px_var(--shadow-primary)]"
                  : "border-[var(--border-color)] bg-[var(--surface-raised)] text-[var(--foreground)] shadow-[var(--premium-shadow-sm)] group-hover:border-[var(--border-emphasis)] group-hover:bg-[var(--card-bg-hover)]"
            );
            const actionControl = (
              <span className={actionControlClassName}>
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                  {actionTarget ? actionIcon : isSelected ? "task_alt" : "radio_button_unchecked"}
                </span>
                <span className="truncate">
                  {actionTarget ? actionLabel : isSelected ? DOCUMENT_PICKER_TEXTS.selected : DOCUMENT_PICKER_TEXTS.chooseSource}
                </span>
              </span>
            );
            const content = (
              <article
                className={rowClassName}
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span
                    className={cx(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-[var(--surface-raised)] text-[var(--brand-primary)] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.55)] md:h-11 md:w-11",
                      isSelected ? "border-[var(--brand-primary)]" : "border-[var(--border-color)]"
                    )}
                  >
                    <span className="material-symbols-outlined icon-thin text-[20px]">{getDocumentIcon(doc)}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[13px] font-semibold leading-5 text-[var(--foreground)] md:line-clamp-2 md:whitespace-normal">
                      {getDocumentName(doc)}
                    </h3>
                    <p className="mt-1 truncate text-[11px] font-semibold leading-5 text-[var(--muted)] md:line-clamp-2 md:whitespace-normal">
                      {getDocumentExt(doc)} · {getDocumentSize(doc)} · {getDocumentDate(doc)} · {getDocumentPages(doc)}
                    </p>
                  </div>
                  <span className="hidden shrink-0 md:block">
                    <StatusBadge status={normalizeDocumentStatus(doc.status)} />
                  </span>
                </div>

                <div className="flex items-center gap-2 md:justify-end">
                  {actionControl}
                </div>
              </article>
            );

            if (actionTarget) {
              return (
                <Link
                  key={doc.id}
                  to={actionTarget}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                  aria-label={`${actionLabel}: ${getDocumentName(doc)}`}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={doc.id}
                type="button"
                className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                onClick={() => {
                  setLocalSelectedId(doc.id);
                  onSelect?.(doc);
                }}
              >
                {content}
              </button>
            );
          })}
          </div>
          <div className="pagination-bar">
            <div className="flex items-center justify-between gap-2">
              <div className="pagination-info">
                <span>{DOCUMENT_PICKER_TEXTS.pagination.range(rangeStart, rangeEnd, visibleDocuments.length)}</span>
                <span className="separator">·</span>
                <span>{DOCUMENT_PICKER_TEXTS.pagination.page(currentPage, totalPages)}</span>
              </div>
              <div className="pagination-per-page">
                <span className="label">{DOCUMENT_PICKER_TEXTS.pagination.perPageLabel}</span>
                <span className="select-wrap">
                  <select
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    aria-label={DOCUMENT_PICKER_TEXTS.pagination.perPageLabel}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {DOCUMENT_PICKER_TEXTS.pagination.perPageOption(size)}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined select-icon" aria-hidden="true">expand_more</span>
                </span>
              </div>
            </div>

            <nav className="pagination-nav" aria-label="Phân trang">
              <button
                type="button"
                aria-label={DOCUMENT_PICKER_TEXTS.pagination.previous}
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="pagination-btn pagination-arrow"
              >
                <span className="material-symbols-outlined icon-thin text-[18px]" aria-hidden="true">chevron_left</span>
              </button>
              {pageItems.map((item) =>
                typeof item === "number" ? (
                  <button
                    key={item}
                    type="button"
                    aria-label={DOCUMENT_PICKER_TEXTS.pagination.pageButton(item)}
                    aria-current={item === currentPage ? "page" : undefined}
                    onClick={() => setPage(item)}
                    className="pagination-btn"
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item} className="pagination-ellipsis">…</span>
                )
              )}
              <button
                type="button"
                aria-label={DOCUMENT_PICKER_TEXTS.pagination.next}
                disabled={currentPage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="pagination-btn pagination-arrow"
              >
                <span className="material-symbols-outlined icon-thin text-[18px]" aria-hidden="true">chevron_right</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {activeDocument && !actionForDocument && (
        <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-normal text-[var(--muted)]">{DOCUMENT_PICKER_TEXTS.selectedSource}</p>
            <p className="mt-1 line-clamp-1 text-[13px] font-semibold text-[var(--foreground)]">
              {getDocumentName(activeDocument)}
            </p>
          </div>
          <ActionComponent to={actionForDocument?.(activeDocument) || `/chat/${activeDocument.id}`} icon={actionIcon}>
            {actionLabel}
          </ActionComponent>
        </div>
      )}
    </section>
  );
}
