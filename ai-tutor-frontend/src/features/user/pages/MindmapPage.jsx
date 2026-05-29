import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchDocument, fetchDocumentMindmapStream, QuotaError } from "@/shared/services/api.service";
import InteractiveMindmap from "@/features/user/components/InteractiveMindmap";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import { MINDMAP_PAGE_TEXTS, MINDMAP_WORKSPACE_TEXTS, QUOTA_TEXTS } from "@/shared/constants/texts";
import LiquidGlassButton from "@/shared/ui/LiquidGlassButton";
/** Trang sơ đồ tư duy — hiển thị, chỉnh sửa và tải mindmap từ tài liệu */
export default function InteractiveMindmapPage() {
  const params = useParams();
  const navigate = useNavigate();
  const documentId = params.documentId || "";
  const [docData, setDocData] = useState(null);
  const [mindmapCode, setMindmapCode] = useState("");
  const mindmapCodeRef = useRef("");
  const updateCode = useCallback(code => {
    setMindmapCode(code);
    setEditableCode(code);
    mindmapCodeRef.current = code;
  }, []);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const isStreamingRef = useRef(false);
  const abortRef = useRef(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const syncToDB = useCallback(async code => {
    try {
      const {
        updateDocumentMindmap
      } = await import("@/shared/services/api.service");
      await updateDocumentMindmap(documentId, code);
    } catch (err) {
      console.error("Failed to sync mindmap to DB:", err);
    }
  }, [documentId]);
  const handleCodeChange = useCallback(newCode => {
    if (newCode === mindmapCode) return;
    updateCode(newCode);
    syncToDB(newCode);
  }, [mindmapCode, updateCode, syncToDB]);
  const handleUndoRedoStateChange = useCallback((canUndo, canRedo) => {
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
  const [position, setPosition] = useState({
    x: 0,
    y: 0
  });
  const positionRef = useRef({
    x: 0,
    y: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({
    x: 0,
    y: 0
  });
  const touchRef = useRef({
    pinchDist: 0,
    pinchMidX: 0,
    pinchMidY: 0,
    dragging: false,
    startX: 0,
    startY: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editableCode, setEditableCode] = useState("");
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const uiTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const mindmapRef = useRef(null);

  // Keyboard shortcuts for UNIFIED undo/redo
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        unifiedUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        unifiedRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unifiedUndo, unifiedRedo]);

  // Keep positionRef in sync
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // RESTORE VIEWPORT
  useEffect(() => {
    const stored = localStorage.getItem(`mindmap_view_${documentId}`);
    if (stored) {
      try {
        const {
          zoom: sz,
          position: sp
        } = JSON.parse(stored);
        setZoom(sz);
        setPosition(sp);
      } catch (e) { }
    }
  }, [documentId]);
  const cleanMermaidCode = code => {
    let clean = code.trim();

    // Remove markdown code blocks
    if (clean.includes("```")) {
      const match = clean.match(/```(?:mermaid)?\n?([\s\S]*?)\n?```/);
      if (match) clean = match[1].trim(); else clean = clean.replace(/```(?:mermaid)?/g, "").replace(/```/g, "").trim();
    }

    // Ensure it starts with mindmap
    if (!clean.toLowerCase().includes("mindmap")) {
      clean = "mindmap\n" + clean;
    }

    // Basic cleanup: remove double blank lines
    return clean.replace(/\n\s*\n/g, '\n');
  };
  const loadData = useCallback(async (force = false) => {
    // Hủy request cũ nếu đang chạy
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const isActive = () => abortRef.current === controller;
    setIsLoading(true);
    setMindmapCode("");
    setErrorMessage(null);
    isStreamingRef.current = false;
    try {
      const doc = await fetchDocument(documentId);
      if (isActive()) setDocData(doc);
      let accumulated = "";
      const lineCountRef = {
        current: 0
      };
      isStreamingRef.current = true;
      await fetchDocumentMindmapStream(documentId, chunk => {
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
      }, controller.signal, force);
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (!isActive()) return;
      if (error instanceof QuotaError) {
        setQuotaExceeded(true);
        setIsLoading(false);
        return;
      }
      console.error("Error loading mindmap:", error);
      // Always show a generic message — never expose raw API errors to the user
      setErrorMessage(MINDMAP_WORKSPACE_TEXTS.canvas.errorMessage);
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
    return () => {
      abortRef.current?.abort();
    };
  }, [loadData]);
  const toggleUI = useCallback(() => {
    setIsUIVisible(prev => !prev);
  }, []);
  const handleMouseDown = e => {
    if (e.button !== 0) return;
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return;
    // Don't start drag if clicking inside the interactive mindmap SVG/nodes
    const target = e.target;
    if (target.closest('.cursor-pointer') || target.closest('[data-mindmap-node]')) return;
    setIsDragging(true);
    if (!hasInteracted) setHasInteracted(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };
  const handleMouseMove = e => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    // Persist viewport state
    localStorage.setItem(`mindmap_view_${documentId}`, JSON.stringify({
      zoom,
      position
    }));
  };
  const handleWheel = e => {
    e.preventDefault();
    if (!hasInteracted) setHasInteracted(true);
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => {
      const next = Math.min(Math.max(prev + delta, 0.15), 3);
      localStorage.setItem(`mindmap_view_${documentId}`, JSON.stringify({
        zoom: next,
        position
      }));
      return next;
    });
  };
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const getTouchDist = t => {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    const onTouchStart = e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        touchRef.current.pinchDist = getTouchDist(e.touches);
        touchRef.current.pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        touchRef.current.pinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        touchRef.current.dragging = false;
      } else if (e.touches.length === 1) {
        // Đừng intercept nếu đang chạm vào node hoặc element tương tác
        const target = e.target;
        if (target instanceof HTMLButtonElement || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.closest('.cursor-pointer') || target.closest('[data-mindmap-node]')) return;
        touchRef.current.dragging = true;
        touchRef.current.startX = e.touches[0].clientX - positionRef.current.x;
        touchRef.current.startY = e.touches[0].clientY - positionRef.current.y;
        setHasInteracted(true);
      }
    };
    const onTouchMove = e => {
      e.preventDefault();
      if (e.touches.length === 2 && touchRef.current.pinchDist > 0) {
        const newDist = getTouchDist(e.touches);
        const newMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const newMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const scale = newDist / touchRef.current.pinchDist;
        const dx = newMidX - touchRef.current.pinchMidX;
        const dy = newMidY - touchRef.current.pinchMidY;
        setZoom(prev => Math.min(Math.max(prev * scale, 0.15), 3));
        setPosition(prev => ({
          x: prev.x + dx,
          y: prev.y + dy
        }));
        setHasInteracted(true);
        touchRef.current.pinchDist = newDist;
        touchRef.current.pinchMidX = newMidX;
        touchRef.current.pinchMidY = newMidY;
      } else if (e.touches.length === 1 && touchRef.current.dragging) {
        setPosition({
          x: e.touches[0].clientX - touchRef.current.startX,
          y: e.touches[0].clientY - touchRef.current.startY
        });
      }
    };
    const onTouchEnd = () => {
      touchRef.current.dragging = false;
      touchRef.current.pinchDist = 0;
    };
    container.addEventListener('wheel', handleWheel, {
      passive: false
    });
    container.addEventListener('touchstart', onTouchStart, {
      passive: false
    });
    container.addEventListener('touchmove', onTouchMove, {
      passive: false
    });
    container.addEventListener('touchend', onTouchEnd);
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, []);
  const handleReset = () => {
    setZoom(0.8);
    setPosition({
      x: 0,
      y: 0
    });
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
      <div className="flex flex-col h-full bg-[var(--background)] overflow-hidden relative font-sans selection:bg-[hsl(166_61%_35%/0.22)] transition-colors duration-500">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div
            className="hidden"
            style={{
              background: 'radial-gradient(circle, hsl(166 61% 35%) 0%, transparent 70%)',
              filter: 'blur(80px)'
            }}
          />
          <div
            className="hidden"
            style={{
              background: 'radial-gradient(circle, hsl(218 82% 55%) 0%, transparent 70%)',
              filter: 'blur(80px)'
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.015] dark:opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle, hsl(166 61% 35%) 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          />
        </div>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-3xl px-4">
          <header className="bg-[var(--surface-overlay)] backdrop-blur-2xl border border-[var(--border-color)] rounded-[20px] h-13 flex items-center justify-between px-4 shadow-[0_8px_32px_hsl(222_47%_4%/0.08),0_2px_8px_hsl(222_47%_4%/0.04)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--surface)] hover:bg-[var(--card-bg-hover)] text-[var(--foreground)] transition-all active:scale-90 shrink-0"
              >
                <span className="material-symbols-outlined icon-thin text-[16px]">west</span>
              </button>
              <h1 className="hidden sm:block font-semibold text-[var(--foreground)] text-[13px] truncate min-w-0 max-w-[140px] md:max-w-[280px] lg:max-w-[420px]">
                {docData?.file_name}
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-[var(--surface)] rounded-xl p-0.5 border border-[var(--border-color)]">
                <button
                  onClick={unifiedUndo}
                  disabled={!canUndo}
                  className={`w-8 h-7 flex items-center justify-center rounded-lg text-[14px] transition-all ${!canUndo ? 'text-[var(--muted-light)] opacity-40 cursor-not-allowed' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]'}`}
                  title={MINDMAP_PAGE_TEXTS.CONTROLS.UNDO}
                >
                  <span className="material-symbols-outlined icon-thin text-[16px]">undo</span>
                </button>
                <button
                  onClick={unifiedRedo}
                  disabled={!canRedo}
                  className={`w-8 h-7 flex items-center justify-center rounded-lg text-[14px] transition-all ${!canRedo ? 'text-[var(--muted-light)] opacity-40 cursor-not-allowed' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]'}`}
                  title={MINDMAP_PAGE_TEXTS.CONTROLS.REDO}
                >
                  <span className="material-symbols-outlined icon-thin text-[16px]">redo</span>
                </button>
              </div>
              <div className="hidden md:flex items-center bg-[var(--surface)] rounded-xl p-0.5 border border-[var(--border-color)]">
                <button
                  onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))}
                  className="w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <span className="material-symbols-outlined icon-thin text-[14px]">remove</span>
                </button>
                <span className="px-2 text-[10px] font-bold text-[var(--muted)] font-mono w-10 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
                  className="w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <span className="material-symbols-outlined icon-thin text-[14px]">add</span>
                </button>
              </div>
              <div className="w-px h-5 bg-[var(--border-color)] mx-0.5" />
              <span className="hidden sm:inline-flex">
                <LiquidGlassButton
                  variant="subtle"
                  size="sm"
                  icon="restart_alt"
                  onClick={() => setShowResetConfirm(true)}
                >
                  {MINDMAP_WORKSPACE_TEXTS.canvas.regenerate}
                </LiquidGlassButton>
              </span>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-8 h-8 flex sm:hidden items-center justify-center rounded-xl text-[var(--muted)] hover:text-[hsl(343_85%_58%)] hover:bg-[hsl(343_85%_58%/0.06)] transition-all active:scale-90"
                title={MINDMAP_PAGE_TEXTS.CONTROLS.RESET_DIAGRAM}
              >
                <span className="material-symbols-outlined icon-thin text-[17px]">restart_alt</span>
              </button>
              <button
                onClick={() => mindmapRef.current?.downloadImage()}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-strong)] text-white shadow-[0_2px_8px_hsl(166_61%_35%/0.35)] transition-all active:scale-90"
                title={MINDMAP_PAGE_TEXTS.CONTROLS.DOWNLOAD}
              >
                <span className="material-symbols-outlined icon-thin text-[17px]">download</span>
              </button>
            </div>
          </header>
        </div>
        <div
          ref={containerRef}
          className={`flex-1 relative overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.19, 1, 0.22, 1)'
            }}
          >
            {quotaExceeded ? (
              <div className="flex flex-col items-center gap-6 bg-[var(--surface-overlay)] backdrop-blur-xl px-14 py-10 rounded-[28px] border border-[var(--border-color)] shadow-[0_8px_32px_hsl(222_47%_4%/0.08)] pointer-events-auto">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-400/20 flex items-center justify-center border border-amber-400/20">
                  <span className="material-symbols-outlined text-[28px] text-amber-500">bolt</span>
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-[13px] font-bold text-[var(--foreground)]">
                    {QUOTA_TEXTS.exceeded.title}
                  </p>
                  <p className="text-[11px] text-[var(--muted)] font-medium">
                    {QUOTA_TEXTS.exceeded.ai}
                  </p>
                  <p className="text-[10px] text-[var(--muted-light)]">
                    {QUOTA_TEXTS.exceeded.desc}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate("/settings")}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white text-[12px] font-bold hover:opacity-90 transition-all active:scale-95 shadow-[0_4px_16px_hsl(166_61%_35%/0.28)]"
                  >
                    {QUOTA_TEXTS.exceeded.upgradeBtn}
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="px-5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[var(--muted)] text-[12px] font-bold hover:bg-[var(--card-bg)] transition-all active:scale-95"
                  >
                    {QUOTA_TEXTS.exceeded.laterBtn}
                  </button>
                </div>
              </div>
            ) : errorMessage ? (
              <div className="flex flex-col items-center gap-6 bg-[var(--surface-overlay)] backdrop-blur-xl px-14 py-10 rounded-[28px] border border-[hsl(343_85%_58%/0.25)] shadow-[0_8px_32px_hsl(222_47%_4%/0.08)] pointer-events-auto max-w-md">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-400/20 to-rose-400/20 flex items-center justify-center border border-red-400/20">
                  <span className="material-symbols-outlined text-[28px] text-red-500">error_outline</span>
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-[13px] font-bold text-[var(--foreground)]">
                    {MINDMAP_WORKSPACE_TEXTS.canvas.errorTitle}
                  </p>
                  <p className="text-[11px] text-[var(--muted)] font-medium">
                    {errorMessage}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => loadData(false)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white text-[12px] font-bold hover:opacity-90 transition-all active:scale-95 shadow-[0_4px_16px_hsl(166_61%_35%/0.28)] flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined icon-thin text-[14px]">refresh</span>
                    {MINDMAP_WORKSPACE_TEXTS.canvas.retry}
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="px-5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[var(--muted)] text-[12px] font-bold hover:bg-[var(--card-bg)] transition-all active:scale-95"
                  >
                    {MINDMAP_WORKSPACE_TEXTS.canvas.back}
                  </button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center gap-6 bg-[var(--surface-overlay)] backdrop-blur-xl px-14 py-10 rounded-[28px] border border-[var(--border-color)] shadow-[0_8px_32px_hsl(222_47%_4%/0.08)]">
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-xl blur-xl opacity-40"
                    style={{
                      background: "radial-gradient(circle, hsl(166 61% 35%) 0%, hsl(218 82% 55%) 100%)"
                    }}
                  />
                  <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center shadow-[0_4px_16px_hsl(166_61%_35%/0.28)]">
                    <span className="material-symbols-outlined icon-thin text-white text-[26px]">account_tree</span>
                  </div>
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-[13px] font-bold text-[var(--foreground)]">
                    {MINDMAP_PAGE_TEXTS.STATUS.LOADING}
                  </p>
                  <p className="text-[11px] text-[var(--muted)] font-medium">
                    {MINDMAP_PAGE_TEXTS.STATUS.LOADING_SUBTITLE}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-jumping-dot"
                      style={{
                        animationDelay: `${i * 0.16}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="pointer-events-auto min-w-[1400px] flex items-center justify-center">
                <InteractiveMindmap
                  ref={mindmapRef}
                  documentId={documentId}
                  chart={mindmapCode}
                  zoom={zoom}
                  onCodeChange={handleCodeChange}
                  onUndoRedoStateChange={handleUndoRedoStateChange}
                />
              </div>
            )}
          </div>
          <div className={`absolute bottom-8 left-8 transition-all duration-700 hidden md:block ${!hasInteracted && isUIVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}>
            <div className="bg-[var(--surface-overlay)] backdrop-blur-xl border border-[var(--border-color)] rounded-lg shadow-[0_8px_24px_hsl(222_47%_4%/0.08)] p-3 flex items-center gap-3 w-[320px]">
              <div className="w-8 h-8 rounded-xl bg-[hsl(166_61%_35%/0.08)] border border-[hsl(166_61%_35%/0.15)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                <span className="material-symbols-outlined icon-thin text-[16px]">mouse</span>
              </div>
              <div>
                <p className="text-[9px] font-bold font-mono text-[var(--muted-light)] mb-0.5">
                  {MINDMAP_PAGE_TEXTS.GUIDE.TITLE}
                </p>
                <p className="text-[11px] text-[var(--foreground)] font-medium leading-snug opacity-80">
                  {MINDMAP_PAGE_TEXTS.GUIDE.DESC}
                </p>
              </div>
            </div>
          </div>
          <div className={`absolute bottom-8 left-4 right-4 transition-all duration-700 md:hidden ${!hasInteracted && isUIVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}>
            <div className="bg-[var(--surface-overlay)] backdrop-blur-xl border border-[var(--border-color)] rounded-lg shadow-[0_8px_24px_hsl(222_47%_4%/0.08)] p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[hsl(166_61%_35%/0.08)] border border-[hsl(166_61%_35%/0.15)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                <span className="material-symbols-outlined icon-thin text-[16px]">touch_app</span>
              </div>
              <div>
                <p className="text-[9px] font-bold font-mono text-[var(--muted-light)] mb-0.5">
                  {MINDMAP_WORKSPACE_TEXTS.canvas.guideTitle}
                </p>
                <p className="text-[11px] text-[var(--foreground)] font-medium leading-snug opacity-80">
                  {MINDMAP_PAGE_TEXTS.GUIDE.MOBILE_DESC}
                </p>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setPosition({
              x: 0,
              y: 0
            });
            setZoom(0.8);
          }}
          className="absolute bottom-6 right-6 z-50 w-9 h-9 bg-[var(--surface-overlay)] border border-[var(--border-color)] backdrop-blur-xl rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--brand-primary)] hover:border-[hsl(166_61%_35%/0.30)] shadow-[0_4px_16px_hsl(222_47%_4%/0.08)] transition-all active:scale-90"
          title={MINDMAP_PAGE_TEXTS.CONTROLS.RESET_VIEW}
        >
          <span className="material-symbols-outlined icon-thin text-[18px]">filter_center_focus</span>
        </button>
        <aside
          className="fixed top-24 right-6 bottom-6 z-40 overflow-hidden"
          style={{
            width: '400px',
            opacity: isSidebarOpen ? 1 : 0,
            transform: isSidebarOpen ? 'translateX(0)' : 'translateX(24px)',
            transition: 'opacity 0.3s ease, transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)',
            pointerEvents: isSidebarOpen ? 'auto' : 'none'
          }}
        >
          <div className="h-full bg-[var(--surface-overlay)] backdrop-blur-3xl border border-[var(--border-color)] rounded-lg flex flex-col shadow-[0_32px_64px_hsl(222_47%_4%/0.12),0_8px_24px_hsl(222_47%_4%/0.06)] min-w-[400px]">
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center shadow-[0_4px_12px_hsl(166_61%_35%/0.35)]">
                    <span className="material-symbols-outlined icon-thin text-white text-[16px]">code</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] text-[13px]">
                      {MINDMAP_PAGE_TEXTS.EDITOR.TITLE}
                    </h3>
                    <p className="text-[10px] text-[var(--muted-light)] font-medium">
                      {MINDMAP_PAGE_TEXTS.EDITOR.SUBTITLE}
                    </p>
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
                <p className="text-[10px] font-bold text-[var(--brand-primary)] font-mono px-1">
                  {MINDMAP_PAGE_TEXTS.EDITOR.LABEL}
                </p>
                <div className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-br from-[hsl(166_61%_35%/0.20)] to-[hsl(218_82%_55%/0.15)] rounded-xl opacity-50 group-focus-within:opacity-100 transition-opacity duration-300" />
                  <textarea
                    value={editableCode}
                    onChange={e => setEditableCode(e.target.value)}
                    className="relative w-full h-[360px] p-5 bg-[var(--surface)] border border-[var(--border-color)] rounded-lg text-[12px] text-[var(--foreground)] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[hsl(166_61%_35%/0.30)] focus:border-[hsl(166_61%_35%/0.40)] custom-scrollbar transition-all resize-none"
                    placeholder={MINDMAP_PAGE_TEXTS.EDITOR.PLACEHOLDER}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={handleApplyEdit}
                    className="col-span-3 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-strong)] text-white rounded-xl font-semibold text-[12px] shadow-[0_4px_12px_hsl(166_61%_35%/0.30)] transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined icon-thin text-[15px]">check_circle</span>
                    {MINDMAP_PAGE_TEXTS.EDITOR.APPLY}
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className={`py-3 rounded-xl font-semibold text-[12px] transition-all flex items-center justify-center active:scale-95 ${copySuccess ? 'bg-[hsl(158_64%_44%)] text-white' : 'bg-[var(--surface)] border border-[var(--border-color)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg-hover)]'}`}
                    title={MINDMAP_PAGE_TEXTS.CONTROLS.COPY_CODE}
                  >
                    <span className="material-symbols-outlined icon-thin text-[15px]">
                      {copySuccess ? 'done_all' : 'file_copy'}
                    </span>
                  </button>
                </div>
                <div className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border-subtle)] space-y-2">
                  <h4 className="font-semibold text-[var(--foreground)] text-[12px] flex items-center gap-2">
                    <span className="material-symbols-outlined icon-thin text-[var(--brand-primary)] text-[14px]">info</span>
                    {MINDMAP_WORKSPACE_TEXTS.canvas.noteTitle}
                  </h4>
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                    {MINDMAP_WORKSPACE_TEXTS.canvas.noteBodyPrefix}
                    <strong className="text-[var(--foreground)]">{"\u201CC\u1EADp nh\u1EADt\u201D"}</strong>
                    {MINDMAP_WORKSPACE_TEXTS.canvas.noteBodySuffix}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['#Mindmap', '#Mermaid', '#AI_Tutor'].map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[hsl(166_61%_35%/0.08)] border border-[hsl(166_61%_35%/0.15)] rounded-full text-[9px] text-[var(--brand-primary)] font-bold tracking-wide"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
        <style>{`
        @media print {
          header, aside, button, .z-30 { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
      </div>
      <ConfirmDialog
        open={showResetConfirm}
        title={MINDMAP_PAGE_TEXTS.RESET_CONFIRM.TITLE}
        message={MINDMAP_PAGE_TEXTS.RESET_CONFIRM.MESSAGE}
        confirmLabel={MINDMAP_PAGE_TEXTS.RESET_CONFIRM.CONFIRM}
        cancelLabel={MINDMAP_PAGE_TEXTS.RESET_CONFIRM.CANCEL}
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
