"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchDocument, fetchDocumentMindmap, fetchDocumentMindmapStream, QuotaError, DocumentResponse } from "@/services/api.service";
import InteractiveMindmap from "@/components/InteractiveMindmap";
import ConfirmDialog from "@/components/ConfirmDialog";
import { MINDMAP_PAGE_TEXTS, QUOTA_TEXTS } from "@/constants/texts";

export default function InteractiveMindmapPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;
  if (!documentId) return null;

  const [docData, setDocData] = useState<DocumentResponse | null>(null);
  const [mindmapCode, setMindmapCode] = useState<string>("");
  const mindmapCodeRef = useRef<string>("");

  const updateCode = useCallback((code: string) => {
    setMindmapCode(code);
    setEditableCode(code);
    mindmapCodeRef.current = code;
  }, []);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const isStreamingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const syncToDB = useCallback(async (code: string) => {
    try {
      const { updateDocumentMindmap } = await import("@/services/api.service");
      await updateDocumentMindmap(documentId as string, code);
    } catch (err) {
      console.error("Failed to sync mindmap to DB:", err);
    }
  }, [documentId]);

  const handleCodeChange = useCallback((newCode: string) => {
    if (newCode === mindmapCode) return;
    updateCode(newCode);
    syncToDB(newCode);
  }, [mindmapCode, updateCode, syncToDB]);

  const handleUndoRedoStateChange = useCallback((canUndo: boolean, canRedo: boolean) => {
    setCanUndo(canUndo);
    setCanRedo(canRedo);
  }, []);

  const unifiedUndo = useCallback(() => {
    mindmapRef.current?.undo();
  }, []);

  const unifiedRedo = useCallback(() => {
    mindmapRef.current?.redo();
  }, []);


  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [zoom, setZoom] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [isEditing, setIsEditing] = useState(false);
  const [editableCode, setEditableCode] = useState("");

  const [isUIVisible, setIsUIVisible] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mindmapRef = useRef<any>(null);

  // Keyboard shortcuts for UNIFIED undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); unifiedUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); unifiedRedo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unifiedUndo, unifiedRedo]);

  // RESTORE VIEWPORT
  useEffect(() => {
    const stored = localStorage.getItem(`mindmap_view_${documentId}`);
    if (stored) {
      try {
        const { zoom: sz, position: sp } = JSON.parse(stored);
        setZoom(sz);
        setPosition(sp);
      } catch (e) { }
    }
  }, [documentId]);

  const cleanMermaidCode = (code: string) => {
    let clean = code.trim();

    // Remove markdown code blocks
    if (clean.includes("```")) {
      const match = clean.match(/```(?:mermaid)?\n?([\s\S]*?)\n?```/);
      if (match) clean = match[1].trim();
      else clean = clean.replace(/```(?:mermaid)?/g, "").replace(/```/g, "").trim();
    }

    // Ensure it starts with mindmap
    if (!clean.toLowerCase().includes("mindmap")) {
      clean = "mindmap\n" + clean;
    }

    // Basic cleanup: remove double blank lines
    return clean.replace(/\n\s*\n/g, '\n');
  };

  const loadData = useCallback(async (force: boolean = false) => {
    // Hủy request cũ nếu đang chạy
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const isActive = () => abortRef.current === controller;

    setIsLoading(true);
    setMindmapCode("");
    isStreamingRef.current = false;

    try {
      const doc = await fetchDocument(documentId);
      if (isActive()) setDocData(doc);

      let accumulated = "";
      const lineCountRef = { current: 0 };
      isStreamingRef.current = true;
      await fetchDocumentMindmapStream(
        documentId,
        (chunk) => {
          if (!isActive()) return; // request đã bị huỷ, bỏ qua chunk
          setIsLoading(false);
          accumulated += chunk;
          const clean = cleanMermaidCode(accumulated);

          const currentLines = clean.split('\n').filter(l => l.trim()).length;
          if (force && currentLines > lineCountRef.current + 5) { 
            mindmapRef.current?.pushSnapshot();
            lineCountRef.current = currentLines;
          }

          updateCode(clean);
        },
        controller.signal,
        force
      );
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      if (!isActive()) return;
      if (error instanceof QuotaError) {
        setQuotaExceeded(true);
        setIsLoading(false);
        return;
      }
      console.error("Error loading mindmap:", error);
    } finally {
      if (isActive()) {
        setIsLoading(false);
        isStreamingRef.current = false;
      }
    }
  }, [documentId]);

  useEffect(() => {
    loadData();
    // Cleanup: hủy stream khi rời trang
    return () => { abortRef.current?.abort(); };
  }, [loadData]);

  const toggleUI = useCallback(() => {
    setIsUIVisible(prev => !prev);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return;
    // Don't start drag if clicking inside the interactive mindmap SVG/nodes
    const target = e.target as HTMLElement;
    if (target.closest('.cursor-pointer') || target.closest('[data-mindmap-node]')) return;
    setIsDragging(true);
    if (!hasInteracted) setHasInteracted(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Persist viewport state
    localStorage.setItem(`mindmap_view_${documentId}`, JSON.stringify({ zoom, position }));
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!hasInteracted) setHasInteracted(true);
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => {
      const next = Math.min(Math.max(prev + delta, 0.15), 3);
      localStorage.setItem(`mindmap_view_${documentId}`, JSON.stringify({ zoom: next, position }));
      return next;
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, []);

  const handleReset = () => {
    setZoom(0.8);
    setPosition({ x: 0, y: 0 });
  };

  const [copySuccess, setCopySuccess] = useState(false);
  const copyToClipboard = () => {
    navigator.clipboard.writeText(mindmapCode).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleApplyEdit = () => {
    const code = cleanMermaidCode(editableCode);
    if (code !== mindmapCode) {
      mindmapRef.current?.pushSnapshot();
      setMindmapCode(code);
      setEditableCode(code);
      syncToDB(code);
    }
    setIsEditing(false);
  };

  return (
    <>
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[var(--background)] overflow-hidden relative font-sans selection:bg-[hsl(239_68%_58%/0.25)] transition-colors duration-500">

      {/* ── Dynamic Background Mesh (subtle, non-distracting) ────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-[20%] -left-[10%] w-[45%] h-[45%] rounded-full opacity-[0.06] dark:opacity-[0.12]"
          style={{
            background: 'radial-gradient(circle, hsl(239 68% 58%) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute -bottom-[15%] -right-[10%] w-[35%] h-[35%] rounded-full opacity-[0.05] dark:opacity-[0.10]"
          style={{
            background: 'radial-gradient(circle, hsl(263 70% 62%) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        {/* Subtle dot-grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(239 68% 58%) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* ── Floating Header ────────────────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-3xl px-4">
        <header className="bg-[var(--surface-overlay)] backdrop-blur-2xl border border-[var(--border-color)] rounded-[20px] h-13 flex items-center justify-between px-4 shadow-[0_8px_32px_hsl(222_47%_4%/0.08),0_2px_8px_hsl(222_47%_4%/0.04)]">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--surface)] hover:bg-[var(--card-bg-hover)] text-[var(--foreground)] transition-all active:scale-90"
            >
              <span className="material-symbols-outlined icon-thin text-[16px]">west</span>
            </button>
            <h1 className="font-semibold text-[var(--foreground)] text-[13px] truncate max-w-[200px] md:max-w-md tracking-[-0.01em]">
              {docData?.file_name}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Undo/Redo */}
            <div className="flex items-center bg-[var(--surface)] rounded-xl p-0.5 border border-[var(--border-color)]">
              <button
                onClick={unifiedUndo}
                disabled={!canUndo}
                className={`w-8 h-7 flex items-center justify-center rounded-lg text-[14px] transition-all ${
                  !canUndo
                    ? 'text-[var(--muted-light)] opacity-40 cursor-not-allowed'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]'
                }`}
                title="Hoàn tác (Ctrl+Z)"
              >
                <span className="material-symbols-outlined icon-thin text-[16px]">undo</span>
              </button>
              <button
                onClick={unifiedRedo}
                disabled={!canRedo}
                className={`w-8 h-7 flex items-center justify-center rounded-lg text-[14px] transition-all ${
                  !canRedo
                    ? 'text-[var(--muted-light)] opacity-40 cursor-not-allowed'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]'
                }`}
                title="Làm lại (Ctrl+Y)"
              >
                <span className="material-symbols-outlined icon-thin text-[16px]">redo</span>
              </button>
            </div>

            {/* Zoom */}
            <div className="hidden md:flex items-center bg-[var(--surface)] rounded-xl p-0.5 border border-[var(--border-color)]">
              <button
                onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))}
                className="w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <span className="material-symbols-outlined icon-thin text-[14px]">remove</span>
              </button>
              <span className="px-2 text-[10px] font-bold text-[var(--muted)] font-mono w-10 text-center tracking-wider">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
                className="w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <span className="material-symbols-outlined icon-thin text-[14px]">add</span>
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-[var(--border-color)] mx-0.5" />

            {/* Reset (danger) */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[hsl(343_85%_58%)] hover:bg-[hsl(343_85%_58%/0.06)] transition-all active:scale-90"
              title="Đặt lại toàn bộ sơ đồ"
            >
              <span className="material-symbols-outlined icon-thin text-[17px]">restart_alt</span>
            </button>

            {/* Download */}
            <button
              onClick={() => mindmapRef.current?.downloadImage()}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-[hsl(239_68%_58%)] hover:bg-[hsl(239_62%_50%)] text-white shadow-[0_2px_8px_hsl(239_68%_58%/0.35)] transition-all active:scale-90"
              title={MINDMAP_PAGE_TEXTS.CONTROLS.DOWNLOAD}
            >
              <span className="material-symbols-outlined icon-thin text-[17px]">download</span>
            </button>

            {/* Code sidebar toggle */}
            <button
              onClick={() => setIsSidebarOpen(p => !p)}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
                isSidebarOpen
                  ? 'bg-[hsl(239_68%_58%/0.12)] text-[hsl(239_68%_58%)] border border-[hsl(239_68%_58%/0.25)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] border border-transparent'
              }`}
              title="Mã nguồn"
            >
              <span className="material-symbols-outlined icon-thin text-[17px]">code</span>
            </button>
          </div>
        </header>
      </div>

      {/* ── Interactive Canvas ───────────────────────────────── */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transition: isDragging
              ? 'none'
              : 'transform 0.25s cubic-bezier(0.19, 1, 0.22, 1)'
          }}
        >
          {quotaExceeded ? (
            <div className="flex flex-col items-center gap-6 bg-[var(--surface-overlay)] backdrop-blur-xl px-14 py-10 rounded-[28px] border border-[var(--border-color)] shadow-[0_8px_32px_hsl(222_47%_4%/0.08)] pointer-events-auto">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-400/20 flex items-center justify-center border border-amber-400/20">
                <span className="material-symbols-outlined text-[28px] text-amber-500">bolt</span>
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-[13px] font-bold text-[var(--foreground)]">{QUOTA_TEXTS.exceeded.title}</p>
                <p className="text-[11px] text-[var(--muted)] font-medium">{QUOTA_TEXTS.exceeded.ai}</p>
                <p className="text-[10px] text-[var(--muted-light)]">{QUOTA_TEXTS.exceeded.desc}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/settings")}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white text-[12px] font-bold hover:opacity-90 transition-all active:scale-95 shadow-[0_4px_16px_hsl(239_68%_58%/0.3)]"
                >
                  {QUOTA_TEXTS.exceeded.upgradeBtn}
                </button>
                <button
                  onClick={() => router.back()}
                  className="px-5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[var(--muted)] text-[12px] font-bold hover:bg-[var(--card-bg)] transition-all active:scale-95"
                >
                  {QUOTA_TEXTS.exceeded.laterBtn}
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center gap-6 bg-[var(--surface-overlay)] backdrop-blur-xl px-14 py-10 rounded-[28px] border border-[var(--border-color)] shadow-[0_8px_32px_hsl(222_47%_4%/0.08)]">
              {/* Icon AI với glow */}
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl blur-xl opacity-40"
                  style={{ background: "radial-gradient(circle, hsl(239 68% 58%) 0%, hsl(263 70% 62%) 100%)" }}
                />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] flex items-center justify-center shadow-[0_4px_16px_hsl(239_68%_58%/0.30)]">
                  <span className="material-symbols-outlined icon-thin text-white text-[26px]">account_tree</span>
                </div>
              </div>

              {/* Text */}
              <div className="text-center space-y-1.5">
                <p className="text-[13px] font-bold text-[var(--foreground)]">
                  {MINDMAP_PAGE_TEXTS.STATUS.LOADING}
                </p>
                <p className="text-[11px] text-[var(--muted)] font-medium">
                  Đang phân tích nội dung tài liệu
                </p>
              </div>

              {/* Jumping dots */}
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[hsl(239_68%_58%)] animate-jumping-dot"
                    style={{ animationDelay: `${i * 0.16}s` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="pointer-events-auto min-w-[1400px] flex items-center justify-center">
              <InteractiveMindmap
                ref={mindmapRef}
                documentId={documentId as string}
                chart={mindmapCode}
                zoom={zoom}
                onCodeChange={handleCodeChange}
                onUndoRedoStateChange={handleUndoRedoStateChange}
              />
            </div>
          )}
        </div>

        {/* User guidance overlay */}
        <div
          className={`absolute bottom-8 left-8 transition-all duration-700 ${
            !hasInteracted && isUIVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        >
          <div className="bg-[var(--surface-overlay)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-[0_8px_24px_hsl(222_47%_4%/0.08)] p-3 flex items-center gap-3 w-[320px]">
            <div className="w-8 h-8 rounded-xl bg-[hsl(239_68%_58%/0.08)] border border-[hsl(239_68%_58%/0.15)] flex items-center justify-center text-[hsl(239_68%_58%)] shrink-0">
              <span className="material-symbols-outlined icon-thin text-[16px]">mouse</span>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--muted-light)] mb-0.5">{MINDMAP_PAGE_TEXTS.GUIDE.TITLE}</p>
              <p className="text-[11px] text-[var(--foreground)] font-medium leading-snug opacity-80">{MINDMAP_PAGE_TEXTS.GUIDE.DESC}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Re-center button ────────────────────────────── */}
      <button
        onClick={() => { setPosition({ x: 0, y: 0 }); setZoom(0.8); }}
        className="absolute bottom-6 right-6 z-50 w-9 h-9 bg-[var(--surface-overlay)] border border-[var(--border-color)] backdrop-blur-xl rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[hsl(239_68%_58%)] hover:border-[hsl(239_68%_58%/0.30)] shadow-[0_4px_16px_hsl(222_47%_4%/0.08)] transition-all active:scale-90"
        title={MINDMAP_PAGE_TEXTS.CONTROLS.RESET_VIEW}
      >
        <span className="material-symbols-outlined icon-thin text-[18px]">filter_center_focus</span>
      </button>

      {/* ── Floating Code Sidebar (physics-eased spring slide) ──────── */}
      <aside
        className="fixed top-24 right-6 bottom-6 z-40 overflow-hidden"
        style={{
          width: isSidebarOpen ? '400px' : '0px',
          opacity: isSidebarOpen ? 1 : 0,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(16px)',
          transition: 'width 0.45s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s ease, transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)',
          pointerEvents: isSidebarOpen ? 'auto' : 'none',
        }}
      >
        <div className="h-full bg-[var(--surface-overlay)] backdrop-blur-3xl border border-[var(--border-color)] rounded-3xl flex flex-col shadow-[0_32px_64px_hsl(222_47%_4%/0.12),0_8px_24px_hsl(222_47%_4%/0.06)] min-w-[400px]">
          <div className="p-6 flex flex-col h-full">

            {/* Sidebar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[hsl(239_68%_58%)] flex items-center justify-center shadow-[0_4px_12px_hsl(239_68%_58%/0.35)]">
                  <span className="material-symbols-outlined icon-thin text-white text-[16px]">code</span>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] text-[13px] tracking-[-0.01em]">Điều chỉnh Sơ đồ</h3>
                  <p className="text-[10px] text-[var(--muted-light)] font-medium">Mermaid Mindmap Syntax</p>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all active:scale-90"
              >
                <span className="material-symbols-outlined icon-thin text-[16px]">close</span>
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1 pb-4">
              {/* Label */}
              <p className="text-[10px] font-bold text-[hsl(239_68%_58%)] uppercase tracking-[0.15em] px-1">
                Mã nguồn (Mermaid)
              </p>

              {/* Code textarea */}
              <div className="relative group">
                <div className="absolute -inset-px bg-gradient-to-br from-[hsl(239_68%_58%/0.20)] to-[hsl(263_70%_62%/0.15)] rounded-2xl opacity-50 group-focus-within:opacity-100 transition-opacity duration-300" />
                <textarea
                  value={editableCode}
                  onChange={(e) => setEditableCode(e.target.value)}
                  className="relative w-full h-[360px] p-5 bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl text-[12px] text-[var(--foreground)] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[hsl(239_68%_58%/0.30)] focus:border-[hsl(239_68%_58%/0.40)] custom-scrollbar transition-all resize-none"
                  placeholder={MINDMAP_PAGE_TEXTS.EDITOR.PLACEHOLDER}
                />
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={handleApplyEdit}
                  className="col-span-3 py-3 bg-[hsl(239_68%_58%)] hover:bg-[hsl(239_62%_50%)] text-white rounded-xl font-semibold text-[12px] shadow-[0_4px_12px_hsl(239_68%_58%/0.30)] transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined icon-thin text-[15px]">check_circle</span>
                  {MINDMAP_PAGE_TEXTS.EDITOR.APPLY}
                </button>
                <button
                  onClick={copyToClipboard}
                  className={`py-3 rounded-xl font-semibold text-[12px] transition-all flex items-center justify-center active:scale-95 ${
                    copySuccess
                      ? 'bg-[hsl(158_64%_44%)] text-white'
                      : 'bg-[var(--surface)] border border-[var(--border-color)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg-hover)]'
                  }`}
                  title="Sao chép mã"
                >
                  <span className="material-symbols-outlined icon-thin text-[15px]">{copySuccess ? 'done_all' : 'file_copy'}</span>
                </button>
              </div>

              {/* Info card */}
              <div className="p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] space-y-2">
                <h4 className="font-semibold text-[var(--foreground)] text-[12px] flex items-center gap-2">
                  <span className="material-symbols-outlined icon-thin text-[hsl(239_68%_58%)] text-[14px]">info</span>
                  Ghi chú
                </h4>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Chỉnh sửa mã và nhấn <strong className="text-[var(--foreground)]">“Cập nhật”</strong> để áp dụng.
                  Không thể hoàn tác sau khi áp dụng mã thủ công.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['#Mindmap', '#Mermaid', '#AI_Tutor'].map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-[hsl(239_68%_58%/0.08)] border border-[hsl(239_68%_58%/0.15)] rounded-full text-[9px] text-[hsl(239_68%_58%)] font-bold tracking-wide"
                    >{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <style jsx global>{`
        @media print {
          header, aside, button, .z-30 { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>

    {/* ── Confirm Reset Dialog ─────────────────────────── */}
    <ConfirmDialog
      open={showResetConfirm}
      title="Đặt lại sơ đồ tư duy"
      message="Toàn bộ sơ đồ hiện tại sẽ bị xóa và AI sẽ tạo lại từ đầu. Thao tác này không thể hoàn tác."
      confirmLabel="Đặt lại"
      cancelLabel="Giữ lại"
      variant="warning"
      onConfirm={() => {
        setShowResetConfirm(false);
        mindmapRef.current?.resetLayout();
        loadData(true);
        handleReset();
      }}
      onCancel={() => setShowResetConfirm(false)}
    />
    </>
  );
}
