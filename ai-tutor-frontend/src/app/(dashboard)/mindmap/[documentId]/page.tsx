"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchDocument, fetchDocumentMindmap, fetchDocumentMindmapStream, DocumentResponse } from "@/services/api.service";
import InteractiveMindmap from "@/components/InteractiveMindmap";
import { MINDMAP_PAGE_TEXTS } from "@/constants/texts";

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
  const isStreamingRef = useRef(false);

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
    setIsLoading(true);
    setMindmapCode("");
    isStreamingRef.current = false;

    const controller = new AbortController();

    try {
      // Fetch document info first
      const doc = await fetchDocument(documentId);
      setDocData(doc);

      let accumulated = "";
      const lineCountRef = { current: 0 };
      isStreamingRef.current = true;
      await fetchDocumentMindmapStream(
        documentId,
        (chunk) => {
          setIsLoading(false);
          accumulated += chunk;
          const clean = cleanMermaidCode(accumulated);

          // CRITICAL: Use the latest code from the REF to avoid stale closure issues
          // Push history checkpoint periodically during streaming (only if regenerating)
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
      console.error("Error loading mindmap:", error);
    } finally {
      setIsLoading(false);
      isStreamingRef.current = false;
    }

    return () => controller.abort();
  }, [documentId]);

  useEffect(() => {
    loadData();
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
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 dark:bg-[#0F172A] overflow-hidden relative font-sans selection:bg-indigo-500/30 transition-colors duration-500">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 z-0 opacity-20 dark:opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600 dark:bg-indigo-600 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-500 dark:bg-purple-600 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Floating Top Header - Human Design style */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-3xl px-4 transition-all duration-700">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[22px] h-14 flex items-center justify-between px-5 shadow-[0_15px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white transition-all active:scale-90"
            >
              <span className="material-symbols-outlined text-[18px]">west</span>
            </button>
            <h1 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm truncate max-w-[200px] md:max-w-md lg:max-w-lg">
              {docData?.file_name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo/Redo Controls */}
            <div className="flex items-center bg-slate-100 dark:bg-black/20 rounded-xl p-0.5 border border-slate-200 dark:border-white/5 mr-1">
              <button
                onClick={unifiedUndo}
                disabled={!canUndo}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${!canUndo ? 'text-slate-300 dark:text-slate-700 opacity-40 cursor-not-allowed' : 'text-slate-600 dark:text-white/70 hover:bg-white dark:hover:bg-white/10'}`}
                title="Hoàn tác (Ctrl+Z)"
              >
                <span className="material-symbols-outlined text-[18px]">undo</span>
              </button>
              <button
                onClick={unifiedRedo}
                disabled={!canRedo}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${!canRedo ? 'text-slate-300 dark:text-slate-700 opacity-40 cursor-not-allowed' : 'text-slate-600 dark:text-white/70 hover:bg-white dark:hover:bg-white/10'}`}
                title="Làm lại (Ctrl+Y)"
              >
                <span className="material-symbols-outlined text-[18px]">redo</span>
              </button>
            </div>

            <div className="hidden md:flex items-center bg-slate-100 dark:bg-black/20 rounded-xl p-0.5 border border-slate-200 dark:border-white/5 mr-1">
              <button onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))} className="w-7 h-7 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[14px]">remove</span>
              </button>
              <span className="px-2 text-[10px] font-black text-slate-400 dark:text-white/40 font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(prev => Math.min(3, prev + 0.1))} className="w-7 h-7 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[14px]">add</span>
              </button>
            </div>

            <button
              onClick={() => {
                if (confirm("Bạn có chắc chắn muốn xóa toàn bộ sơ đồ và yêu cầu AI tạo lại từ đầu không?")) {
                  mindmapRef.current?.resetLayout();
                  loadData(true); // Re-call AI API with force=true
                  handleReset(); // Reset viewport
                }
              }}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 group transition-all hover:bg-red-600 dark:hover:bg-red-500 hover:text-white mr-1"
              title="Đặt lại toàn bộ sơ đồ"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            </button>

            <button
              onClick={() => mindmapRef.current?.downloadImage()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-white text-indigo-600 dark:text-slate-900 group transition-all hover:bg-indigo-600 dark:hover:bg-indigo-400 hover:text-white"
              title={MINDMAP_PAGE_TEXTS.CONTROLS.DOWNLOAD}
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
            </button>
          </div>
        </header>
      </div>

      {/* Main Interactive Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)'
          }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-12 rounded-[40px] border border-slate-200 dark:border-white/10 animate-pulse">
              <div className="w-16 h-16 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 dark:text-white/40 text-[11px] font-black uppercase tracking-[0.3em]">{MINDMAP_PAGE_TEXTS.STATUS.LOADING}</p>
            </div>
          ) : (
            <div className="pointer-events-auto min-w-[1400px] flex items-center justify-center drop-shadow-[0_35px_60px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_35px_60px_rgba(0,0,0,0.4)]">
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

        {/* User Guidance Overlay */}
        <div className={`absolute bottom-8 left-8 transition-all duration-1000 ${(!hasInteracted && isUIVisible) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[20px] shadow-2xl p-3 flex items-center gap-3 w-[340px]">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <span className="material-symbols-outlined text-[18px]">mouse</span>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 dark:text-white/30 font-bold mb-0">{MINDMAP_PAGE_TEXTS.GUIDE.TITLE}</p>
              <p className="text-[11px] text-slate-800 dark:text-white/70 font-bold leading-tight">{MINDMAP_PAGE_TEXTS.GUIDE.DESC}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Manual Reset Button - Always Visible - Moved outside to prevent event interference */}
      <button
        onClick={() => {
          setPosition({ x: 0, y: 0 });
          setZoom(0.8);
        }}
        className="absolute bottom-6 right-6 z-50 w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xl transition-all active:scale-95"
        title={MINDMAP_PAGE_TEXTS.CONTROLS.RESET_VIEW}
      >
        <span className="material-symbols-outlined">filter_center_focus</span>
      </button>

      {/* Floating Glass Sidebar */}
      <aside className={`fixed top-28 right-8 bottom-8 z-40 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${isSidebarOpen ? 'w-[420px] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-12'}`}>
        <div className="h-full bg-white/90 dark:bg-slate-900/80 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-[40px] flex flex-col shadow-[0_50px_100px_rgba(0,0,0,0.1)] dark:shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
          <div className="p-8 flex flex-col h-full min-w-[420px]">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 dark:shadow-indigo-500/30">
                  <span className="material-symbols-outlined text-white text-xl">pen_size</span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Thiết kế Sơ đồ</h3>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-4 pb-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Mã nguồn sơ đồ (Mermaid)</span>
                </div>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl opacity-10 dark:opacity-20 blur group-focus-within:opacity-20 dark:group-focus-within:opacity-40 transition duration-500"></div>
                  <textarea
                    value={editableCode}
                    onChange={(e) => setEditableCode(e.target.value)}
                    className="relative w-full h-[400px] p-6 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/5 rounded-3xl text-[13px] text-slate-800 dark:text-indigo-100/90 font-mono focus:outline-none leading-relaxed custom-scrollbar"
                    placeholder={MINDMAP_PAGE_TEXTS.EDITOR.PLACEHOLDER}
                  />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={handleApplyEdit}
                    className="col-span-3 py-4 bg-indigo-500 text-white rounded-[20px] font-bold text-sm hover:bg-indigo-400 shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <span className="material-symbols-outlined text-lg text-white/70">check_circle</span>
                    {MINDMAP_PAGE_TEXTS.EDITOR.APPLY}
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className={`py-4 rounded-[20px] font-bold transition-all flex items-center justify-center shadow-md ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    title="Sao chép mã"
                  >
                    <span className="material-symbols-outlined">{copySuccess ? 'done_all' : 'file_copy'}</span>
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-100/50 dark:bg-gradient-to-br dark:from-white/5 dark:to-white/[0.02] rounded-[32px] border border-slate-200 dark:border-white/5 space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-base">auto_awesome</span>
                  Kiến thức bổ sung
                </h4>
                <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed">
                  Bạn có thể thay đổi cấu trúc của sơ đồ bằng cách chỉnh sửa mã nguồn phía trên.
                  Mọi thay đổi sẽ được áp dụng ngay lập tức sau khi nhấn nút Cập nhật.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {['#Học_tập', '#AI_Tutor', '#Sơ_đồ_tư_duy'].map(tag => (
                    <span key={tag} className="px-3 py-1 bg-slate-200 dark:bg-white/5 rounded-full text-[10px] text-slate-500 dark:text-white/40 font-bold border border-slate-300 dark:border-white/5">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.4);
        }
        @media print {
          header, aside, button, .z-30 { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
