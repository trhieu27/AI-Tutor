"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocumentResponse, fetchDocuments, deleteDocument } from "@/services/api.service";
import { DOCUMENT_TABLE_TEXTS } from "@/constants/texts";
import { APP_COLORS } from "@/constants/colors";

interface DocumentTableProps {
  refreshTrigger?: number; // Increment to trigger a re-fetch
  showActions?: boolean;
}

export default function DocumentTable({ refreshTrigger = 0, showActions = false }: DocumentTableProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    console.log("🔄 Calling fetchDocuments()...");
    setLoading(true);
    setError("");
    try {
      const docs = await fetchDocuments();
      console.log("✅ fetchDocuments() success:", docs.length, "docs");
      setDocuments(docs);
    } catch (err) {
      console.error("❌ fetchDocuments() error:", err);
      setError("Không thể tải danh sách tài liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments, refreshTrigger]);

  // Poll documents that are still processing
  useEffect(() => {
    const processingDocs = documents.filter(
      (d) => d.status === "UPLOADING" || d.status === "PROCESSING"
    );
    if (processingDocs.length === 0) return;

    const timer = setTimeout(() => loadDocuments(), 3000);
    return () => clearTimeout(timer);
  }, [documents, loadDocuments]);

  const handleDelete = async (documentId: string, fileName: string) => {
    if (!confirm(`Xóa "${fileName}"? Thao tác này không thể hoàn tác.`)) return;
    setDeletingId(documentId);
    try {
      await deleteDocument(documentId);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch {
      alert("Xóa tài liệu thất bại.");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: DocumentResponse["status"]) => {
    switch (status) {
      case "READY":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap" style={{ backgroundColor: APP_COLORS.successBg, color: APP_COLORS.success }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: APP_COLORS.success }} />
            {DOCUMENT_TABLE_TEXTS.status.processed}
          </span>
        );
      case "PROCESSING":
      case "UPLOADING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap" style={{ backgroundColor: APP_COLORS.warningBg, color: APP_COLORS.warning }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: APP_COLORS.warning }} />
            {status === "UPLOADING" ? "Đang tải lên" : DOCUMENT_TABLE_TEXTS.status.extracting}
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-red-100 text-red-600">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-600" />
            Thất bại
          </span>
        );
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") {
      return (
        <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0" style={{ color: APP_COLORS.pdfIcon }}>
          <span className="material-symbols-outlined text-[28px] sm:text-[32px]">picture_as_pdf</span>
        </div>
      );
    }
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0" style={{ color: APP_COLORS.docIcon }}>
        <span className="material-symbols-outlined text-[28px] sm:text-[32px]">description</span>
      </div>
    );
  };

  if (loading && documents.length === 0) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-[24px] mt-6 sm:mt-8 shadow-sm border border-outline/20 p-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-on-surface-variant text-sm">Đang tải tài liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-[24px] mt-6 sm:mt-8 shadow-sm border border-red-200 p-10 flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-4xl text-red-400">wifi_off</span>
        <p className="text-red-600 font-medium text-center max-w-sm">{error}</p>
        <button onClick={loadDocuments} className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          Thử lại
        </button>
      </div>
    );
  }

  const filteredDocuments = documents.filter((doc) =>
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-[24px] border border-outline/10 shadow-sm overflow-hidden mt-6 sm:mt-8">
      <div className="px-5 py-5 sm:px-8 sm:py-6 flex flex-col lg:flex-row lg:items-center justify-between border-b border-outline/30 gap-4 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
          <div>
            <h2 className="text-[20px] sm:text-[22px] font-bold text-on-surface tracking-tight">{DOCUMENT_TABLE_TEXTS.title}</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">{documents.length} tài liệu</p>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md ml-0 sm:ml-4 group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[20px]">search</span>
            <input
              type="text"
              placeholder="Tra cứu tài liệu của bạn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline/40 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm text-on-surface"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadDocuments} className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white border border-outline/70 rounded-xl hover:bg-surface transition-colors font-semibold text-[13px] text-on-surface shadow-sm active:scale-95">
            <span className="material-symbols-outlined text-base">refresh</span>
            Làm mới
          </button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="p-16 flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">folder_open</span>
          <p className="text-on-surface-variant font-medium">Chưa có tài liệu nào. Hãy tải lên tài liệu đầu tiên!</p>
        </div>
      ) : (
        <div className="overflow-x-auto w-full custom-scrollbar pb-2">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-outline/30">
                <th className="py-4 px-5 sm:px-8 text-[11px] font-bold tracking-widest uppercase text-on-surface-variant w-[40%] whitespace-nowrap">{DOCUMENT_TABLE_TEXTS.colName}</th>
                <th className="py-4 px-4 text-[11px] font-bold tracking-widest uppercase text-on-surface-variant whitespace-nowrap">{DOCUMENT_TABLE_TEXTS.colDate}</th>
                <th className="py-4 px-4 text-[11px] font-bold tracking-widest uppercase text-on-surface-variant whitespace-nowrap">Trang</th>
                <th className="py-4 px-5 sm:px-8 text-[11px] font-bold tracking-widest uppercase text-on-surface-variant text-right whitespace-nowrap">
                  {DOCUMENT_TABLE_TEXTS.colStatus}
                </th>
                {showActions && (
                  <th className="py-4 px-5 sm:px-8 text-[11px] font-bold tracking-widest uppercase text-on-surface-variant text-right whitespace-nowrap">{DOCUMENT_TABLE_TEXTS.colActions}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/30">
              {filteredDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => doc.status === "READY" && router.push(`/chat/${doc.id}`)}
                  className={`transition-colors group border-b border-outline/10 ${doc.status === "READY"
                    ? "hover:bg-blue-50/40 cursor-pointer"
                    : "opacity-75"
                    }`}
                >
                  <td className="py-4 sm:py-6 px-5 sm:px-8">
                    <div className="flex items-center gap-3 sm:gap-5">
                      {getFileIcon(doc.file_name)}
                      <div className="min-w-0 max-w-[180px] sm:max-w-[400px] overflow-hidden whitespace-nowrap group">
                        <p
                          className={`font-bold text-[15px] sm:text-[16px] text-on-surface mb-0.5 truncate ${doc.file_name.length > 30 ? 'marquee-text' : ''}`}
                          title={doc.file_name}
                        >
                          {doc.file_name}
                        </p>
                        <p className="text-[12px] sm:text-[13px] text-on-surface-variant font-medium">
                          {doc.file_size_mb} MB
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 sm:py-6 px-4 whitespace-nowrap">
                    <p className="text-[14px] font-medium text-slate-500">
                      {new Date(doc.uploaded_at).toLocaleDateString("vi-VN")}
                    </p>
                  </td>
                  <td className="py-4 sm:py-6 px-4">
                    <p className="text-[14px] text-slate-500 font-medium">
                      {doc.page_count > 0 ? `${doc.page_count} trang` : "—"}
                    </p>
                  </td>
                  <td className="py-4 sm:py-6 px-5 sm:px-8 text-right">
                    {getStatusBadge(doc.status)}
                  </td>
                  {showActions && (
                    <td className="py-4 sm:py-6 px-5 sm:px-8 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-3 sm:gap-4">
                        {doc.status === "READY" ? (
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/chat/${doc.id}`}
                              className="flex items-center gap-1.5 text-[13px] sm:text-[14px] text-primary hover:text-primary/80 font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-container/50 transition-colors whitespace-nowrap"
                            >
                              <span className="material-symbols-outlined text-base">chat</span>
                              Hỏi AI
                            </Link>
                            <Link
                              href={`/chat/${doc.id}?action=quiz`}
                              className="flex items-center gap-1.5 text-[13px] sm:text-[14px] text-orange-600 hover:text-orange-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors whitespace-nowrap"
                            >
                              <span className="material-symbols-outlined text-base">quiz</span>
                              Luyện tập
                            </Link>
                          </div>
                        ) : (
                          <span className="text-[13px] text-on-surface-variant/50 px-3 py-1.5 italic">Đang chờ...</span>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id, doc.file_name)}
                          disabled={deletingId === doc.id}
                          className="flex items-center gap-1 text-on-surface-variant hover:text-red-500 font-medium p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deletingId === doc.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <span className="material-symbols-outlined text-base">delete</span>
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .marquee-text {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .marquee-text:hover {
          display: inline-block;
          animation: marquee-scroll 8s linear infinite;
          text-overflow: clip;
          overflow: visible;
          white-space: nowrap;
          width: fit-content;
        }

        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          50% { transform: translateX(-30%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
