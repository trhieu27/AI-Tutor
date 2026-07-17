import { useEffect, useRef, useState } from "react";
import { getPaginationItems } from "@/shared/utils/paginationUtils";
import { Link } from "react-router-dom";
import { useDocuments } from "@/features/user/context/DocumentContext";
import { DOCUMENT_PICKER_TEXTS } from "@/shared/constants/texts";
import Button from "@/shared/ui/Button";
import LiquidGlassButton from "@/shared/ui/LiquidGlassButton";
import StatusBadge from "@/shared/ui/StatusBadge";
import { EmptyState, LoadingState, Skeleton } from "@/shared/ui/States";
import { cx } from "@/shared/ui/Premium";
import {
  getDocumentDate,
  getDocumentExt,
  getDocumentIcon,
  getDocumentName,
  getDocumentPages,
  getDocumentSize,
  normalizeDocumentStatus,
} from "@/features/user/components/documents/documentUtils";

const PAGE_SIZE_OPTIONS = [5, 10, 20];


function PickerPageSizeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const P = DOCUMENT_PICKER_TEXTS.pagination;

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
  const {
    pickerDocuments,
    pickerPagination,
    pickerLoading,
    pickerFetching,
    pickerFilters,
    setPickerFilters,
  } = useDocuments();

  const [query, setQuery] = useState(pickerFilters.search || "");
  const [localSelectedId, setLocalSelectedId] = useState(selectedId || null);

  // Đồng bộ prop showOnlyReady với context
  useEffect(() => {
    setPickerFilters((prev) => {
      if (prev.showOnlyReady === showOnlyReady) return prev;
      return { ...prev, showOnlyReady, page: 1 };
    });
  }, [showOnlyReady, setPickerFilters]);

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setPickerFilters((prev) => {
        if (prev.search === query) return prev;
        return { ...prev, search: query, page: 1 };
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [query, setPickerFilters]);

  const handlePageChange = (newPage) => {
    setPickerFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize) => {
    setPickerFilters((prev) => ({ ...prev, limit: newSize, page: 1 }));
  };


  const totalPages = pickerPagination.totalPages;
  const currentPage = pickerPagination.page;
  const pageSize = pickerFilters.limit;
  const rangeStart = pickerPagination.total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, pickerPagination.total);
  const pageItems = getPaginationItems(currentPage, totalPages);

  const activeId = selectedId || localSelectedId;
  const activeDocument = pickerDocuments.find((doc) => String(doc.id) === String(activeId));
  const ActionComponent = liquidAction ? LiquidGlassButton : Button;

  if (pickerLoading && pickerDocuments.length === 0) {
    return (
      <section
        className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--premium-shadow-sm)]"
        role="status"
        aria-label={DOCUMENT_PICKER_TEXTS.loading.title}
        aria-busy="true"
      >
        <div className="border-b border-[var(--border-subtle)] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-64" />
            </div>
            <Skeleton className="hidden h-10 w-56 rounded-[var(--radius-control)] md:block" />
          </div>
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3.5 px-5 py-4">
              <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
              <Skeleton className="hidden h-10 w-32 rounded-[var(--radius-control)] md:block" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={cx("rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--premium-shadow-sm)] relative transition-opacity duration-200", pickerFetching && "opacity-50 pointer-events-none")}>
      {pickerFetching && (
        <div className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden rounded-t-[var(--radius-panel)] bg-[var(--border-subtle)]">
          <div className="h-full w-1/3 bg-[var(--brand-primary)]" style={{ animation: 'slideBar 1s ease-in-out infinite' }} />
        </div>
      )}
      <div className="border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-semibold text-[var(--foreground)]">{title}</h2>
              <span className="rounded-[var(--radius-chip)] border border-[var(--border-subtle)] bg-[var(--surface)] px-2 py-1 text-[10px] font-bold text-[var(--muted)]">
                {DOCUMENT_PICKER_TEXTS.count(pickerDocuments.length)}
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

      {pickerDocuments.length === 0 ? (
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
          <div className="document-picker-list space-y-3 p-3 md:space-y-0 md:divide-y md:divide-[var(--border-subtle)] md:p-0">
            {pickerDocuments.map((doc) => {
              const isSelected = String(activeId) === String(doc.id);
              const actionTarget = actionForDocument?.(doc);
              const rowClassName = cx(
                "document-picker-row group grid gap-4 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3.5 py-4 text-left transition-[background,border-color,box-shadow] duration-150 sm:px-5 sm:py-4 md:min-h-[96px] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:rounded-none md:border-0 md:px-5",
                isSelected && "is-selected"
              );
              const actionControlClassName = cx(
                "inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] border px-4 text-[13px] font-semibold leading-snug transition-[background,border-color,color,box-shadow,transform] duration-150 group-hover:-translate-y-0.5 md:ml-auto md:h-10 md:w-auto",
                liquidAction
                  ? "border-transparent bg-[var(--brand-primary)] text-[var(--on-primary)] shadow-[0_12px_26px_var(--shadow-primary)]"
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
                <span>{DOCUMENT_PICKER_TEXTS.pagination.range(rangeStart, rangeEnd, pickerDocuments.length)}</span>
                <span className="separator">·</span>
                <span>{DOCUMENT_PICKER_TEXTS.pagination.page(currentPage, totalPages)}</span>
              </div>
              <PickerPageSizeSelect value={pageSize} onChange={handlePageSizeChange} />
            </div>

            <nav className="pagination-nav" aria-label="Phân trang">
              <button
                type="button"
                aria-label={DOCUMENT_PICKER_TEXTS.pagination.previous}
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
                    onClick={() => handlePageChange(item)}
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
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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
