import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPaginationItems } from "@/shared/utils/paginationUtils";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { deleteDocument, retryDocument } from "@/shared/services/api.service";
import { DOCUMENT_LIBRARY_TEXTS, DOCUMENT_TABLE_TEXTS } from "@/shared/constants/texts";
import { useUpload } from "@/features/user/context/UploadContext";
import { useDocuments } from "@/features/user/context/DocumentContext";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import Button from "@/shared/ui/Button";
import StatusBadge from "@/shared/ui/StatusBadge";
import { EmptyState, Skeleton } from "@/shared/ui/States";
import { SegmentedControl, cx } from "@/shared/ui/Premium";
import {
  getDocumentDate,
  getDocumentExt,
  getDocumentIcon,
  getDocumentName,
  getDocumentPages,
  getDocumentSize,
  normalizeDocumentStatus,
} from "@/features/user/components/documents/documentUtils";

const STATUS_OPTIONS = DOCUMENT_LIBRARY_TEXTS.statusOptions;
const SORT_OPTIONS = DOCUMENT_LIBRARY_TEXTS.sortOptions;
const PAGE_SIZE_OPTIONS = [5, 10, 20];


function getRedirectUrl(docId, defaultAction) {
  if (defaultAction === "mindmap") return `/mindmap/${docId}`;
  if (defaultAction === "quiz") return `/quiz/${docId}`;
  const baseUrl = `/chat/${docId}`;
  return defaultAction ? `${baseUrl}?action=${defaultAction}` : baseUrl;
}

function matchesStatus(doc, statusFilter) {
  if (statusFilter === "all") return true;
  const status = normalizeDocumentStatus(doc.status);
  if (statusFilter === "processing") return status === "processing" || status === "uploading";
  return status === statusFilter;
}

function SortSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedOption = SORT_OPTIONS.find((option) => option.id === value) || SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const chooseOption = (optionId) => {
    onChange(optionId);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-10 shrink-0 sm:min-w-44 sm:w-52">
      <button
        type="button"
        className={cx(
          "flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border bg-[var(--surface-raised)] px-0 text-left text-[13px] font-bold text-[var(--foreground)] shadow-[var(--premium-shadow-sm)] transition sm:justify-start sm:px-3",
          open ? "border-[var(--border-emphasis)] ring-2 ring-[var(--brand-glow)]" : "border-[var(--border-color)] hover:border-[var(--border-emphasis)] hover:bg-[var(--card-bg-hover)]"
        )}
        aria-label={DOCUMENT_LIBRARY_TEXTS.sortAria}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="material-symbols-outlined icon-thin text-[17px] text-[var(--muted)]" aria-hidden="true">
          swap_vert
        </span>
        <span className="hidden min-w-0 flex-1 truncate sm:block">{selectedOption.label}</span>
        <span className="sort-select-chevron hidden sm:inline-flex" aria-hidden="true">
          <span className={cx("material-symbols-outlined text-[18px] text-[var(--muted)] transition-transform", open && "rotate-180")}>
            expand_more
          </span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-44 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-1 shadow-[var(--premium-shadow-md)] sm:left-0 sm:right-0 sm:w-auto" role="listbox">
          {SORT_OPTIONS.map((option) => {
            const selected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={cx(
                  "flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-[13px] font-semibold transition",
                  selected
                    ? "bg-[var(--brand-primary)] text-[var(--on-primary)]"
                    : "text-[var(--foreground)] hover:bg-[var(--surface)]"
                )}
                onClick={() => chooseOption(option.id)}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {selected && (
                  <span className="material-symbols-outlined icon-strong text-[16px]" aria-hidden="true">
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DocumentIcon({ doc }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--surface-raised)] text-[var(--brand-primary)] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.55)]">
      <span className="material-symbols-outlined icon-thin text-[19px]">{getDocumentIcon(doc)}</span>
    </span>
  );
}

function ActionIcon({ label, icon, tone = "neutral", fullMobile = false, className = "", iconClassName = "", ...props }) {
  const toneClass =
    tone === "danger"
      ? "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--brand-rose)]"
      : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--card-bg-hover)] hover:text-[var(--foreground)]";

  const wrapRef = useRef(null);
  const [tip, setTip] = useState(null);

  const showTip = useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || !label) return;
    setTip({
      left: rect.left + rect.width / 2,
      top: rect.top,
    });
  }, [label]);

  const hideTip = useCallback(() => setTip(null), []);

  return (
    <span
      ref={wrapRef}
      className={cx("action-icon-wrap relative", fullMobile && "flex flex-1 min-w-0 sm:inline-flex sm:flex-none")}
      onPointerEnter={showTip}
      onPointerLeave={hideTip}
    >
      <Button
        variant="icon"
        size="icon"
        icon={icon}
        aria-label={label}
        className={cx(
          fullMobile ? "h-10 w-full min-w-0 rounded-lg sm:h-9 sm:w-9 sm:flex-none" : "h-9 w-9 rounded-lg",
          toneClass,
          className
        )}
        iconClassName={cx("text-[18px]", iconClassName)}
        {...props}
      >
        {label}
      </Button>
      {tip ? createPortal(
        <span
          className="action-tooltip is-portal"
          style={{ left: `${tip.left}px`, top: `${tip.top}px` }}
        >
          {label}
        </span>,
        document.body
      ) : null}
    </span>
  );
}

function DocumentActions({ doc, defaultAction, deletingId, retryingId, onDelete, onRetry }) {
  const status = normalizeDocumentStatus(doc.status);
  const deleting = deletingId === doc.id;

  if (status !== "ready") {
    return (
      <div className="flex w-full flex-wrap items-center justify-end sm:w-auto">
        <div className="flex w-full max-w-full items-center gap-1 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-1 shadow-[var(--premium-shadow-sm)] sm:inline-flex sm:w-auto">
          {status === "failed" ? (
            <Button
              variant="outline"
              size="sm"
              icon="refresh"
              loading={retryingId === doc.id}
              onClick={() => onRetry(doc.id)}
              className="h-10 min-w-0 flex-1 !shrink rounded-lg px-3 shadow-none sm:h-9 sm:flex-none sm:!shrink-0"
            >
              {DOCUMENT_LIBRARY_TEXTS.actions.retry}
            </Button>
          ) : (
            <Button variant="subtle" size="sm" icon="schedule" disabled className="h-10 min-w-0 flex-1 !shrink rounded-lg px-3 shadow-none sm:h-9 sm:flex-none sm:!shrink-0">
              {DOCUMENT_LIBRARY_TEXTS.waiting}
            </Button>
          )}
          <span className="mx-0.5 h-5 w-px bg-[var(--border-subtle)]" aria-hidden="true" />
          <ActionIcon
            label={DOCUMENT_LIBRARY_TEXTS.actions.delete}
            icon="delete"
            tone="danger"
            onClick={() => onDelete(doc)}
            disabled={deleting}
            fullMobile
            className={deleting ? "opacity-55" : ""}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-end sm:w-auto">
      <div className="flex w-full max-w-full items-center gap-1 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-1 shadow-[var(--premium-shadow-sm)] sm:inline-flex sm:w-auto">
        <ActionIcon
          fullMobile
          label={DOCUMENT_LIBRARY_TEXTS.actions.chat}
          icon="chat_bubble"
          to={getRedirectUrl(doc.id, defaultAction)}
        />
        <span className="mx-0.5 h-5 w-px bg-[var(--border-subtle)]" aria-hidden="true" />
        <ActionIcon fullMobile label={DOCUMENT_LIBRARY_TEXTS.actions.summary} icon="summarize" to={`/chat/${doc.id}?action=summary`} />
        <ActionIcon fullMobile label={DOCUMENT_LIBRARY_TEXTS.actions.quiz} icon="quiz" to={`/quiz/${doc.id}`} />
        <ActionIcon fullMobile label={DOCUMENT_LIBRARY_TEXTS.actions.mindmap} icon="account_tree" to={`/mindmap/${doc.id}`} />
        <span className="mx-0.5 h-5 w-px bg-[var(--border-subtle)]" aria-hidden="true" />
        <ActionIcon
          label={DOCUMENT_LIBRARY_TEXTS.actions.delete}
          icon="delete"
          tone="danger"
          onClick={() => onDelete(doc)}
          disabled={deleting}
          fullMobile
          className={deleting ? "opacity-55" : ""}
        />
      </div>
    </div>
  );
}

function DocumentCard({ doc, defaultAction, deletingId, retryingId, onDelete, onRetry }) {
  const navigate = useNavigate();
  const ready = normalizeDocumentStatus(doc.status) === "ready";
  const target = getRedirectUrl(doc.id, defaultAction);
  const openDocument = () => {
    if (ready) navigate(target);
  };

  return (
    <article
      className={cx(
        "rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-3 shadow-[var(--premium-shadow-sm)] sm:p-4",
        ready && "cursor-pointer transition hover:-translate-y-0.5 hover:border-[var(--border-emphasis)] hover:bg-[var(--surface-raised)]"
      )}
      onClick={openDocument}
      onKeyDown={(event) => {
        if (!ready || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        openDocument();
      }}
      role={ready ? "link" : undefined}
      tabIndex={ready ? 0 : undefined}
      aria-label={ready ? `${DOCUMENT_LIBRARY_TEXTS.actions.chat}: ${getDocumentName(doc)}` : undefined}
    >
      <div className="flex items-start gap-3">
        <DocumentIcon doc={doc} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-semibold leading-5 text-[var(--foreground)]">{getDocumentName(doc)}</h3>
          <p className="mt-1 text-[11px] font-medium text-[var(--muted)]">
            {getDocumentExt(doc)} · {getDocumentSize(doc)} · {getDocumentDate(doc)}
          </p>
        </div>
      </div>
      <div className="mt-3 border-t border-[var(--border-subtle)] pt-2.5 sm:mt-4 sm:pt-3" onClick={(event) => event.stopPropagation()}>
        <DocumentActions
          doc={doc}
          defaultAction={defaultAction}
          deletingId={deletingId}
          retryingId={retryingId}
          onDelete={onDelete}
          onRetry={onRetry}
        />
      </div>
    </article>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--border-subtle)]">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4"><Skeleton className="h-3 w-20" /></td>
      <td className="px-4 py-4"><Skeleton className="h-5 w-20" /></td>
      <td className="px-4 py-4"><Skeleton className="ml-auto h-8 w-52" /></td>
    </tr>
  );
}

function PageSizeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const P = DOCUMENT_LIBRARY_TEXTS.pagination;

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="pagination-per-page">
      <span className="label">{P.perPageLabel}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((c) => !c)}
          aria-label={P.perPageLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cx(
            "flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-bold transition",
            open
              ? "border-[var(--border-emphasis)] bg-[var(--card-bg)] ring-2 ring-[var(--brand-glow)]"
              : "border-[var(--border-color)] bg-[var(--surface-raised)] hover:border-[var(--border-emphasis)]"
          )}
        >
          <span className="text-[var(--foreground)]">{P.perPageOption(value)}</span>
          <span className={cx("material-symbols-outlined text-[15px] text-[var(--muted)] transition-transform", open && "rotate-180")}>
            expand_more
          </span>
        </button>
        {open && (
          <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 w-28 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-1 shadow-[var(--premium-shadow-md)]" role="listbox">
            {PAGE_SIZE_OPTIONS.map((size) => {
              const selected = size === value;
              return (
                <button
                  key={size}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cx(
                    "flex h-8 w-full items-center rounded-md px-2.5 text-[12px] font-semibold transition",
                    selected
                      ? "bg-[var(--brand-primary)] text-[var(--on-primary)]"
                      : "text-[var(--foreground)] hover:bg-[var(--surface)]"
                  )}
                  onClick={() => {
                    onChange(size);
                    setOpen(false);
                  }}
                >
                  <span>{P.perPageOption(size)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PaginationControls({
  currentPage,
  pageSize,
  rangeEnd,
  rangeStart,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}) {
  const P = DOCUMENT_LIBRARY_TEXTS.pagination;
  const pageItems = getPaginationItems(currentPage, totalPages);

  return (
    <div className="pagination-bar">
      <div className="flex items-center justify-between gap-2">
        <div className="pagination-info">
          <span>{P.range(rangeStart, rangeEnd, totalItems)}</span>
          <span className="separator">·</span>
          <span>{P.page(currentPage, totalPages)}</span>
        </div>
        <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
      </div>

      <nav className="pagination-nav" aria-label="Phân trang">
        <button
          type="button"
          aria-label={P.previous}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="pagination-btn pagination-arrow"
        >
          <span className="material-symbols-outlined icon-thin text-[18px]" aria-hidden="true">chevron_left</span>
        </button>
        {pageItems.map((item) =>
          typeof item === "number" ? (
            <button
              key={item}
              type="button"
              aria-label={P.pageButton(item)}
              aria-current={item === currentPage ? "page" : undefined}
              onClick={() => onPageChange(item)}
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
          aria-label={P.next}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="pagination-btn pagination-arrow"
        >
          <span className="material-symbols-outlined icon-thin text-[18px]" aria-hidden="true">chevron_right</span>
        </button>
      </nav>
    </div>
  );
}

export default function DocumentTable({
  showActions = false,
  defaultAction = null,
  compact = false,
}) {
  const navigate = useNavigate();
  const { lastUploadTime } = useUpload();
  const {
    documents,
    pagination,
    loading,
    fetching,
    refreshDocuments,
    filters,
    setFilters,
    refreshPicker,
  } = useDocuments();
  
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [deletingId, setDeletingId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Đồng bộ search query với debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchTerm) return prev;
        return { ...prev, search: searchTerm, page: 1 };
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, setFilters]);

  // Đồng bộ các filter khác
  const statusFilter = filters.status;
  const setStatusFilter = useCallback((status) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  }, [setFilters]);

  const sortBy = filters.sort;
  const setSortBy = useCallback((sort) => {
    setFilters((prev) => ({ ...prev, sort, page: 1 }));
  }, [setFilters]);

  const pageSize = pagination.limit;
  const setPageSize = useCallback((limitVal) => {
    setFilters((prev) => ({ ...prev, limit: limitVal, page: 1 }));
  }, [setFilters]);

  const page = pagination.page;
  const setPage = useCallback((pageVal) => {
    setFilters((prev) => ({ ...prev, page: pageVal }));
  }, [setFilters]);

  useEffect(() => {
    const hasProcessing = documents.some((doc) => doc.status === "PROCESSING" || doc.status === "UPLOADING");
    if (!hasProcessing) return undefined;
    const timer = setInterval(() => refreshDocuments(true), 5000);
    return () => clearInterval(timer);
  }, [documents, refreshDocuments]);


  const totalPages = pagination.totalPages;
  const currentPage = pagination.page;
  const totalItems = pagination.total;
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  const stats = useMemo(() => {
    const ready = documents.filter((doc) => doc.status === "READY").length;
    const processing = documents.filter((doc) => doc.status === "PROCESSING" || doc.status === "UPLOADING").length;
    const failed = documents.filter((doc) => doc.status === "FAILED").length;
    return { ready, processing, failed, total: totalItems };
  }, [documents, totalItems]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    setPendingDelete(null);
    try {
      await deleteDocument(pendingDelete.id);
      refreshPicker().catch((err) => console.error("Failed to refresh picker:", err));
      if (pagination.page > 1 && documents.length === 1) {
        setFilters((prev) => ({ ...prev, page: pagination.page - 1 }));
      } else {
        await refreshDocuments(true);
      }
    } catch {
      alert(DOCUMENT_LIBRARY_TEXTS.alerts.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRetry = async (documentId) => {
    setRetryingId(documentId);
    try {
      await retryDocument(documentId);
      await refreshDocuments(true);
    } catch (err) {
      alert(err.message || DOCUMENT_LIBRARY_TEXTS.alerts.retryFailed);
    } finally {
      setRetryingId(null);
    }
  };

  const openReadyDocument = (doc) => {
    if (normalizeDocumentStatus(doc.status) !== "ready") return;
    navigate(getRedirectUrl(doc.id, defaultAction));
  };

  return (
    <>
      <section className={cx("doc-library-section rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--premium-shadow-sm)] relative transition-opacity duration-200", fetching && "opacity-50 pointer-events-none")}>
        {fetching && (
          <div className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden rounded-t-[var(--radius-panel)] bg-[var(--border-subtle)]">
            <div className="h-full w-1/3 bg-[var(--brand-primary)]" style={{ animation: 'slideBar 1s ease-in-out infinite' }} />
          </div>
        )}
        <div className="border-b border-[var(--border-subtle)] px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-[17px] font-semibold text-[var(--foreground)]">{DOCUMENT_TABLE_TEXTS.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-[var(--muted)]">
                <span>{DOCUMENT_LIBRARY_TEXTS.stats.total(stats.total)}</span>
                <span>·</span>
                <span>{DOCUMENT_LIBRARY_TEXTS.stats.ready(stats.ready)}</span>
                <span>·</span>
                <span>{DOCUMENT_LIBRARY_TEXTS.stats.processing(stats.processing)}</span>
                {stats.failed > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-[var(--brand-rose)]">{DOCUMENT_LIBRARY_TEXTS.stats.failed(stats.failed)}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 xl:max-w-3xl">
              <div className="flex items-center gap-2">
                <label className="relative min-w-0 flex-1">
                  <span className="material-symbols-outlined icon-thin pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[var(--muted)]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder={DOCUMENT_TABLE_TEXTS.searchPlaceholder}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="premium-input h-10 pl-9 pr-3"
                  />
                </label>
                <SortSelect value={sortBy} onChange={setSortBy} />
                <button
                  type="button"
                  onClick={() => refreshDocuments()}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-color)] bg-transparent text-[var(--foreground)] transition-[background,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-reveal)] hover:border-[var(--border-emphasis)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:scale-[0.97] sm:w-auto sm:px-4"
                  aria-label={DOCUMENT_LIBRARY_TEXTS.actions.refresh}
                  title={DOCUMENT_LIBRARY_TEXTS.actions.refresh}
                >
                  <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                    refresh
                  </span>
                  <span className="hidden truncate text-[13px] font-[760] leading-none sm:inline">
                    {DOCUMENT_LIBRARY_TEXTS.actions.refresh}
                  </span>
                </button>
              </div>
              {!compact && (
                <div className="-mx-1 overflow-x-auto px-1 pb-1 custom-scrollbar">
                  <SegmentedControl options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} className="min-w-max" />
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Mobile: Dạng card */}
        <div className="doc-library-scroll p-2 sm:p-4 custom-scrollbar md:hidden">
          {loading && documents.length === 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-36 w-full" />
              ))}
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-2 pb-1 sm:space-y-3">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  defaultAction={defaultAction}
                  deletingId={deletingId}
                  retryingId={retryingId}
                  onDelete={setPendingDelete}
                  onRetry={handleRetry}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={searchTerm || statusFilter !== "all" ? "search_off" : "cloud_upload"}
              title={searchTerm || statusFilter !== "all" ? DOCUMENT_LIBRARY_TEXTS.emptyFilteredTitle : DOCUMENT_TABLE_TEXTS.empty?.title}
              subtitle={
                searchTerm || statusFilter !== "all"
                  ? DOCUMENT_LIBRARY_TEXTS.emptyFilteredSubtitle
                  : DOCUMENT_TABLE_TEXTS.empty?.subtitle
              }
            />
          )}
        </div>

        {/* Desktop: Dạng bảng */}
        <div className="doc-library-scroll hidden custom-scrollbar md:block">
          <table className="document-table w-full min-w-[860px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[var(--card-bg)]">
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="px-4 py-3 text-[11px] font-bold text-[var(--muted)]">{DOCUMENT_TABLE_TEXTS.colName}</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[var(--muted)]">{DOCUMENT_LIBRARY_TEXTS.metadataColumn}</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[var(--muted)]">{DOCUMENT_TABLE_TEXTS.colStatus}</th>
                {showActions && (
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-[var(--muted)]">{DOCUMENT_TABLE_TEXTS.colActions}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && documents.length === 0 ? (
                Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={index} />)
              ) : documents.length > 0 ? (
                documents.map((doc, index) => (
                  <tr
                    key={doc.id}
                    onClick={() => openReadyDocument(doc)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      openReadyDocument(doc);
                    }}
                    role={normalizeDocumentStatus(doc.status) === "ready" ? "link" : undefined}
                    tabIndex={normalizeDocumentStatus(doc.status) === "ready" ? 0 : undefined}
                    aria-label={
                      normalizeDocumentStatus(doc.status) === "ready"
                        ? `${DOCUMENT_LIBRARY_TEXTS.actions.chat}: ${getDocumentName(doc)}`
                        : undefined
                    }
                    className={cx(
                      "document-table-row row-enter group h-[92px] border-b border-[var(--border-subtle)] last:border-0 transition-colors",
                      normalizeDocumentStatus(doc.status) === "ready" ? "cursor-pointer hover:bg-[var(--surface)]" : "opacity-70"
                    )}
                    style={{ animationDelay: `${index * 35}ms` }}
                  >
                    <td className="px-4 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <DocumentIcon doc={doc} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--brand-primary)]">
                            {getDocumentName(doc)}
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium text-[var(--muted-light)]">{getDocumentExt(doc)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[12px] font-semibold text-[var(--foreground)]">{getDocumentDate(doc)}</p>
                      <p className="mt-1 text-[11px] font-medium text-[var(--muted)]">
                        {getDocumentSize(doc)} · {getDocumentPages(doc)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={normalizeDocumentStatus(doc.status)} />
                      </div>
                    </td>
                    {showActions && (
                      <td className="px-4 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                        <DocumentActions
                          doc={doc}
                          defaultAction={defaultAction}
                          deletingId={deletingId}
                          retryingId={retryingId}
                          onDelete={setPendingDelete}
                          onRetry={handleRetry}
                        />
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={showActions ? 4 : 3} className="p-0">
                    <EmptyState
                      icon={searchTerm || statusFilter !== "all" ? "search_off" : "cloud_upload"}
                      title={searchTerm || statusFilter !== "all" ? DOCUMENT_LIBRARY_TEXTS.emptyFilteredTitle : DOCUMENT_TABLE_TEXTS.empty?.title}
                      subtitle={
                        searchTerm || statusFilter !== "all"
                          ? DOCUMENT_LIBRARY_TEXTS.emptyFilteredSubtitle
                          : DOCUMENT_TABLE_TEXTS.empty?.subtitle
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!loading && documents.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            rangeEnd={rangeEnd}
            rangeStart={rangeStart}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </section>

      <ConfirmDialog
        open={!!pendingDelete}
        title={DOCUMENT_TABLE_TEXTS.deleteConfirm.title}
        message={DOCUMENT_LIBRARY_TEXTS.deleteConfirm.message(pendingDelete?.file_name || pendingDelete?.fileName || "")}
        confirmLabel={DOCUMENT_LIBRARY_TEXTS.deleteConfirm.confirm}
        cancelLabel={DOCUMENT_TABLE_TEXTS.deleteConfirm.cancel}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

    </>
  );
}
