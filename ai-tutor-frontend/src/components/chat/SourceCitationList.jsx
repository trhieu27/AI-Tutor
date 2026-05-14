import { cx } from "@/components/ui/Premium";
import { CHAT_WORKSPACE_TEXTS } from "@/constants/texts";

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
  const labelParts = [source.title || source.file_name || source.document_name || T.fallback(index)];
  if (page !== undefined && page !== null && page !== "") labelParts.push(T.page(page));

  return {
    label: labelParts.join(" · "),
    page,
    documentId,
    text: source.chunk_text || source.text || source.content || source.snippet || source.page_content || "",
  };
}

export default function SourceCitationList({ sources = [], compact = false, inline = false, className = "", onOpenSource }) {
  const normalized = sources.map(normalizeSource).filter((source) => source.text || source.label);
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
            "group rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] open:bg-[var(--card-bg)]",
            inline
              ? "min-w-[150px] max-w-[220px] flex-[0_1_180px] px-3 py-2 open:max-w-none open:basis-full"
              : compact
                ? "w-full px-3 py-2"
                : "p-3"
          )}
          open={!compact && index === 0}
        >
          <summary className="cursor-pointer list-none text-[11px] font-semibold text-[var(--foreground)]">
            <span className="inline-flex w-full min-w-0 items-center gap-2">
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
          {source.text && (
            <p
              className={cx(
                "mt-2 line-clamp-5 text-[12px] font-medium leading-6 text-[var(--muted)]",
                compact && "w-full border-t border-[var(--border-subtle)] pt-2"
              )}
            >
              {source.text}
            </p>
          )}
        </details>
      ))}
    </div>
  );
}
