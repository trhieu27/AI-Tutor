import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } from "docx";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  askQuestionStream,
  deleteChatSession,
  discardChatSession,
  truncateChatMessage,
  fetchChatSessions,
  fetchDocument,
  fetchDocumentFileBlob,
  fetchDocumentStudyQuestionsStream,
  fetchDocumentSummaryStream,
  fetchOlderMessages,
  fetchQuota,
  fetchSessionDetail,
  locateDocumentCitation,
  QuotaError,
} from "@/shared/services/api.service";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import Button, { IconButton } from "@/shared/ui/Button";
import LiquidGlassButton from "@/shared/ui/LiquidGlassButton";
import { EmptyState, ErrorState, Skeleton } from "@/shared/ui/States";
import ChatComposer from "@/features/user/components/chat/ChatComposer";
import ChatMessage from "@/features/user/components/chat/ChatMessage";
import ChatThreadList from "@/features/user/components/chat/ChatThreadList";
import DocumentContextPanel from "@/features/user/components/chat/DocumentContextPanel";
import { getDocumentName } from "@/features/user/components/documents/documentUtils";
import { cx } from "@/shared/ui/Premium";
import { CHAT_WORKSPACE_TEXTS } from "@/shared/constants/texts";
import ShareDialog from "@/shared/ui/ShareDialog";

const TEXTS = CHAT_WORKSPACE_TEXTS;
const CHAT_LAYOUT_STORAGE_KEYS = {
  historyCollapsed: "aiTutor.chat.historyCollapsed",
  contextOpen: "aiTutor.chat.contextOpen",
};
let pdfJsLibrary = null;

function loadPdfjs() {
  if (!pdfJsLibrary) {
    pdfJsLibrary = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return pdfjsLib;
    });
  }
  return pdfJsLibrary;
}

function readStoredBoolean(key, fallback = false) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return fallback;
    return value === "true";
  } catch {
    return fallback;
  }
}

function writeStoredBoolean(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(Boolean(value)));
  } catch {
    // Layout memory is optional; storage failures should not block chat.
  }
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

function parseQuestions(text) {
  const numberedPrefix = /^\s*(?:[-*]\s*)?\*{0,2}\d{1,2}\s*[\).\-\:]\s*\*{0,2}\s*/;

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => numberedPrefix.test(line))
    .map((line) => line.replace(numberedPrefix, "").trim())
    .filter((line) => line.length > 5);
}

function makeSafeFilename(value) {
  return String(value || "tom-tat-tai-lieu")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "tom-tat-tai-lieu";
}

function markdownToDocxParagraphs(content) {
  const lines = content.split("\n");
  const paragraphs = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Headings (check ### before ## before #)
    const h3 = trimmed.match(/^###\s+(.+)/);
    if (h3) { paragraphs.push(new Paragraph({ text: h3[1].replace(/\*+/g, ""), heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 80 } })); continue; }
    const h2 = trimmed.match(/^##\s+(.+)/);
    if (h2) { paragraphs.push(new Paragraph({ text: h2[1].replace(/\*+/g, ""), heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } })); continue; }
    const h1 = trimmed.match(/^#\s+(.+)/);
    if (h1) { paragraphs.push(new Paragraph({ text: h1[1].replace(/\*+/g, ""), heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } })); continue; }

    // Bullet list
    const bullet = trimmed.match(/^[-*]\s+(.+)/);
    if (bullet) {
      paragraphs.push(new Paragraph({
        children: parseInlineFormatting(bullet[1]),
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
      }));
      continue;
    }

    // Numbered list
    const numbered = trimmed.match(/^\d+[.)\s]+(.+)/);
    if (numbered) {
      paragraphs.push(new Paragraph({
        children: parseInlineFormatting(numbered[1]),
        numbering: { reference: "default-numbering", level: 0 },
        spacing: { before: 40, after: 40 },
      }));
      continue;
    }

    // Normal paragraph
    paragraphs.push(new Paragraph({
      children: parseInlineFormatting(trimmed),
      spacing: { before: 60, after: 60 },
    }));
  }

  return paragraphs;
}

function parseInlineFormatting(text) {
  const runs = [];
  // Split by bold+italic (***), bold (**), italic (*)
  const regex = /(\*{3}(.+?)\*{3})|(\*{2}(.+?)\*{2})|(\*(.+?)\*)|([^*]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true, italics: true, size: 24 }));
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], bold: true, size: 24 }));
    } else if (match[6]) {
      runs.push(new TextRun({ text: match[6], italics: true, size: 24 }));
    } else if (match[7]) {
      runs.push(new TextRun({ text: match[7], size: 24 }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text, size: 24 })];
}

async function downloadDocx(filename, content) {
  const doc = new Document({
    numbering: {
      config: [{
        reference: "default-numbering",
        levels: [{
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [{
      properties: {},
      children: markdownToDocxParagraphs(content),
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${makeSafeFilename(filename)}.docx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function StudyModalSkeleton({ type }) {
  const rows = type === "summary" ? 6 : 4;
  return (
    <div className="space-y-4" role="status" aria-label={type === "summary" ? TEXTS.modal.summaryLoading : TEXTS.modal.questionsLoading} aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={cx("space-y-2", type !== "summary" && "rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4")}>
          <Skeleton className={cx("h-3.5", index % 3 === 0 ? "w-3/5" : "w-4/5")} />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function StudyModal({ type, loading, summary, questions, documentName, onClose, onAskQuestion }) {
  const title = type === "summary" ? TEXTS.modal.summaryTitle : TEXTS.modal.questionsTitle;
  const icon = type === "summary" ? "summarize" : "help";
  const canDownloadSummary = type === "summary" && !loading && summary?.trim();

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[oklch(12%_0.018_238/0.42)] p-4 backdrop-blur-md">
      <section className="flex max-h-[86dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[0_24px_64px_oklch(12%_0.018_238/0.38)]">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--foreground)]">
            <span className="material-symbols-outlined icon-thin text-[18px] text-[var(--brand-primary)]">{icon}</span>
            {title}
          </h2>
          <IconButton label={TEXTS.modal.close} icon="close" onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
          {loading ? (
            <StudyModalSkeleton type={type} />
          ) : type === "summary" ? (
            <div className="prose-saas max-w-none text-[13px] leading-7">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary || TEXTS.modal.noSummary}</ReactMarkdown>
            </div>
          ) : questions.length > 0 ? (
            <div className="space-y-3">
              {questions.map((question, index) => (
                <article key={`${question}-${index}`} className="group rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                  <p className="text-[13px] font-semibold leading-6 text-[var(--foreground)]">{question}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="forum"
                    className="mt-3 w-full justify-center sm:w-auto"
                    onClick={() => {
                      onAskQuestion?.(question);
                      onClose();
                    }}
                  >
                    {TEXTS.modal.askAI}
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title={TEXTS.modal.noQuestionsTitle} subtitle={TEXTS.modal.noQuestionsSubtitle} />
          )}
        </div>
        <footer
          className={cx(
            "border-t border-[var(--border-subtle)] px-5 py-4",
            type === "summary"
              ? "grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center sm:justify-between"
              : "flex justify-end"
          )}
        >
          {type === "summary" ? (
            <Button
              variant="subtle"
              icon="download"
              className="min-w-0 px-3 text-[12px] sm:px-4 sm:text-[13px]"
              disabled={!canDownloadSummary}
              onClick={() => downloadDocx(`${documentName || "tai-lieu"}-tom-tat`, summary)}
            >
              <span className="sm:hidden">{TEXTS.modal.downloadShort}</span>
              <span className="hidden sm:inline">{TEXTS.modal.downloadSummary}</span>
            </Button>
          ) : (
            <span />
          )}
          <Button variant="secondary" className={type === "summary" ? "min-w-[84px] px-4" : ""} onClick={onClose}>
            {TEXTS.modal.close}
          </Button>
        </footer>
      </section>
    </div>,
    document.body
  );
}

function QuotaModal({ type, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[oklch(12%_0.018_238/0.42)] p-4 backdrop-blur-md">
      <section className="w-full max-w-md rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-6 text-center shadow-[0_24px_64px_oklch(12%_0.018_238/0.34)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--brand-warm)]">
          <span className="material-symbols-outlined text-[24px]">bolt</span>
        </span>
        <h2 className="mt-4 text-[18px] font-bold text-[var(--foreground)]">{TEXTS.quota.title}</h2>
        <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--muted)]">
          {type === "chat" ? TEXTS.quota.chat : TEXTS.quota.ai}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button to="/pricing" icon="workspace_premium">
            {TEXTS.quota.viewPlan}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {TEXTS.quota.later}
          </Button>
        </div>
      </section>
    </div>,
    document.body
  );
}

function readPositivePage(value) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? page : null;
}

function getExplicitCitationPage(source) {
  return (
    readPositivePage(source?.page) ??
    readPositivePage(source?.page_number) ??
    readPositivePage(source?.pageNumber) ??
    readPositivePage(source?.metadata?.page_number) ??
    readPositivePage(source?.metadata?.page)
  );
}

function inferCitationPageFromText(text) {
  const pageHint = String(text || "").match(/\bOOAD\s+(\d{1,4})\b/i) || String(text || "").match(/\b(?:trang|slide|page)\s+(\d{1,4})\b/i);
  return pageHint ? readPositivePage(pageHint[1]) : null;
}

function inferCitationPage(source) {
  const explicitPage = getExplicitCitationPage(source);
  if (explicitPage) return explicitPage;

  const text = String(source?.text || "");
  return inferCitationPageFromText(text);
}

function PdfPreviewSkeleton() {
  return (
    <div className="min-h-0 flex-1 bg-[var(--surface)] p-5" role="status" aria-label={TEXTS.sources.pdfLoading} aria-busy="true">
      <div className="mx-auto h-full max-w-3xl rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
        <div className="mt-8 space-y-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className={cx("h-3", index % 4 === 0 ? "w-5/6" : "w-full")} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PdfToolbarButton({ label, icon, disabled, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--foreground)] transition hover:border-[var(--border-emphasis)] hover:bg-[var(--card-bg-hover)] disabled:pointer-events-none disabled:opacity-40"
    >
      <span className="material-symbols-outlined icon-thin text-[18px]" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}

function PdfCanvasViewer({ objectUrl, page, onPageChange, onTotalPagesChange }) {
  const shellRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [fitKey, setFitKey] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!objectUrl) return undefined;
    let active = true;
    let loadedDoc = null;
    let loadingTask = null;
    setPdfDoc(null);
    setError("");

    loadPdfjs()
      .then((pdfjsLib) => {
        if (!active) return null;
        loadingTask = pdfjsLib.getDocument(objectUrl);
        return loadingTask.promise;
      })
      .then((doc) => {
        if (!doc) return;
        loadedDoc = doc;
        if (!active) {
          doc.destroy();
          return;
        }
        setPdfDoc(doc);
        onTotalPagesChange(doc.numPages || 0);
        if (page > doc.numPages) onPageChange(doc.numPages || 1);
      })
      .catch(() => {
        if (active) setError(TEXTS.sources.pdfError);
      });

    return () => {
      active = false;
      loadingTask?.destroy?.();
      loadedDoc?.destroy?.();
    };
  }, [objectUrl, onPageChange, onTotalPagesChange]);

  useEffect(() => {
    const node = shellRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => setFitKey((value) => value + 1));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !shellRef.current) return undefined;
    let active = true;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    setRendering(true);
    setError("");
    renderTaskRef.current?.cancel?.();

    pdfDoc
      .getPage(page)
      .then((pdfPage) => {
        if (!active) return null;
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const availableWidth = Math.max(280, shellRef.current.clientWidth - 28);
        const fitScale = availableWidth / baseViewport.width;
        const scale = Math.min(3, Math.max(0.15, fitScale * zoom));
        const viewport = pdfPage.getViewport({ scale });
        const outputScale = Math.min(2.5, window.devicePixelRatio || 1);

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        const renderTask = pdfPage.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        return renderTask.promise;
      })
      .then(() => {
        if (active) setRendering(false);
      })
      .catch((err) => {
        if (!active || err?.name === "RenderingCancelledException") return;
        setError(TEXTS.sources.pdfError);
        setRendering(false);
      });

    return () => {
      active = false;
      renderTaskRef.current?.cancel?.();
    };
  }, [fitKey, page, pdfDoc, zoom]);

  // Pinch-to-zoom on mobile — use ref so listeners stay stable throughout gesture
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return undefined;
    let startDist = 0;
    let startZoom = 1;

    function getDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }

    function onTouchStart(event) {
      if (event.touches.length === 2) {
        event.preventDefault();
        startDist = getDistance(event.touches);
        startZoom = zoomRef.current;
      }
    }

    function onTouchMove(event) {
      if (event.touches.length === 2 && startDist > 0) {
        event.preventDefault();
        const dist = getDistance(event.touches);
        const scale = dist / startDist;
        setZoom(Math.min(3, Math.max(0.1, Number((startZoom * scale).toFixed(2)))));
      }
    }

    function onTouchEnd() {
      startDist = 0;
    }

    node.addEventListener("touchstart", onTouchStart, { passive: false });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd);
    node.addEventListener("touchcancel", onTouchEnd);
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const totalPages = pdfDoc?.numPages || 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--surface)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--card-bg)] px-3 py-2">
        <div className="inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface)] p-1">
          <PdfToolbarButton label={TEXTS.sources.previousPage} icon="chevron_left" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} />
          <span className="min-w-[72px] px-2 text-center text-[11px] font-bold text-[var(--muted)]">
            {totalPages ? `${page}/${totalPages}` : TEXTS.sources.page(page)}
          </span>
          <PdfToolbarButton label={TEXTS.sources.nextPage} icon="chevron_right" disabled={!totalPages || page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} />
        </div>

        <div className="ml-auto inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface)] p-1">
          <PdfToolbarButton label={TEXTS.sources.zoomOut} icon="remove" disabled={zoom <= 0.15} onClick={() => setZoom((value) => Math.max(0.1, Number((value - 0.10).toFixed(2))))} />
          <button
            type="button"
            className="h-8 rounded-lg px-2 text-[11px] font-bold text-[var(--muted)] transition hover:bg-[var(--card-bg-hover)] hover:text-[var(--foreground)]"
            onClick={() => setZoom(1)}
          >
            {Math.round(zoom * 100)}%
          </button>
          <PdfToolbarButton label={TEXTS.sources.zoomIn} icon="add" disabled={zoom >= 2.8} onClick={() => setZoom((value) => Math.min(3, Number((value + 0.10).toFixed(2))))} />
        </div>
      </div>

      <div ref={shellRef} className="relative min-h-0 flex-1 overflow-auto p-3 custom-scrollbar touch-manipulation">
        {error ? (
          <div className="grid h-full min-h-[360px] place-items-center text-center text-[13px] font-semibold text-[var(--muted)]">
            {error}
          </div>
        ) : (
          <div className="mx-auto min-h-[360px] w-max max-w-none">
            <canvas ref={canvasRef} className="block rounded-sm bg-[oklch(99%_0.004_238)] shadow-[0_12px_28px_oklch(12%_0.018_238/0.18)] transition-[width,height] duration-150 ease-out" />
          </div>
        )}
        {(!pdfDoc || rendering) && !error && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-[var(--border-subtle)] bg-[var(--card-bg)] px-3 py-1 text-[11px] font-bold text-[var(--muted)] shadow-[var(--premium-shadow-sm)]">
            {TEXTS.sources.pdfLoading}
          </div>
        )}
      </div>
    </div>
  );
}

function PdfPreviewModal({ source, fallbackDocumentId, documentName, onClose }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [error, setError] = useState("");
  const [resolvedPage, setResolvedPage] = useState(() => getExplicitCitationPage(source));
  const [totalPages, setTotalPages] = useState(0);
  const sourceDocumentId = source?.documentId || fallbackDocumentId;
  const displayTitle = documentName || TEXTS.sources.pdfTitle;

  useEffect(() => {
    let active = true;
    let url = "";
    const initialPage = getExplicitCitationPage(source);
    setObjectUrl("");
    setError("");
    setResolvedPage(initialPage);
    setTotalPages(0);

    if (!sourceDocumentId) {
      setError(TEXTS.sources.pdfError);
      return undefined;
    }

    const blobPromise = fetchDocumentFileBlob(sourceDocumentId)
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => {
        if (active) setError(TEXTS.sources.pdfError);
      });

    const shouldLocatePage = !initialPage && source?.text;
    const locatePromise = shouldLocatePage
      ? locateDocumentCitation(sourceDocumentId, source.text)
          .then((result) => {
            const page = Number(result?.page_number);
            if (active && Number.isFinite(page) && page > 0) setResolvedPage(page);
          })
          .catch(() => {
            const fallbackPage = inferCitationPage(source);
            if (active && !initialPage && fallbackPage) setResolvedPage(fallbackPage);
          })
      : Promise.resolve();

    Promise.allSettled([blobPromise, locatePromise]);

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [source, sourceDocumentId]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[oklch(12%_0.018_238/0.48)] p-2 backdrop-blur-md sm:p-4">
      <section className="flex h-[min(88dvh,820px)] w-[calc(100vw-16px)] max-w-5xl flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[0_24px_64px_oklch(12%_0.018_238/0.38)] sm:h-[min(88dvh,820px)] sm:w-full">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4">
          <h2 className="truncate text-[13px] font-semibold text-[var(--foreground)]">
            {displayTitle}{resolvedPage ? ` · ${totalPages ? `${resolvedPage}/${totalPages}` : TEXTS.sources.page(resolvedPage)}` : ""}
          </h2>
          <IconButton label={TEXTS.modal.close} icon="close" onClick={onClose} />
        </header>
        {error ? (
          <div className="grid flex-1 place-items-center p-6 text-center text-[13px] font-semibold text-[var(--muted)]">
            {error}
          </div>
        ) : objectUrl ? (
          <PdfCanvasViewer
            objectUrl={objectUrl}
            page={resolvedPage || 1}
            onPageChange={setResolvedPage}
            onTotalPagesChange={setTotalPages}
          />
        ) : (
          <PdfPreviewSkeleton />
        )}
      </section>
    </div>,
    document.body
  );
}

function ChatWorkspaceSkeleton() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 bg-[var(--background)] lg:grid-cols-[220px_minmax(0,1fr)_260px]" role="status" aria-label={TEXTS.page.loadingTitle} aria-busy="true">
      <aside className="hidden border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] p-3 lg:block">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="mt-4 h-11 w-full rounded-[10px]" />
        <Skeleton className="mt-2 h-10 w-full rounded-[10px]" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-14 w-full rounded-[10px]" />
          <Skeleton className="h-14 w-full rounded-[10px]" />
          <Skeleton className="h-14 w-full rounded-[10px]" />
        </div>
      </aside>
      <section className="flex min-h-0 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-color)] bg-[var(--header-bg)] px-4">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </header>
        <div className="min-h-0 flex-1 px-5 py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            <Skeleton className="ml-auto h-16 w-3/5 rounded-[var(--radius-panel)]" />
            <div className="space-y-3 rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--border-color)] px-4 py-2.5">
          <div className="mx-auto max-w-3xl">
            <Skeleton className="h-16 w-full rounded-[var(--radius-panel)]" />
          </div>
        </div>
      </section>
      <aside className="hidden border-l border-[var(--border-color)] bg-[var(--card-bg)] p-3 lg:block">
        <Skeleton className="h-3 w-28" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </aside>
    </div>
  );
}

function PipelineLoadingIndicator() {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3.5 py-2.5" aria-live="polite">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-primary)] opacity-35" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--brand-primary)]" />
      </span>
      <span className="text-[12px] font-semibold text-[var(--muted)]">Đang tìm câu trả lời...</span>
    </div>
  );
}

/** Trang chat AI — giao diện hỏi-đáp chính với document context và PDF preview */
export default function ChatPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialAction = searchParams.get("action");
  const initialSessionRef = useRef(searchParams.get("session"));
  const initialSession = initialSessionRef.current;
  const hasHandledInitialAction = useRef(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const topSentinelRef = useRef(null);
  const abortRef = useRef(null);
  const activeAskRef = useRef(null);
  const docNameRef = useRef("");
  const isFetchingOlderRef = useRef(false);
  const composerRef = useRef(null);
  const instantScrollRef = useRef(true);
  const suppressScrollRef = useRef(false);
  const newSessionRef = useRef(null); // ID session vừa tạo, chưa hoàn tất

  const [docData, setDocData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(() =>
    readStoredBoolean(CHAT_LAYOUT_STORAGE_KEYS.historyCollapsed, false)
  );
  const [contextOpen, setContextOpen] = useState(() =>
    readStoredBoolean(CHAT_LAYOUT_STORAGE_KEYS.contextOpen, false)
  );
  const [sessionSearch, setSessionSearch] = useState("");
  const [quota, setQuota] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [summary, setSummary] = useState("");
  const [studyQuestions, setStudyQuestions] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [pdfPreviewSource, setPdfPreviewSource] = useState(null);
  const [deleteSessionId, setDeleteSessionId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [shareOpen, setShareOpen] = useState(null); // sessionId or null

  const refreshSessions = useCallback(async () => {
    try {
      const list = await fetchChatSessions(documentId, { page: 1, limit: 100 });
      const items = Array.isArray(list) ? list : (list.items || []);
      setSessions(items);
      return items;
    } finally {
      setSessionsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    writeStoredBoolean(CHAT_LAYOUT_STORAGE_KEYS.historyCollapsed, historyCollapsed);
  }, [historyCollapsed]);

  useEffect(() => {
    writeStoredBoolean(CHAT_LAYOUT_STORAGE_KEYS.contextOpen, contextOpen);
  }, [contextOpen]);

  const loadSession = useCallback(
    async (sessionId, options = {}) => {
      if (!sessionId) return;
      if (activeAskRef.current) activeAskRef.current.cancelled = true;
      activeAskRef.current?.controller?.abort();
      abortRef.current?.abort();
      setIsSending(false);
      try {
        const detail = await fetchSessionDetail(sessionId);
        instantScrollRef.current = true;
        setMessages(detail.messages || []);
        setHasMore(detail.has_more || false);
        setCurrentSessionId(sessionId);
        if (!options.silentUrl) navigate(`/chat/${documentId}?session=${sessionId}`, { replace: true });
        setHistoryOpen(false);
      } catch (err) {
        console.error(err);
      }
    },
    [documentId, navigate]
  );

  // Load older messages when user scrolls to top (Messenger-style)
  const loadOlderMessages = useCallback(async () => {
    if (!currentSessionId || !hasMore || isFetchingOlderRef.current) return;
    const firstMsg = messages[0];
    if (!firstMsg?.id) return;
    isFetchingOlderRef.current = true;
    try {
      const container = scrollContainerRef.current;
      const prevScrollHeight = container?.scrollHeight || 0;
      const result = await fetchOlderMessages(currentSessionId, firstMsg.id);
      if (result.messages?.length > 0) {
        suppressScrollRef.current = true;
        setMessages(prev => [...result.messages, ...prev]);
        setHasMore(result.has_more || false);
        // Preserve scroll position after prepending
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop += (newScrollHeight - prevScrollHeight);
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      isFetchingOlderRef.current = false;
    }
  }, [currentSessionId, hasMore, messages]);

  // IntersectionObserver: trigger loadOlderMessages when top sentinel is visible
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadOlderMessages(); },
      { root: scrollContainerRef.current, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadOlderMessages]);

  useEffect(() => {
    let active = true;
    async function load() {
      setPageLoading(true);
      setError(null);
      try {
        const [doc, sessResult] = await Promise.all([
          fetchDocument(documentId),
          fetchChatSessions(documentId, { page: 1, limit: 100 }),
        ]);
        if (!active) return;
        const list = Array.isArray(sessResult) ? sessResult : (sessResult.items || []);
        docNameRef.current = getDocumentName(doc);
        setDocData(doc);
        setSessions(list);
        if (initialSession) await loadSession(initialSession, { silentUrl: true });
        else if (list.length > 0) await loadSession(list[0].id, { silentUrl: true });
        fetchQuota().then(setQuota).catch(() => {});
      } catch (err) {
        if (!active) return;
        console.error(err);
        setError(TEXTS.page.loadError);
      } finally {
        if (active) setPageLoading(false);
      }
    }
    load();
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [documentId, loadSession]);

  useEffect(() => {
    // Skip scroll khi prepend tin cũ
    if (suppressScrollRef.current) {
      suppressScrollRef.current = false;
      return;
    }
    if (instantScrollRef.current) {
      // Mở/đổi session → scroll instant xuống cuối
      messagesEndRef.current?.scrollIntoView({ behavior: "instant", block: "end" });
      instantScrollRef.current = false;
    } else {
      // Chỉ auto-scroll nếu user đang ở gần cuối (< 150px)
      const container = scrollContainerRef.current;
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < 150) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }
    }
  }, [messages, isSending]);

  const handleQuickAction = useCallback(
    async (action) => {
      if (action === "quiz") {
        navigate(`/quiz/${documentId}`);
        return;
      }
      if (action === "mindmap") {
        navigate(`/mindmap/${documentId}`);
        return;
      }
      if (action === "explain") {
        composerRef.current?.setValue(TEXTS.page.explainPrompt);
        return;
      }
      if (action === "summary") {
        setModalType("summary");
        setSummary("");
        setModalLoading(true);
        const controller = new AbortController();
        abortRef.current = controller;
        try {
          await fetchDocumentSummaryStream(
            documentId,
            (chunk) => {
              setSummary((prev) => prev + chunk);
              setModalLoading(false);
            },
            controller.signal
          );
        } catch (err) {
          if (err?.name === "AbortError") return;
          if (err instanceof QuotaError) {
            setModalType(null);
            setQuotaExceeded("ai");
          } else {
            setSummary((prev) => `${prev}\n\n${TEXTS.page.summaryError}`);
          }
        } finally {
          setModalLoading(false);
          abortRef.current = null;
        }
        return;
      }
      if (action === "questions") {
        setModalType("questions");
        setStudyQuestions([]);
        setModalLoading(true);
        const controller = new AbortController();
        abortRef.current = controller;
        let accumulated = "";
        try {
          await fetchDocumentStudyQuestionsStream(
            documentId,
            (chunk) => {
              accumulated += chunk;
              setStudyQuestions(parseQuestions(accumulated));
              setModalLoading(false);
            },
            controller.signal
          );
        } catch (err) {
          if (err?.name === "AbortError") return;
          if (err instanceof QuotaError) {
            setModalType(null);
            setQuotaExceeded("ai");
          }
        } finally {
          setModalLoading(false);
          abortRef.current = null;
        }
      }
    },
    [documentId, navigate]
  );

  useEffect(() => {
    if (hasHandledInitialAction.current || pageLoading) return;
    hasHandledInitialAction.current = true;
    if (initialAction === "summary") handleQuickAction("summary");
    if (initialAction === "questions") handleQuickAction("questions");
    if (initialAction === "quiz") handleQuickAction("quiz");
    if (initialAction === "mindmap") handleQuickAction("mindmap");
    if (initialAction === "explain") composerRef.current?.setValue(TEXTS.page.initialExplainPrompt);
  }, [handleQuickAction, initialAction, pageLoading]);

  const filteredSessions = useMemo(() => {
    const query = normalizeSearchText(sessionSearch);
    return sessions
      .filter((session) => !query || normalizeSearchText(session.title || TEXTS.threads.fallbackTitle).includes(query))
      .sort((a, b) => new Date(b.updated_at || b.updatedAt) - new Date(a.updated_at || a.updatedAt));
  }, [sessionSearch, sessions]);

  const lastSources = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((message) => (message.role === "assistant" || message.isAssistant) && message.sources?.length);
    return lastAssistant?.sources || [];
  }, [messages]);

  const lastPipeline = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((message) => (message.role === "assistant" || message.isAssistant) && message.pipeline);
    return lastAssistant?.pipeline || null;
  }, [messages]);


  const handleSend = async (text) => {
    const question = (text || composerRef.current?.getValue() || "").trim();
    if (!question || isSending) return;
    setSuggestions([]);

    const requestId = `ask-${Date.now()}`;
    const aiMsgId = `stream-${requestId}`;
    const userMessage = {
      id: `local-${requestId}`,
      session_id: currentSessionId || "",
      role: "user",
      content: question,
      created_at: new Date().toISOString(),
      sources: [],
    };
    // Add user message + AI placeholder
    setMessages((prev) => [...prev, userMessage, {
      id: aiMsgId,
      session_id: currentSessionId || "",
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      sources: [],
      _streaming: true,
    }]);
    composerRef.current?.clear();
    instantScrollRef.current = true; // Luôn scroll xuống khi gửi tin mới
    setIsSending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    activeAskRef.current = { id: requestId, controller, userMessageId: userMessage.id, cancelled: false };

    const isActiveRequest = () =>
      activeAskRef.current && activeAskRef.current.id === requestId && !activeAskRef.current.cancelled && !controller.signal.aborted;

    try {
      const response = await askQuestionStream(
        documentId,
        {
          question,
          session_id: currentSessionId || undefined,
        },
        // onChunk: append text to AI message progressively
        (chunk) => {
          if (!isActiveRequest()) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId ? { ...msg, content: msg.content + chunk, _status: null } : msg
            )
          );
        },
        controller.signal,
        // onStatus: show pipeline progress
        (step) => {
          if (!isActiveRequest()) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId ? { ...msg, _status: step } : msg
            )
          );
        },
        // onSession: track session ID sớm để xóa nếu cancel
        (sessionId) => {
          newSessionRef.current = sessionId;
        },
        // onSuggestions: receive follow-up suggestion chips
        setSuggestions
      );

      if (!isActiveRequest()) return;

      const nextSessionId = response.session_id || currentSessionId;
      if (nextSessionId && !currentSessionId) {
        newSessionRef.current = nextSessionId;
        setCurrentSessionId(nextSessionId);
        navigate(`/chat/${documentId}?session=${nextSessionId}`, { replace: true });
      }
      // Finalize AI message with sources and pipeline metadata
      const finalMsg = response.message || {};
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                id: finalMsg.id || aiMsgId,
                session_id: response.session_id || msg.session_id,
                content: finalMsg.content || msg.content,
                sources: finalMsg.sources || response.sources || [],
                pipeline: response.pipeline || null,
                _streaming: false,
              }
            : msg
        )
      );
      await refreshSessions();
      fetchQuota().then(setQuota).catch(() => {});
    } catch (err) {
      if ((err && err.name === "AbortError") || !isActiveRequest()) return;
      if (err instanceof QuotaError) {
        setMessages((prev) => prev.filter((message) => message.id !== userMessage.id && message.id !== aiMsgId));
        setQuotaExceeded("chat");
        return;
      }
      // Replace streaming placeholder with error message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, content: msg.content || (err.message || TEXTS.page.assistantError), _streaming: false }
            : msg
        )
      );
    } finally {
      if (activeAskRef.current && activeAskRef.current.id === requestId) {
        setIsSending(false);
        abortRef.current = null;
        activeAskRef.current = null;
        newSessionRef.current = null; // Hoàn tất → không cần xóa nữa
      }
    }
  };

  const handleCancel = () => {
    if (activeAskRef.current) activeAskRef.current.cancelled = true;
    activeAskRef.current?.controller?.abort();
    abortRef.current?.abort();
    setIsSending(false);
    newSessionRef.current = null;
    setMessages((prev) =>
      prev
        .map((msg) => (msg._streaming ? { ...msg, _streaming: false } : msg))
        .filter((msg) => !(msg.role === "assistant" && !msg.content))
    );
  };

  const startNewChat = () => {
    if (activeAskRef.current) activeAskRef.current.cancelled = true;
    // Session mới chưa có history → discard (không lưu)
    // Session cũ đã có history → để backend lưu partial
    if (newSessionRef.current) {
      discardChatSession(newSessionRef.current).catch(() => {});
    }
    activeAskRef.current?.controller?.abort();
    abortRef.current?.abort();
    setIsSending(false);
    newSessionRef.current = null;
    setCurrentSessionId(null);
    setMessages([]);
    navigate(`/chat/${documentId}`, { replace: true });
    setHistoryOpen(false);
  };

  const handleDeleteSession = (sessionId) => setDeleteSessionId(sessionId);

  const confirmDeleteSession = async () => {
    const sessionId = deleteSessionId;
    setDeleteSessionId(null);
    if (!sessionId) return;
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((session) => String(session.id) !== String(sessionId)));
      if (String(currentSessionId) === String(sessionId)) startNewChat();
    } catch (err) {
      console.error(err);
    }
  };

  if (pageLoading) {
    return (
      <div className="h-full overflow-hidden">
        <ChatWorkspaceSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto">
        <ErrorState
          title={error}
          subtitle={TEXTS.page.errorSubtitle}
          action={<Button to="/learning" icon="library_books">{TEXTS.page.openLibrary}</Button>}
          className="min-h-full"
        />
      </div>
    );
  }

  const desktopColumns = `${historyCollapsed ? "48px" : "220px"} minmax(0,1fr)${contextOpen ? " 260px" : ""}`;

  return (
    <>
      <div
        className="chat-layout-grid grid h-full min-h-0 grid-cols-1 bg-[var(--background)]"
        style={{ '--_cols': desktopColumns }}
      >
        <style>{`@media(min-width:1024px){.chat-layout-grid{grid-template-columns:var(--_cols)!important;transition:grid-template-columns .25s ease}}`}</style>
        <div className="hidden min-h-0 overflow-hidden lg:block">
          {historyCollapsed ? (
            <aside className="flex h-full flex-col items-center border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] py-3 text-[var(--foreground)]">
              <div className="flex flex-col items-center gap-2">
                {[
                  { label: TEXTS.page.openHistory, icon: "dock_to_right", onClick: () => setHistoryCollapsed(false) },
                  { label: TEXTS.threads?.newSession || "Mới", icon: "edit_square", onClick: startNewChat },
                  { label: "Tìm kiếm", icon: "search", onClick: () => setHistoryCollapsed(false) },
                ].map((item) => (
                  <button
                    key={item.icon}
                    type="button"
                    aria-label={item.label}
                    onClick={item.onClick}
                    className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  >
                    <span className="material-symbols-outlined icon-thin text-[22px]" aria-hidden="true">
                      {item.icon}
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          ) : (
            <ChatThreadList
              sessions={filteredSessions}
              activeSessionId={currentSessionId}
              onSelect={loadSession}
              onDelete={handleDeleteSession}
              onShare={(sid) => setShareOpen(sid)}
              onNewChat={startNewChat}
              onCollapse={() => setHistoryCollapsed(true)}
              search={sessionSearch}
              onSearch={setSessionSearch}
              loading={sessionsLoading}
            />
          )}
        </div>

        <section className="flex min-h-0 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--header-bg)] px-3 backdrop-blur-md sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <IconButton label={TEXTS.page.openHistory} icon="history" className="lg:hidden" onClick={() => setHistoryOpen(true)} />
              <div className="min-w-0">
                <h1 className="truncate text-[13px] font-semibold text-[var(--foreground)]">{docData ? getDocumentName(docData) : TEXTS.page.titleFallback}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                label={contextOpen ? TEXTS.page.closeContext : TEXTS.page.openContext}
                icon="more_vert"
                aria-expanded={contextOpen}
                className={cx(contextOpen && "bg-[var(--surface)] text-[var(--foreground)]")}
                onClick={() => setContextOpen((open) => !open)}
              />
            </div>
          </header>

          <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center py-8">
                <EmptyState
                  icon="forum"
                  title={TEXTS.page.emptyTitle}
                  subtitle={TEXTS.page.emptySubtitle}
                  action={
                    <LiquidGlassButton icon="summarize" onClick={() => handleQuickAction("summary")}>
                      {TEXTS.page.emptySummaryAction}
                    </LiquidGlassButton>
                  }
                  secondaryAction={<Button to="/chat" variant="secondary" icon="swap_horiz">{TEXTS.page.chooseDocument}</Button>}
                />
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-5">
                {/* Top sentinel — triggers loading older messages on scroll up */}
                <div ref={topSentinelRef} className="h-1" />
                {hasMore && (
                  <div className="flex justify-center py-2">
                    <span className="text-[11px] font-medium text-[var(--muted)]">Đang tải tin nhắn cũ...</span>
                  </div>
                )}
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id || `${message.role}-${message.created_at}`}
                    message={message}
                    onOpenSource={(source) => setPdfPreviewSource(source)}
                    streaming={message._streaming}
                  />
                ))}
                {suggestions.length > 0 && !isSending && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] shadow-[var(--premium-shadow-sm)] transition-all duration-150 hover:border-[var(--brand-primary)] hover:bg-[var(--surface)] hover:shadow-[var(--premium-shadow)] active:scale-[0.97]"
                        onClick={() => {
                          setSuggestions([]);
                          composerRef.current?.setValue(suggestion);
                          composerRef.current?.focus();
                        }}
                      >
                        <span className="material-symbols-outlined icon-thin text-[14px] text-[var(--brand-primary)]">auto_awesome</span>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[var(--border-color)] bg-[linear-gradient(180deg,transparent,var(--background)_22%)] px-3 py-2 sm:px-4 sm:py-2.5">
            <div className="mx-auto max-w-3xl">
              <ChatComposer
                ref={composerRef}
                onSubmit={handleSend}
                onCancel={handleCancel}
                loading={isSending}
                disabled={!docData || docData.status !== "READY"}
                placeholder={TEXTS.composer.placeholder}
              />
            </div>
          </div>
        </section>

        {contextOpen && (
          <div className="hidden min-h-0 lg:block">
            <DocumentContextPanel document={docData} sources={lastSources} quota={quota} onQuickAction={handleQuickAction} lastPipeline={lastPipeline} />
          </div>
        )}
      </div>

      {historyOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9998] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-[oklch(12%_0.018_238/0.55)] backdrop-blur-sm"
              onClick={() => setHistoryOpen(false)}
              aria-label={TEXTS.page.closeHistory}
            />
            <div className="absolute inset-y-0 left-0 w-[min(86vw,320px)] bg-[var(--sidebar-bg)] shadow-2xl">
              <ChatThreadList
                sessions={filteredSessions}
                activeSessionId={currentSessionId}
                onSelect={loadSession}
                onDelete={handleDeleteSession}
                onShare={(sid) => setShareOpen(sid)}
                onNewChat={startNewChat}
                search={sessionSearch}
                onSearch={setSessionSearch}
                loading={sessionsLoading}
              />
            </div>
          </div>,
          document.body
        )}

      {contextOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9998] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-[oklch(12%_0.018_238/0.55)] backdrop-blur-sm"
              onClick={() => setContextOpen(false)}
              aria-label={TEXTS.page.closeContext}
            />
            <div className="absolute inset-y-0 right-0 w-[min(88vw,360px)] bg-[var(--card-bg)] shadow-2xl">
              <DocumentContextPanel document={docData} sources={lastSources} quota={quota} onQuickAction={handleQuickAction} lastPipeline={lastPipeline} />
            </div>
          </div>,
          document.body
        )}

      {modalType && (
        <StudyModal
          type={modalType}
          loading={modalLoading}
          summary={summary}
          questions={studyQuestions}
          documentName={docData ? getDocumentName(docData) : ""}
          onClose={() => {
            setModalType(null);
            abortRef.current?.abort();
          }}
          onAskQuestion={(question) => composerRef.current?.setValue(TEXTS.page.askStudyQuestion(question))}
        />
      )}

      {quotaExceeded && <QuotaModal type={quotaExceeded} onClose={() => setQuotaExceeded(null)} />}
      <ConfirmDialog
        open={!!deleteSessionId}
        title={TEXTS.page.deleteConfirm}
        message="Cuộc trò chuyện và toàn bộ tin nhắn sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa"
        cancelLabel="Huỷ"
        variant="danger"
        onConfirm={confirmDeleteSession}
        onCancel={() => setDeleteSessionId(null)}
      />
      {pdfPreviewSource && (
        <PdfPreviewModal
          source={pdfPreviewSource}
          fallbackDocumentId={documentId}
          documentName={docNameRef.current}
          onClose={() => setPdfPreviewSource(null)}
        />
      )}
      {shareOpen && (
        <ShareDialog
          sessionId={shareOpen}
          onClose={() => setShareOpen(null)}
        />
      )}
    </>
  );
}
