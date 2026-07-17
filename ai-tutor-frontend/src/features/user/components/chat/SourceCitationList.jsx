import { cx } from "@/shared/ui/Premium";
import { CHAT_WORKSPACE_TEXTS } from "@/shared/constants/texts";

const T = CHAT_WORKSPACE_TEXTS.sources;

function normalizeSource(source, index) {
  if (typeof source === "string") {
    return { label: T.fallback(index), text: source };
  }
  if (!source || typeof source !== "object") {
    return { label: T.fallback(index), text: "" };
  }

  const page =
    source.page_number ?? source.pageNumber ?? source.page ?? source.metadata?.page_number ?? source.metadata?.page;
  const documentId = source.document_id ?? source.documentId ?? source.metadata?.document_id ?? source.metadata?.documentId;
  const title = source.title || source.file_name || source.document_name || T.fallback(index);
  const labelParts = [title];
  // Chỉ thêm trang nếu title chưa chứa thông tin trang
  if (page !== undefined && page !== null && page !== "" && !title.startsWith("Trang ")) labelParts.push(T.page(page));

  return {
    label: labelParts.join(" · "),
    page,
    documentId,
    text: source.chunk_text || source.text || source.content || source.snippet || source.page_content || "",
    section: source.section || null,
  };
}

export default function SourceCitationList({ sources = [], compact = false, inline = false, className = "", onOpenSource }) {
  const normalized = sources
    .map(normalizeSource)
    .filter((source) => source.text || source.label)
    .sort((a, b) => (a.page ?? Infinity) - (b.page ?? Infinity));
  if (normalized.length === 0) return null;

  return (
    <div className={cx(inline ? "flex flex-wrap gap-2" : compact ? "flex flex-col gap-2" : "space-y-2", className)}>
      {!compact && (
        <p className="font-mono text-[10px] font-semibold uppercase tracking-normal text-[var(--muted)]">{T.title}</p>
      )}
      {normalized.map((source, index) => (
        <details
          key={`${source.label}-${index}`}
          className={cx(
            "group border border-[var(--border-subtle)] bg-[var(--surface)] open:bg-[var(--card-bg)]",
            inline
              ? "flex-[0_1_auto] px-2.5 py-1 rounded-[var(--radius-chip)] open:rounded-[var(--radius-panel)] open:basis-full"
              : compact
                ? "w-full px-3 py-2 rounded-[var(--radius-panel)]"
                : "p-3 rounded-[var(--radius-panel)]"
          )}
          open={!compact && index === 0}
        >
          <summary className="cursor-pointer list-none text-[11px] font-semibold text-[var(--foreground)]">
            <span className="inline-flex w-full min-w-0 items-center justify-center gap-1.5">
              <span className="material-symbols-outlined icon-thin shrink-0 text-[15px] text-[var(--brand-primary)]">article</span>
              <span className="min-w-0 truncate" title={source.label}>{source.label}</span>

              {onOpenSource && (
                <button
                  type="button"
                  className="ml-1 grid h-6 w-6 shrink-0 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--card-bg-hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  title={T.openPdf}
                  aria-label={T.openPdf}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onOpenSource(source);
                  }}
                >
                  <span className="material-symbols-outlined icon-thin text-[15px]" aria-hidden="true">
                    picture_as_pdf
                  </span>
                </button>
              )}
            </span>
          </summary>

          <div className="mt-2 space-y-1.5">
            {/* Nhãn phần */}
            {source.section && (
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-[var(--muted)]">
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined icon-thin text-[12px]">segment</span>
                  {source.section}
                </span>
              </div>
            )}

            {/* Xem trước nội dung */}
            {source.text && (
              <p
                className={cx(
                  "line-clamp-5 text-[12px] font-medium leading-6 text-[var(--muted)]",
                  (compact || source.section) && "w-full border-t border-[var(--border-subtle)] pt-2"
                )}
              >
                {source.text}
              </p>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
