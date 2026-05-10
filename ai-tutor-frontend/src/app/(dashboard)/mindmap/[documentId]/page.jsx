import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchDocument, fetchDocumentMindmapStream, QuotaError } from "@/services/api.service";
import InteractiveMindmap from "@/components/InteractiveMindmap";
import ConfirmDialog from "@/components/ConfirmDialog";
import { MINDMAP_PAGE_TEXTS, QUOTA_TEXTS } from "@/constants/texts";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export default function InteractiveMindmapPage() {
  const params = useParams();
  const navigate = useNavigate();
  const documentId = params.documentId;
  if (!documentId) return null;
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
      } = await import("@/services/api.service");
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
      setErrorMessage('Không thể tạo sơ đồ tư duy. Vui lòng thử lại.');
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
  return /*#__PURE__*/_jsxs(_Fragment, {
    children: [/*#__PURE__*/_jsxs("div", {
      className: "flex flex-col h-full bg-[var(--background)] overflow-hidden relative font-sans selection:bg-[hsl(239_68%_58%/0.25)] transition-colors duration-500",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "absolute inset-0 z-0 pointer-events-none overflow-hidden",
        children: [/*#__PURE__*/_jsx("div", {
          className: "absolute -top-[20%] -left-[10%] w-[45%] h-[45%] rounded-full opacity-[0.06] dark:opacity-[0.12]",
          style: {
            background: 'radial-gradient(circle, hsl(239 68% 58%) 0%, transparent 70%)',
            filter: 'blur(80px)'
          }
        }), /*#__PURE__*/_jsx("div", {
          className: "absolute -bottom-[15%] -right-[10%] w-[35%] h-[35%] rounded-full opacity-[0.05] dark:opacity-[0.10]",
          style: {
            background: 'radial-gradient(circle, hsl(263 70% 62%) 0%, transparent 70%)',
            filter: 'blur(80px)'
          }
        }), /*#__PURE__*/_jsx("div", {
          className: "absolute inset-0 opacity-[0.015] dark:opacity-[0.04]",
          style: {
            backgroundImage: 'radial-gradient(circle, hsl(239 68% 58%) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }
        })]
      }), /*#__PURE__*/_jsx("div", {
        className: "absolute top-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-3xl px-4",
        children: /*#__PURE__*/_jsxs("header", {
          className: "bg-[var(--surface-overlay)] backdrop-blur-2xl border border-[var(--border-color)] rounded-[20px] h-13 flex items-center justify-between px-4 shadow-[0_8px_32px_hsl(222_47%_4%/0.08),0_2px_8px_hsl(222_47%_4%/0.04)]",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "flex items-center gap-2.5 min-w-0",
            children: [/*#__PURE__*/_jsx("button", {
              onClick: () => navigate(-1),
              className: "w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--surface)] hover:bg-[var(--card-bg-hover)] text-[var(--foreground)] transition-all active:scale-90 shrink-0",
              children: /*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined icon-thin text-[16px]",
                children: "west"
              })
            }), /*#__PURE__*/_jsx("h1", {
              className: "font-semibold text-[var(--foreground)] text-[13px] truncate min-w-0 max-w-[140px] md:max-w-[280px] lg:max-w-[420px] tracking-[-0.01em]",
              children: docData?.file_name
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex items-center gap-1.5",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex items-center bg-[var(--surface)] rounded-xl p-0.5 border border-[var(--border-color)]",
              children: [/*#__PURE__*/_jsx("button", {
                onClick: unifiedUndo,
                disabled: !canUndo,
                className: `w-8 h-7 flex items-center justify-center rounded-lg text-[14px] transition-all ${!canUndo ? 'text-[var(--muted-light)] opacity-40 cursor-not-allowed' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]'}`,
                title: MINDMAP_PAGE_TEXTS.CONTROLS.UNDO,
                children: /*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined icon-thin text-[16px]",
                  children: "undo"
                })
              }), /*#__PURE__*/_jsx("button", {
                onClick: unifiedRedo,
                disabled: !canRedo,
                className: `w-8 h-7 flex items-center justify-center rounded-lg text-[14px] transition-all ${!canRedo ? 'text-[var(--muted-light)] opacity-40 cursor-not-allowed' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]'}`,
                title: MINDMAP_PAGE_TEXTS.CONTROLS.REDO,
                children: /*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined icon-thin text-[16px]",
                  children: "redo"
                })
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "hidden md:flex items-center bg-[var(--surface)] rounded-xl p-0.5 border border-[var(--border-color)]",
              children: [/*#__PURE__*/_jsx("button", {
                onClick: () => setZoom(prev => Math.max(0.2, prev - 0.1)),
                className: "w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors",
                children: /*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined icon-thin text-[14px]",
                  children: "remove"
                })
              }), /*#__PURE__*/_jsxs("span", {
                className: "px-2 text-[10px] font-bold text-[var(--muted)] font-mono w-10 text-center tracking-wider",
                children: [Math.round(zoom * 100), "%"]
              }), /*#__PURE__*/_jsx("button", {
                onClick: () => setZoom(prev => Math.min(3, prev + 0.1)),
                className: "w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors",
                children: /*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined icon-thin text-[14px]",
                  children: "add"
                })
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "w-px h-5 bg-[var(--border-color)] mx-0.5"
            }), /*#__PURE__*/_jsx("button", {
              onClick: () => setShowResetConfirm(true),
              className: "w-8 h-8 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[hsl(343_85%_58%)] hover:bg-[hsl(343_85%_58%/0.06)] transition-all active:scale-90",
              title: MINDMAP_PAGE_TEXTS.CONTROLS.RESET_DIAGRAM,
              children: /*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined icon-thin text-[17px]",
                children: "restart_alt"
              })
            }), /*#__PURE__*/_jsx("button", {
              onClick: () => mindmapRef.current?.downloadImage(),
              className: "w-8 h-8 flex items-center justify-center rounded-xl bg-[hsl(239_68%_58%)] hover:bg-[hsl(239_62%_50%)] text-white shadow-[0_2px_8px_hsl(239_68%_58%/0.35)] transition-all active:scale-90",
              title: MINDMAP_PAGE_TEXTS.CONTROLS.DOWNLOAD,
              children: /*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined icon-thin text-[17px]",
                children: "download"
              })
            })]
          })]
        })
      }), /*#__PURE__*/_jsxs("div", {
        ref: containerRef,
        className: `flex-1 relative overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`,
        onMouseDown: handleMouseDown,
        onMouseMove: handleMouseMove,
        onMouseUp: handleMouseUp,
        onMouseLeave: handleMouseUp,
        children: [/*#__PURE__*/_jsx("div", {
          className: "absolute inset-0 flex items-center justify-center pointer-events-none",
          style: {
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.19, 1, 0.22, 1)'
          },
          children: quotaExceeded ? /*#__PURE__*/_jsxs("div", {
            className: "flex flex-col items-center gap-6 bg-[var(--surface-overlay)] backdrop-blur-xl px-14 py-10 rounded-[28px] border border-[var(--border-color)] shadow-[0_8px_32px_hsl(222_47%_4%/0.08)] pointer-events-auto",
            children: [/*#__PURE__*/_jsx("div", {
              className: "w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-400/20 flex items-center justify-center border border-amber-400/20",
              children: /*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined text-[28px] text-amber-500",
                children: "bolt"
              })
            }), /*#__PURE__*/_jsxs("div", {
              className: "text-center space-y-1.5",
              children: [/*#__PURE__*/_jsx("p", {
                className: "text-[13px] font-bold text-[var(--foreground)]",
                children: QUOTA_TEXTS.exceeded.title
              }), /*#__PURE__*/_jsx("p", {
                className: "text-[11px] text-[var(--muted)] font-medium",
                children: QUOTA_TEXTS.exceeded.ai
              }), /*#__PURE__*/_jsx("p", {
                className: "text-[10px] text-[var(--muted-light)]",
                children: QUOTA_TEXTS.exceeded.desc
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex gap-3",
              children: [/*#__PURE__*/_jsx("button", {
                onClick: () => navigate("/settings"),
                className: "px-5 py-2 rounded-xl bg-gradient-to-r from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white text-[12px] font-bold hover:opacity-90 transition-all active:scale-95 shadow-[0_4px_16px_hsl(239_68%_58%/0.3)]",
                children: QUOTA_TEXTS.exceeded.upgradeBtn
              }), /*#__PURE__*/_jsx("button", {
                onClick: () => navigate(-1),
                className: "px-5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[var(--muted)] text-[12px] font-bold hover:bg-[var(--card-bg)] transition-all active:scale-95",
                children: QUOTA_TEXTS.exceeded.laterBtn
              })]
            })]
          }) : errorMessage ? /*#__PURE__*/_jsxs("div", {
            className: "flex flex-col items-center gap-6 bg-[var(--surface-overlay)] backdrop-blur-xl px-14 py-10 rounded-[28px] border border-[hsl(343_85%_58%/0.25)] shadow-[0_8px_32px_hsl(222_47%_4%/0.08)] pointer-events-auto max-w-md",
            children: [/*#__PURE__*/_jsx("div", {
              className: "w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400/20 to-rose-400/20 flex items-center justify-center border border-red-400/20",
              children: /*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined text-[28px] text-red-500",
                children: "error_outline"
              })
            }), /*#__PURE__*/_jsxs("div", {
              className: "text-center space-y-1.5",
              children: [/*#__PURE__*/_jsx("p", {
                className: "text-[13px] font-bold text-[var(--foreground)]",
                children: "Không thể tải sơ đồ tư duy"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-[11px] text-[var(--muted)] font-medium",
                children: errorMessage
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex gap-3",
              children: [/*#__PURE__*/_jsxs("button", {
                onClick: () => loadData(false),
                className: "px-5 py-2 rounded-xl bg-gradient-to-r from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white text-[12px] font-bold hover:opacity-90 transition-all active:scale-95 shadow-[0_4px_16px_hsl(239_68%_58%/0.3)] flex items-center gap-2",
                children: [/*#__PURE__*/_jsx("span", { className: "material-symbols-outlined icon-thin text-[14px]", children: "refresh" }), "Thử lại"]
              }), /*#__PURE__*/_jsx("button", {
                onClick: () => navigate(-1),
                className: "px-5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[var(--muted)] text-[12px] font-bold hover:bg-[var(--card-bg)] transition-all active:scale-95",
                children: "Quay lại"
              })]
            })]
          }) : isLoading ? /*#__PURE__*/_jsxs("div", {
            className: "flex flex-col items-center gap-6 bg-[var(--surface-overlay)] backdrop-blur-xl px-14 py-10 rounded-[28px] border border-[var(--border-color)] shadow-[0_8px_32px_hsl(222_47%_4%/0.08)]",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "relative",
              children: [/*#__PURE__*/_jsx("div", {
                className: "absolute inset-0 rounded-2xl blur-xl opacity-40",
                style: {
                  background: "radial-gradient(circle, hsl(239 68% 58%) 0%, hsl(263 70% 62%) 100%)"
                }
              }), /*#__PURE__*/_jsx("div", {
                className: "relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] flex items-center justify-center shadow-[0_4px_16px_hsl(239_68%_58%/0.30)]",
                children: /*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined icon-thin text-white text-[26px]",
                  children: "account_tree"
                })
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "text-center space-y-1.5",
              children: [/*#__PURE__*/_jsx("p", {
                className: "text-[13px] font-bold text-[var(--foreground)]",
                children: MINDMAP_PAGE_TEXTS.STATUS.LOADING
              }), /*#__PURE__*/_jsx("p", {
                className: "text-[11px] text-[var(--muted)] font-medium",
                children: MINDMAP_PAGE_TEXTS.STATUS.LOADING_SUBTITLE
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "flex items-center gap-1.5",
              children: [0, 1, 2].map(i => /*#__PURE__*/_jsx("div", {
                className: "w-1.5 h-1.5 rounded-full bg-[hsl(239_68%_58%)] animate-jumping-dot",
                style: {
                  animationDelay: `${i * 0.16}s`
                }
              }, i))
            })]
          }) : /*#__PURE__*/_jsx("div", {
            className: "pointer-events-auto min-w-[1400px] flex items-center justify-center",
            children: /*#__PURE__*/_jsx(InteractiveMindmap, {
              ref: mindmapRef,
              documentId: documentId,
              chart: mindmapCode,
              zoom: zoom,
              onCodeChange: handleCodeChange,
              onUndoRedoStateChange: handleUndoRedoStateChange
            })
          })
        }), /*#__PURE__*/_jsx("div", {
          className: `absolute bottom-8 left-8 transition-all duration-700 hidden md:block ${!hasInteracted && isUIVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`,
          children: /*#__PURE__*/_jsxs("div", {
            className: "bg-[var(--surface-overlay)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-[0_8px_24px_hsl(222_47%_4%/0.08)] p-3 flex items-center gap-3 w-[320px]",
            children: [/*#__PURE__*/_jsx("div", {
              className: "w-8 h-8 rounded-xl bg-[hsl(239_68%_58%/0.08)] border border-[hsl(239_68%_58%/0.15)] flex items-center justify-center text-[hsl(239_68%_58%)] shrink-0",
              children: /*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined icon-thin text-[16px]",
                children: "mouse"
              })
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("p", {
                className: "text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--muted-light)] mb-0.5",
                children: MINDMAP_PAGE_TEXTS.GUIDE.TITLE
              }), /*#__PURE__*/_jsx("p", {
                className: "text-[11px] text-[var(--foreground)] font-medium leading-snug opacity-80",
                children: MINDMAP_PAGE_TEXTS.GUIDE.DESC
              })]
            })]
          })
        }), /*#__PURE__*/_jsx("div", {
          className: `absolute bottom-8 left-4 right-4 transition-all duration-700 md:hidden ${!hasInteracted && isUIVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`,
          children: /*#__PURE__*/_jsxs("div", {
            className: "bg-[var(--surface-overlay)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-[0_8px_24px_hsl(222_47%_4%/0.08)] p-3 flex items-center gap-3",
            children: [/*#__PURE__*/_jsx("div", {
              className: "w-8 h-8 rounded-xl bg-[hsl(239_68%_58%/0.08)] border border-[hsl(239_68%_58%/0.15)] flex items-center justify-center text-[hsl(239_68%_58%)] shrink-0",
              children: /*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined icon-thin text-[16px]",
                children: "touch_app"
              })
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("p", {
                className: "text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--muted-light)] mb-0.5",
                children: "Thao t\xE1c"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-[11px] text-[var(--foreground)] font-medium leading-snug opacity-80",
                children: MINDMAP_PAGE_TEXTS.GUIDE.MOBILE_DESC
              })]
            })]
          })
        })]
      }), /*#__PURE__*/_jsx("button", {
        onClick: () => {
          setPosition({
            x: 0,
            y: 0
          });
          setZoom(0.8);
        },
        className: "absolute bottom-6 right-6 z-50 w-9 h-9 bg-[var(--surface-overlay)] border border-[var(--border-color)] backdrop-blur-xl rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[hsl(239_68%_58%)] hover:border-[hsl(239_68%_58%/0.30)] shadow-[0_4px_16px_hsl(222_47%_4%/0.08)] transition-all active:scale-90",
        title: MINDMAP_PAGE_TEXTS.CONTROLS.RESET_VIEW,
        children: /*#__PURE__*/_jsx("span", {
          className: "material-symbols-outlined icon-thin text-[18px]",
          children: "filter_center_focus"
        })
      }), /*#__PURE__*/_jsx("aside", {
        className: "fixed top-24 right-6 bottom-6 z-40 overflow-hidden",
        style: {
          width: isSidebarOpen ? '400px' : '0px',
          opacity: isSidebarOpen ? 1 : 0,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(16px)',
          transition: 'width 0.45s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s ease, transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)',
          pointerEvents: isSidebarOpen ? 'auto' : 'none'
        },
        children: /*#__PURE__*/_jsx("div", {
          className: "h-full bg-[var(--surface-overlay)] backdrop-blur-3xl border border-[var(--border-color)] rounded-3xl flex flex-col shadow-[0_32px_64px_hsl(222_47%_4%/0.12),0_8px_24px_hsl(222_47%_4%/0.06)] min-w-[400px]",
          children: /*#__PURE__*/_jsxs("div", {
            className: "p-6 flex flex-col h-full",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex items-center justify-between mb-6",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "flex items-center gap-3",
                children: [/*#__PURE__*/_jsx("div", {
                  className: "w-8 h-8 rounded-xl bg-[hsl(239_68%_58%)] flex items-center justify-center shadow-[0_4px_12px_hsl(239_68%_58%/0.35)]",
                  children: /*#__PURE__*/_jsx("span", {
                    className: "material-symbols-outlined icon-thin text-white text-[16px]",
                    children: "code"
                  })
                }), /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("h3", {
                    className: "font-semibold text-[var(--foreground)] text-[13px] tracking-[-0.01em]",
                    children: MINDMAP_PAGE_TEXTS.EDITOR.TITLE
                  }), /*#__PURE__*/_jsx("p", {
                    className: "text-[10px] text-[var(--muted-light)] font-medium",
                    children: MINDMAP_PAGE_TEXTS.EDITOR.SUBTITLE
                  })]
                })]
              }), /*#__PURE__*/_jsx("button", {
                onClick: () => setIsSidebarOpen(false),
                className: "w-8 h-8 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all active:scale-90",
                children: /*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined icon-thin text-[16px]",
                  children: "close"
                })
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1 pb-4",
              children: [/*#__PURE__*/_jsx("p", {
                className: "text-[10px] font-bold text-[hsl(239_68%_58%)] uppercase tracking-[0.15em] px-1",
                children: MINDMAP_PAGE_TEXTS.EDITOR.LABEL
              }), /*#__PURE__*/_jsxs("div", {
                className: "relative group",
                children: [/*#__PURE__*/_jsx("div", {
                  className: "absolute -inset-px bg-gradient-to-br from-[hsl(239_68%_58%/0.20)] to-[hsl(263_70%_62%/0.15)] rounded-2xl opacity-50 group-focus-within:opacity-100 transition-opacity duration-300"
                }), /*#__PURE__*/_jsx("textarea", {
                  value: editableCode,
                  onChange: e => setEditableCode(e.target.value),
                  className: "relative w-full h-[360px] p-5 bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl text-[12px] text-[var(--foreground)] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[hsl(239_68%_58%/0.30)] focus:border-[hsl(239_68%_58%/0.40)] custom-scrollbar transition-all resize-none",
                  placeholder: MINDMAP_PAGE_TEXTS.EDITOR.PLACEHOLDER
                })]
              }), /*#__PURE__*/_jsxs("div", {
                className: "grid grid-cols-4 gap-2",
                children: [/*#__PURE__*/_jsxs("button", {
                  onClick: handleApplyEdit,
                  className: "col-span-3 py-3 bg-[hsl(239_68%_58%)] hover:bg-[hsl(239_62%_50%)] text-white rounded-xl font-semibold text-[12px] shadow-[0_4px_12px_hsl(239_68%_58%/0.30)] transition-all active:scale-95 flex items-center justify-center gap-2",
                  children: [/*#__PURE__*/_jsx("span", {
                    className: "material-symbols-outlined icon-thin text-[15px]",
                    children: "check_circle"
                  }), MINDMAP_PAGE_TEXTS.EDITOR.APPLY]
                }), /*#__PURE__*/_jsx("button", {
                  onClick: copyToClipboard,
                  className: `py-3 rounded-xl font-semibold text-[12px] transition-all flex items-center justify-center active:scale-95 ${copySuccess ? 'bg-[hsl(158_64%_44%)] text-white' : 'bg-[var(--surface)] border border-[var(--border-color)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg-hover)]'}`,
                  title: MINDMAP_PAGE_TEXTS.CONTROLS.COPY_CODE,
                  children: /*#__PURE__*/_jsx("span", {
                    className: "material-symbols-outlined icon-thin text-[15px]",
                    children: copySuccess ? 'done_all' : 'file_copy'
                  })
                })]
              }), /*#__PURE__*/_jsxs("div", {
                className: "p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] space-y-2",
                children: [/*#__PURE__*/_jsxs("h4", {
                  className: "font-semibold text-[var(--foreground)] text-[12px] flex items-center gap-2",
                  children: [/*#__PURE__*/_jsx("span", {
                    className: "material-symbols-outlined icon-thin text-[hsl(239_68%_58%)] text-[14px]",
                    children: "info"
                  }), "Ghi ch\xFA"]
                }), /*#__PURE__*/_jsxs("p", {
                  className: "text-[11px] text-[var(--muted)] leading-relaxed",
                  children: ["Ch\u1EC9nh s\u1EEDa m\xE3 v\xE0 nh\u1EA5n ", /*#__PURE__*/_jsx("strong", {
                    className: "text-[var(--foreground)]",
                    children: "\u201CC\u1EADp nh\u1EADt\u201D"
                  }), " \u0111\u1EC3 \xE1p d\u1EE5ng. Kh\xF4ng th\u1EC3 ho\xE0n t\xE1c sau khi \xE1p d\u1EE5ng m\xE3 th\u1EE7 c\xF4ng."]
                }), /*#__PURE__*/_jsx("div", {
                  className: "flex flex-wrap gap-1.5 pt-1",
                  children: ['#Mindmap', '#Mermaid', '#AI_Tutor'].map(tag => /*#__PURE__*/_jsx("span", {
                    className: "px-2 py-0.5 bg-[hsl(239_68%_58%/0.08)] border border-[hsl(239_68%_58%/0.15)] rounded-full text-[9px] text-[hsl(239_68%_58%)] font-bold tracking-wide",
                    children: tag
                  }, tag))
                })]
              })]
            })]
          })
        })
      }), /*#__PURE__*/_jsx("style", {
        children: `
        @media print {
          header, aside, button, .z-30 { display: none !important; }
          body { background: white !important; }
        }
      `
      })]
    }), /*#__PURE__*/_jsx(ConfirmDialog, {
      open: showResetConfirm,
      title: MINDMAP_PAGE_TEXTS.RESET_CONFIRM.TITLE,
      message: MINDMAP_PAGE_TEXTS.RESET_CONFIRM.MESSAGE,
      confirmLabel: MINDMAP_PAGE_TEXTS.RESET_CONFIRM.CONFIRM,
      cancelLabel: MINDMAP_PAGE_TEXTS.RESET_CONFIRM.CANCEL,
      variant: "warning",
      onConfirm: () => {
        setShowResetConfirm(false);
        mindmapRef.current?.resetLayout();
        loadData(true);
        handleReset();
      },
      onCancel: () => setShowResetConfirm(false)
    })]
  });
}