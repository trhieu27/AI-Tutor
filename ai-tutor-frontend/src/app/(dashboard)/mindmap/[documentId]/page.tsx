"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchDocument, fetchDocumentMindmap, fetchDocumentMindmapStream, DocumentResponse } from "@/services/api.service";
import MermaidChart from "@/components/MermaidChart";
import { MINDMAP_PAGE_TEXTS } from "@/constants/texts";

export default function InteractiveMindmapPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;
  
  const [docData, setDocData] = useState<DocumentResponse | null>(null);
  const [mindmapCode, setMindmapCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [zoom, setZoom] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editableCode, setEditableCode] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  const cleanMermaidCode = (code: string) => {
    let clean = code.trim();
    if (clean.includes("```")) {
      const match = clean.match(/```(?:mermaid)?\n?([\s\S]*?)\n?```/);
      if (match) clean = match[1];
    }
    const lines = clean.split('\n');
    let hasMindmapKeyword = false;
    const processedLines = lines.map((line) => {
      let trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.toLowerCase().startsWith('mindmap')) {
        hasMindmapKeyword = true;
        return "mindmap";
      }
      const indent = line.match(/^\s*/)?.[0] || "";
      let rawText = trimmed.replace(/[\[\]\(\)\{\}]/g, '').trim();
      rawText = rawText.replace(/^[\-\*\+\.]\s*/, '');
      if (!rawText) return "";
      return `${indent}"${rawText}"`;
    });
    let result = processedLines.filter(l => l !== "").join('\n');
    if (!hasMindmapKeyword) result = "mindmap\n" + result;
    return result.replace(/\n\s*\n/g, '\n');
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setMindmapCode(""); // Clear to show fresh stream
    
    const controller = new AbortController();

    try {
      // Fetch document info first
      const doc = await fetchDocument(documentId);
      setDocData(doc);

      let accumulated = "";
      await fetchDocumentMindmapStream(
        documentId,
        (chunk) => {
          setIsLoading(false); // Hide loading as soon as first chunk arrives
          accumulated += chunk;
          const clean = cleanMermaidCode(accumulated);
          setMindmapCode(clean);
          setEditableCode(clean);
        },
        controller.signal
      );
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Error loading mindmap:", error);
    } finally {
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [documentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.15), 3));
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
    setMindmapCode(code);
    setEditableCode(code);
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
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-4 pointer-events-none">
        <header className="bg-white/80 dark:bg-white/10 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[28px] h-16 flex items-center justify-between px-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] pointer-events-auto">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white transition-all active:scale-90"
            >
              <span className="material-symbols-outlined text-[20px]">west</span>
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] text-indigo-500 dark:text-indigo-300 font-bold uppercase tracking-[0.2em] mb-0.5">Đang trình chiếu</span>
              <h1 className="font-bold text-slate-900 dark:text-white text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                {docData?.file_name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-black/20 rounded-2xl p-1 border border-slate-200 dark:border-white/5 mr-2">
               <button onClick={() => setZoom(prev => Math.max(0.2, prev-0.1))} className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-lg">remove</span>
               </button>
               <span className="px-3 text-[11px] font-black text-slate-400 dark:text-white/40 font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(prev => Math.min(3, prev+0.1))} className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-lg">add</span>
               </button>
            </div>
            
            <button 
              onClick={() => window.print()}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-indigo-50 dark:bg-white text-indigo-600 dark:text-slate-900 group transition-all hover:bg-indigo-600 dark:hover:bg-indigo-400 hover:text-white"
              title="Xuất file"
            >
              <span className="material-symbols-outlined">download</span>
            </button>
            
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all ${
                isSidebarOpen 
                ? 'bg-indigo-600 text-white shadow-[0_10px_25px_rgba(99,102,241,0.4)]' 
                : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{isSidebarOpen ? 'close' : 'auto_fix_high'}</span>
              <span className="hidden sm:inline">{isSidebarOpen ? 'Đóng' : 'Tùy chỉnh'}</span>
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
            <div className="pointer-events-auto min-w-[1400px] flex items-center justify-center drop-shadow-[0_35px_60px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_35px_60px_rgba(0,0,0,0.5)]">
              <MermaidChart chart={mindmapCode} />
            </div>
          )}
        </div>

        {/* User Guidance Overlay */}
        <div className="absolute bottom-10 left-10 pointer-events-none space-y-3">
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-3xl p-5 flex items-center gap-4 shadow-2xl">
             <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <span className="material-symbols-outlined">mouse</span>
             </div>
             <div>
                <p className="text-[11px] text-slate-400 dark:text-white/30 font-bold uppercase tracking-wider mb-1">Thao tác</p>
                <p className="text-xs text-slate-800 dark:text-white/70 font-medium">Cầm kéo để di chuyển • Lăn chuột để thu phóng</p>
             </div>
          </div>
        </div>

        {/* Mini Floating Reset Control */}
        <button 
          onClick={handleReset}
          className="absolute bottom-10 right-10 w-14 h-14 bg-white dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white transition-all shadow-2xl flex items-center justify-center group"
          title="Về trung tâm"
        >
          <span className="material-symbols-outlined transition-transform group-hover:rotate-180">filter_center_focus</span>
        </button>
      </div>

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
