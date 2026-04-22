"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocumentResponse, deleteDocument } from "@/services/api.service";
import { DOCUMENT_TABLE_TEXTS } from "@/constants/texts";
import { useUpload } from "@/context/UploadContext";
import { useDocuments } from "@/context/DocumentContext";
import ConfirmDialog from "@/components/ConfirmDialog";

interface DocumentTableProps {
  refreshTrigger?: number;
  showActions?: boolean;
  defaultAction?: "summary" | "quiz" | "mindmap" | "questions";
  limit?: number;
}

/* ── Skeleton row ─────────────────────────────────────────── */
function SkeletonRow({ index, showActions }: { index: number; showActions?: boolean }) {
  return (
    <tr
      className="row-enter border-b border-[var(--border-subtle)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <td className="py-3.5 px-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg shimmer shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-3/4 rounded-full shimmer" />
            <div className="h-2 w-1/3 rounded-full shimmer" />
          </div>
        </div>
      </td>
      <td className="py-3.5 px-4 text-center">
        <div className="h-3 w-16 rounded-full shimmer mx-auto" />
      </td>
      <td className="py-3.5 px-4 text-center">
        <div className="h-3 w-12 rounded-full shimmer mx-auto" />
      </td>
      <td className="py-3.5 px-4 text-center">
        <div className="h-5 w-20 rounded-md shimmer mx-auto" />
      </td>
      {showActions && (
        <td className="py-3.5 px-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <div className="w-7 h-7 rounded-md shimmer" />
            <div className="w-7 h-7 rounded-md shimmer" />
            <div className="w-7 h-7 rounded-md shimmer" />
            <div className="w-7 h-7 rounded-md shimmer" />
          </div>
        </td>
      )}
    </tr>
  );
}

export default function DocumentTable({
  refreshTrigger = 0,
  showActions = false,
  defaultAction,
  limit,
}: DocumentTableProps) {
  const router = useRouter();
  const { lastUploadTime } = useUpload();
  const { documents, loading, refreshDocuments } = useDocuments();

  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const getRedirectUrl = (docId: string) => {
    if (defaultAction === "mindmap") return `/mindmap/${docId}`;
    if (defaultAction === "quiz") return `/quiz/${docId}`;
    const baseUrl = `/chat/${docId}`;
    return defaultAction ? `${baseUrl}?action=${defaultAction}` : baseUrl;
  };

  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.status === "PROCESSING" || d.status === "UPLOADING"
    );
    if (hasProcessing) {
      const timer = setInterval(() => refreshDocuments(true), 5000);
      return () => clearInterval(timer);
    }
  }, [documents, refreshDocuments]);

  useEffect(() => {
    if (refreshTrigger > 0) refreshDocuments();
  }, [refreshTrigger, refreshDocuments]);

  const handleDelete = async (documentId: string, fileName: string) => {
    setPendingDelete({ id: documentId, name: fileName });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    setPendingDelete(null);
    try {
      await deleteDocument(pendingDelete.id);
      await refreshDocuments(true);
    } catch {
      alert("Xóa tài liệu thất bại.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRetry = async (documentId: string) => {
    setRetryingId(documentId);
    try {
      const { retryDocument } = await import("@/services/api.service");
      await retryDocument(documentId);
      await refreshDocuments(true);
    } catch (err: any) {
      alert(err.message || "Thử lại thất bại");
    } finally {
      setRetryingId(null);
    }
  };

  /* ── Status badge — border-only with pulsing dot ────────── */
  const getStatusBadge = (status: DocumentResponse["status"], docId: string) => {
    switch (status) {
      case "READY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-bold border border-[hsl(158_64%_44%/0.35)] text-[hsl(158_60%_35%)] dark:text-[hsl(158_58%_58%)] bg-[hsl(158_64%_44%/0.04)] whitespace-nowrap">
            <span className="relative flex w-1.5 h-1.5 shrink-0">
              <span className="animate-ping absolute inset-0 rounded-full bg-[hsl(158_64%_44%)] opacity-40" />
              <span className="relative rounded-full w-1.5 h-1.5 bg-[hsl(158_64%_44%)]" />
            </span>
            {DOCUMENT_TABLE_TEXTS.status.processed}
          </span>
        );
      case "PROCESSING":
      case "UPLOADING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-bold border border-[hsl(239_68%_58%/0.35)] text-[hsl(239_55%_50%)] dark:text-[hsl(239_68%_68%)] bg-[hsl(239_68%_58%/0.04)] whitespace-nowrap">
            <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {status === "UPLOADING" ? "Đang tải" : "Đang xử lý"}
          </span>
        );
      case "FAILED":
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleRetry(docId); }}
            disabled={retryingId === docId}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-bold border border-[hsl(343_85%_58%/0.35)] text-[hsl(343_70%_45%)] bg-[hsl(343_85%_58%/0.04)] hover:bg-[hsl(343_85%_58%)] hover:text-white hover:border-transparent transition-all whitespace-nowrap"
          >
            <span className={`material-symbols-outlined icon-thin text-[12px] ${retryingId === docId ? "animate-spin" : ""}`}>refresh</span>
            Thử lại
          </button>
        );
    }
  };

  /* ── File icon ───────────────────────────────────────────── */
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const isPdf = ext === "pdf";
    return (
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
        isPdf
          ? "bg-[hsl(343_85%_58%/0.07)] text-[hsl(343_72%_48%)] border-[hsl(343_85%_58%/0.15)]"
          : "bg-[hsl(217_91%_60%/0.07)] text-[hsl(217_72%_48%)] border-[hsl(217_91%_60%/0.15)]"
      }`}>
        <span className="material-symbols-outlined icon-thin text-[17px]">
          {isPdf ? "picture_as_pdf" : "description"}
        </span>
      </div>
    );
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
    <div className="flex flex-col bg-[var(--card-bg)] rounded-3xl overflow-hidden border border-[var(--border-color)] shadow-sm">

      {/* ── Card Header ────────────────────────────────────── */}
      <div className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
        <div>
          <h2 className="text-[14px] font-bold text-[var(--foreground)] leading-none mb-1">
            {DOCUMENT_TABLE_TEXTS.title}
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(239_68%_58%)]" />
            <p className="text-[11px] text-[var(--muted)] font-medium">
              {documents.length} {documents.length === 1 ? "tài liệu" : "tài liệu"}
            </p>
          </div>
        </div>

        {/* Search + Refresh */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            {/* Search icon — SVG inline để luôn hiện */}
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx={11} cy={11} r={8} />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Tìm tên tài liệu, chủ đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/60 dark:bg-white/5 backdrop-blur-lg border border-[hsl(214_32%_91%)] dark:border-white/10 rounded-xl text-[12px] text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:outline-none focus:ring-1 focus:ring-[hsl(239_68%_58%/0.35)] focus:border-transparent transition-all font-medium shadow-[0_1px_3px_hsl(0_0%_0%/0.04)]"
            />
          </div>
          <button
            onClick={() => refreshDocuments()}
            className="w-10 h-10 shrink-0 flex items-center justify-center bg-white/60 dark:bg-white/5 backdrop-blur-lg border border-[hsl(214_32%_91%)] dark:border-white/10 rounded-xl text-[var(--muted)] hover:text-[hsl(239_68%_58%)] hover:border-[hsl(239_68%_58%/0.30)] shadow-[0_1px_3px_hsl(0_0%_0%/0.04)] transition-all active:scale-90"
          >
            <span className="material-symbols-outlined icon-thin text-[17px]">refresh</span>
          </button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="overflow-x-auto overflow-y-auto max-h-[330px] w-full custom-scrollbar">
        <table className="w-full text-left border-collapse table-fixed min-w-full">
          <thead className="sticky top-0 z-20 bg-[var(--surface)]">
            <tr className="border-b border-[hsl(214_32%_91%)] dark:border-white/8">
              <th className="py-3 px-5 text-[10px] font-bold tracking-[0.06em] text-[var(--muted-light)]" style={{ width: "36%" }}>
                {DOCUMENT_TABLE_TEXTS.colName}
              </th>
              <th className="py-3 px-4 text-[10px] font-bold tracking-[0.06em] text-[var(--muted-light)] text-center" style={{ width: "15%" }}>
                {DOCUMENT_TABLE_TEXTS.colDate}
              </th>
              <th className="py-3 px-4 text-[10px] font-bold tracking-[0.06em] text-[var(--muted-light)] text-center" style={{ width: "11%" }}>
                Quy mô
              </th>
              <th className="py-3 px-4 text-[10px] font-bold tracking-[0.06em] text-[var(--muted-light)] text-center" style={{ width: "16%" }}>
                {DOCUMENT_TABLE_TEXTS.colStatus}
              </th>
              {showActions && (
                <th className="py-3 px-3 text-[10px] font-bold tracking-[0.06em] text-[var(--muted-light)] text-center" style={{ width: "22%" }}>
                  Thao tác
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {/* Skeleton loading */}
            {loading && documents.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} index={i} showActions={showActions} />
                ))
              : filteredDocuments.length > 0
              ? filteredDocuments.map((doc, index) => (
                  <tr
                    key={doc.id}
                    onClick={() => doc.status === "READY" && router.push(getRedirectUrl(doc.id))}
                    className={`row-enter border-b border-[var(--border-subtle)] last:border-0 transition-colors duration-150 group ${
                      doc.status === "READY"
                        ? "hover:bg-[var(--surface)] cursor-pointer"
                        : "opacity-60 cursor-wait"
                    }`}
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    {/* Name */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {getFileIcon(doc.file_name)}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[var(--foreground)] truncate group-hover:text-[hsl(239_68%_58%)] transition-colors">
                            {doc.file_name}
                          </p>
                          <p className="text-[11px] text-[var(--muted-light)] mt-0.5 font-medium">
                            {doc.file_size_mb} MB · {doc.file_name.split(".").pop()?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-center">
                      <p className="text-[12px] font-medium text-[var(--muted)]">
                        {new Date(doc.uploaded_at).toLocaleDateString("vi-VN")}
                      </p>
                    </td>

                    {/* Size */}
                    <td className="py-3.5 px-4 text-center">
                      <p className="text-[12px] font-medium text-[var(--muted)]">
                        {doc.page_count > 0 ? `${doc.page_count} trang` : "—"}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center">
                        {getStatusBadge(doc.status, doc.id)}
                      </div>
                    </td>

                    {/* Actions */}
                    {showActions && (
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {doc.status === "READY" && (
                            <>
                              <Link
                                href={getRedirectUrl(doc.id)}
                                className="w-9 h-9 rounded-lg border border-[hsl(239_68%_58%/0.20)] text-[hsl(239_55%_50%)] hover:bg-[hsl(239_68%_58%)] hover:text-white hover:border-transparent flex items-center justify-center transition-all"
                                title="Hỏi AI"
                              >
                                <span className="material-symbols-outlined icon-thin text-[15px]">chat_bubble</span>
                              </Link>
                              <Link
                                href={`/quiz/${doc.id}`}
                                className="w-9 h-9 rounded-lg border border-[hsl(38_92%_50%/0.20)] text-[hsl(38_80%_42%)] hover:bg-[hsl(38_92%_50%)] hover:text-white hover:border-transparent flex items-center justify-center transition-all"
                                title="Luyện tập"
                              >
                                <span className="material-symbols-outlined icon-thin text-[15px]">quiz</span>
                              </Link>
                              <Link
                                href={`/mindmap/${doc.id}`}
                                className="w-9 h-9 rounded-lg border border-[hsl(173_58%_42%/0.20)] text-[hsl(173_50%_36%)] hover:bg-[hsl(173_58%_42%)] hover:text-white hover:border-transparent flex items-center justify-center transition-all"
                                title="Sơ đồ tư duy"
                              >
                                <span className="material-symbols-outlined icon-thin text-[15px]">hub</span>
                              </Link>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(doc.id, doc.file_name)}
                            disabled={deletingId === doc.id}
                            className="w-9 h-9 rounded-lg border border-[var(--border-color)] text-[var(--muted-light)] hover:bg-[hsl(343_85%_58%)] hover:text-white hover:border-transparent flex items-center justify-center transition-all disabled:opacity-50"
                            title="Xóa"
                          >
                            {deletingId === doc.id ? (
                              <div className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                            ) : (
                              <span className="material-symbols-outlined icon-thin text-[15px]">delete</span>
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              : (
                <tr>
                  <td colSpan={showActions ? 5 : 4} className="p-0 border-none">
                    <div
                      className="min-h-[200px] flex flex-col items-center justify-center text-center cursor-pointer group/empty py-8"
                      onClick={() => {
                        if (window.location.pathname !== "/") {
                          router.push("/?action=upload");
                        } else {
                          const fi = document.querySelector('input[type="file"]') as HTMLInputElement;
                          if (fi) fi.click();
                        }
                      }}
                    >
                      <div className="flex flex-col items-center gap-4 max-w-xs mx-auto transition-all duration-300 group-hover/empty:scale-105">
                        <div className="w-14 h-14 bg-[var(--surface)] rounded-xl flex items-center justify-center border border-[var(--border-color)] group-hover/empty:border-[hsl(239_68%_58%/0.30)] transition-all">
                          <span className="material-symbols-outlined icon-thin text-[hsl(239_68%_58%)] text-[32px]">cloud_upload</span>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-[14px] font-bold text-[var(--foreground)] group-hover/empty:text-[hsl(239_68%_58%)] transition-colors">
                            {DOCUMENT_TABLE_TEXTS.empty?.title}
                          </h3>
                          <p className="text-[11px] text-[var(--muted)] font-medium leading-relaxed px-4">
                            {DOCUMENT_TABLE_TEXTS.empty?.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </div>

    {/* ── Confirm Delete Dialog ─────────────────────── */}
    <ConfirmDialog
      open={!!pendingDelete}
      title="Xóa tài liệu"
      message={`Bạn có chắc muốn xóa "${pendingDelete?.name}"? Thao tác này không thể hoàn tác.`}
      confirmLabel="Xóa"
      cancelLabel="Giữ lại"
      variant="danger"
      onConfirm={confirmDelete}
      onCancel={() => setPendingDelete(null)}
    />
    </>
  );
}
