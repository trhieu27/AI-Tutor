"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocumentResponse, deleteDocument } from "@/services/api.service";
import { DOCUMENT_TABLE_TEXTS } from "@/constants/texts";
import { useUpload } from "@/context/UploadContext";
import { useDocuments } from "@/context/DocumentContext";

interface DocumentTableProps {
  refreshTrigger?: number;
  showActions?: boolean;
  defaultAction?: "summary" | "quiz" | "mindmap" | "questions";
  limit?: number;
}

export default function DocumentTable({
  refreshTrigger = 0,
  showActions = false,
  defaultAction,
  limit
}: DocumentTableProps) {
  const router = useRouter();
  const { lastUploadTime } = useUpload();
  const { documents, loading, refreshDocuments } = useDocuments();

  const getRedirectUrl = (docId: string) => {
    if (defaultAction === "mindmap") return `/mindmap/${docId}`;
    const baseUrl = `/chat/${docId}`;
    return defaultAction ? `${baseUrl}?action=${defaultAction}` : baseUrl;
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (refreshTrigger > 0) {
      refreshDocuments();
    }
  }, [refreshTrigger, refreshDocuments]);

  const handleDelete = async (documentId: string, fileName: string) => {
    if (!confirm(`Xóa "${fileName}"? Thao tác này không thể hoàn tác.`)) return;
    setDeletingId(documentId);
    try {
      await deleteDocument(documentId);
      await refreshDocuments(true); // Tải lại danh sách (chế độ không hiện loading xoay)
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
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)] animate-pulse shrink-0" />
            {DOCUMENT_TABLE_TEXTS.status.processed}
          </span>
        );
      case "PROCESSING":
      case "UPLOADING":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)] whitespace-nowrap">
            <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {status === "UPLOADING" ? "ĐANG TẢI" : "ĐANG PHÂN TÍCH"}
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            LỖI
          </span>
        );
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const isPdf = ext === "pdf";
    return (
      <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 border border-white/10 transition-all group-hover:scale-110 shadow-lg ${isPdf ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
        <span className="material-symbols-outlined text-[28px]">{isPdf ? 'picture_as_pdf' : 'description'}</span>
      </div>
    );
  };

  if (loading && documents.length === 0) {
    return (
      <div className="p-20 flex flex-col items-center gap-4 bg-slate-900/20 rounded-[48px] border border-white/5">
        <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin"></div>
        <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em]">Đang đồng bộ dữ liệu...</p>
      </div>
    );
  }

  const filteredDocuments = documents.filter(doc =>
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-fit max-h-full bg-slate-900/20 rounded-[48px] overflow-hidden border border-[var(--border-color)] transition-all duration-500">
      {/* Header with Search */}
      <div className="px-8 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-white/10 transition-colors duration-500">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">{DOCUMENT_TABLE_TEXTS.title}</h2>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]"></span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{documents.length} TÀI LIỆU TRONG THƯ VIỆN</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="relative flex-1 group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 group-focus-within:text-indigo-500 transition-colors text-[20px]">search</span>
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu học tập..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 font-bold"
            />
          </div>
          <button onClick={() => refreshDocuments()} className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 dark:text-white/60 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-90">
            <span className="material-symbols-outlined text-[22px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Table Content - Height follows parent (stretched grid), inner content scrolls */}
      <div className="overflow-x-auto h-auto overflow-y-auto w-full custom-scrollbar relative">
        <table className="w-full text-left border-collapse table-fixed min-w-full">
          <thead className="sticky top-0 z-20 bg-slate-900 shadow-sm">
            <tr className="border-b border-white/10">
              <th className="py-5 px-8 text-[10px] font-black tracking-[0.2em] uppercase text-slate-200" style={{ width: '38%' }}>{DOCUMENT_TABLE_TEXTS.colName}</th>
              <th className="py-5 px-4 text-[10px] font-black tracking-[0.2em] uppercase text-slate-200 text-center" style={{ width: '15%' }}>{DOCUMENT_TABLE_TEXTS.colDate}</th>
              <th className="py-5 px-4 text-[10px] font-black tracking-[0.2em] uppercase text-slate-200 text-center" style={{ width: '12%' }}>QUY MÔ</th>
              <th className="py-5 px-4 text-[10px] font-black tracking-[0.2em] uppercase text-slate-200 text-center" style={{ width: '15%' }}>{DOCUMENT_TABLE_TEXTS.colStatus}</th>
              {showActions && <th className="py-5 px-8 text-[10px] font-black tracking-[0.2em] uppercase text-slate-200 text-center" style={{ width: '20%' }}>THAO TÁC</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/[0.05]">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => doc.status === "READY" && router.push(getRedirectUrl(doc.id))}
                  className={`transition-all duration-300 relative group ${doc.status === "READY" ? "hover:bg-slate-50 dark:hover:bg-white/[0.04] cursor-pointer" : "opacity-60 cursor-wait"}`}
                >
                  <td className="py-6 px-8 relative overflow-hidden min-w-0">
                    <div className="flex items-center gap-5 w-full min-w-0">
                      {getFileIcon(doc.file_name)}
                      <div className="min-w-0 flex-1 relative overflow-hidden group/name">
                        <div className="flex flex-col min-w-0">
                          <p className="font-bold text-[14px] sm:text-[15px] text-slate-900 dark:text-white mb-1 leading-snug group-hover/name:text-indigo-600 dark:group-hover/name:text-indigo-300 transition-colors truncate whitespace-nowrap group-hover/name:text-clip group-hover/name:overflow-visible group-hover/name:animate-marquee">
                            {doc.file_name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">
                            {doc.file_size_mb} MB • {doc.file_name.split('.').pop()?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-4 whitespace-nowrap text-center">
                    <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300">
                      {new Date(doc.uploaded_at).toLocaleDateString("vi-VN")}
                    </p>
                  </td>
                  <td className="py-6 px-4 whitespace-nowrap text-center">
                    <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300">
                      {doc.page_count > 0 ? `${doc.page_count} TRANG` : "—"}
                    </p>
                  </td>
                  <td className="py-6 px-4 text-center">
                    <div className="flex justify-center scale-90">
                      {getStatusBadge(doc.status)}
                    </div>
                  </td>
                  {showActions && (
                    <td className="py-6 px-8 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-3">
                        {doc.status === "READY" && (
                          <>
                            <Link href={getRedirectUrl(doc.id)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-indigo-400 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all shadow-lg active:scale-95" title="Hỏi AI">
                              <span className="material-symbols-outlined text-base">chat_bubble</span>
                            </Link>
                            <Link href={`/chat/${doc.id}?action=quiz`} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-orange-400 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all shadow-lg active:scale-95" title="Luyện tập">
                              <span className="material-symbols-outlined text-base">quiz</span>
                            </Link>
                            <Link href={`/mindmap/${doc.id}`} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-cyan-400 hover:bg-cyan-500 hover:text-white flex items-center justify-center transition-all shadow-lg active:scale-95" title="Sơ đồ tư duy">
                              <span className="material-symbols-outlined text-base">hub</span>
                            </Link>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id, doc.file_name)}
                          disabled={deletingId === doc.id}
                          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
                          title="Xóa"
                        >
                          {deletingId === doc.id ? (
                            <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <span className="material-symbols-outlined text-base">delete</span>
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={showActions ? 5 : 4}
                  className="p-0 border-none"
                >
                  <div
                    className="min-h-[280px] flex flex-col items-center justify-center text-center cursor-pointer group/empty py-10"
                    onClick={() => {
                      if (window.location.pathname !== '/') {
                        router.push('/?action=upload');
                      } else {
                        document.getElementById('upload-area')?.scrollIntoView({ behavior: 'smooth' });
                        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                        if (fileInput) fileInput.click();
                      }
                    }}
                  >
                    <div className="flex flex-col items-center gap-6 max-w-sm mx-auto transition-all duration-300 group-hover/empty:scale-105">
                      <div className="relative group">
                        <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center border border-white/10 shadow-2xl transition-all duration-500 group-hover/empty:bg-indigo-500/20 group-hover/empty:border-indigo-500/30 group-hover/empty:shadow-indigo-500/20">
                          <span className="material-symbols-outlined text-indigo-400 text-5xl drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover/empty:text-indigo-300">cloud_upload</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-black text-white tracking-tight group-hover/empty:text-indigo-300 transition-colors">{DOCUMENT_TABLE_TEXTS.empty?.title}</h3>
                        <p className="text-[13px] text-slate-300 font-medium leading-relaxed px-4">
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          5% { transform: translateX(0); }
          85% { transform: translateX(-40%); }
          100% { transform: translateX(0); }
        }
        .group\/name:hover .group-hover\/name\:animate-marquee {
          animation: marquee 8s linear infinite;
          display: inline-block;
          padding-right: 50px;
        }
      `}</style>
    </div>
  );
}
