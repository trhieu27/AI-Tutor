import { useState, useRef } from "react";
import { useUpload } from "@/context/UploadContext";
import { UPLOAD_AREA_TEXTS } from "@/constants/texts";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function UploadArea({
  onUploadSuccess
}) {
  const {
    queue,
    addToQueue,
    removeFromQueue,
    isAnyUploading
  } = useUpload();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const processFiles = async files => {
    if (!files || files.length === 0) return;
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    let hasInvalid = false;
    for (let i = 0; i < files.length; i++) {
      if (!allowedTypes.includes(files[i].type)) {
        hasInvalid = true;
        break;
      }
    }
    if (hasInvalid) setError("Chỉ chấp nhận định dạng PDF hoặc DOCX.");
    await addToQueue(files);
    if (onUploadSuccess) onUploadSuccess();
  };
  const handleFileChange = e => {
    processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  return /*#__PURE__*/_jsxs("div", {
    className: "space-y-3 flex-1 flex flex-col",
    children: [/*#__PURE__*/_jsxs("div", {
      onDragOver: e => {
        e.preventDefault();
        setIsDragging(true);
      },
      onDragLeave: () => setIsDragging(false),
      onDrop: e => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
      },
      onClick: () => !isAnyUploading && fileInputRef.current?.click(),
      className: `relative group cursor-pointer border-2 border-dashed rounded-3xl p-8 transition-all duration-300 flex-1 flex flex-col items-center justify-center text-center overflow-hidden min-h-[200px] ${isDragging ? 'border-[hsl(239_68%_58%)] bg-[hsl(239_68%_58%/0.06)] scale-[0.99]' : 'border-[var(--border-color)] bg-[var(--surface)] hover:border-[hsl(239_68%_58%/0.50)] hover:bg-[hsl(239_68%_58%/0.04)]'} ${isAnyUploading ? 'cursor-wait opacity-70' : ''}`,
      children: [isDragging && /*#__PURE__*/_jsx("div", {
        className: "absolute inset-0 pointer-events-none",
        children: /*#__PURE__*/_jsx("div", {
          className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[hsl(239_68%_58%/0.15)] blur-[60px] rounded-full"
        })
      }), /*#__PURE__*/_jsxs("div", {
        className: "relative z-10 flex flex-col items-center gap-4",
        children: [/*#__PURE__*/_jsx("div", {
          className: `w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-[0_4px_16px_hsl(239_68%_58%/0.25)] ${isAnyUploading ? 'bg-[hsl(239_68%_58%)] text-white animate-pulse' : 'bg-[hsl(239_68%_58%)] text-white group-hover:scale-110 group-hover:rotate-6'}`,
          children: /*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined icon-thin text-[28px]",
            children: isAnyUploading ? 'sync' : 'cloud_upload'
          })
        }), /*#__PURE__*/_jsxs("div", {
          className: "space-y-1.5",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-[15px] font-semibold text-[var(--foreground)] tracking-tight",
            children: isAnyUploading ? 'Đang tải lên hàng đợi…' : UPLOAD_AREA_TEXTS.title
          }), /*#__PURE__*/_jsx("p", {
            className: "text-[11px] text-[var(--muted)] font-medium uppercase tracking-[0.18em]",
            children: "K\xE9o th\u1EA3 PDF/DOCX ho\u1EB7c nh\u1EA5n \u0111\u1EC3 ch\u1ECDn"
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "flex gap-2",
          children: ['PDF', 'DOCX'].map(f => /*#__PURE__*/_jsx("span", {
            className: "px-2.5 py-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-full text-[10px] font-bold text-[var(--muted)] tracking-wide",
            children: f
          }, f))
        })]
      }), /*#__PURE__*/_jsx("input", {
        type: "file",
        ref: fileInputRef,
        onChange: handleFileChange,
        className: "hidden",
        accept: ".pdf,.docx",
        multiple: true
      })]
    }), queue.length > 0 && /*#__PURE__*/_jsx("div", {
      className: "space-y-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar shrink-0",
      children: queue.map(item => /*#__PURE__*/_jsxs("div", {
        className: "group/item bg-[var(--card-bg)] p-3.5 rounded-xl border border-[var(--border-color)] flex items-center gap-3 transition-colors duration-200",
        children: [/*#__PURE__*/_jsx("div", {
          className: `w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.status === 'success' ? 'bg-[hsl(158_64%_44%/0.10)] text-[hsl(158_64%_44%)]' : item.status === 'error' ? 'bg-[hsl(343_85%_58%/0.10)] text-[hsl(343_85%_58%)]' : 'bg-[hsl(239_68%_58%/0.10)] text-[hsl(239_68%_58%)]'}`,
          children: /*#__PURE__*/_jsx("span", {
            className: `material-symbols-outlined icon-thin text-[18px] ${item.status === 'uploading' ? 'animate-spin' : ''}`,
            children: item.status === 'success' ? 'check_circle' : item.status === 'error' ? 'error' : item.status === 'uploading' ? 'sync' : 'hourglass_empty'
          })
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex-1 min-w-0",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "flex justify-between items-center mb-1.5",
            children: [/*#__PURE__*/_jsx("p", {
              className: "text-[12px] font-semibold text-[var(--foreground)] truncate pr-3",
              children: item.file.name
            }), /*#__PURE__*/_jsxs("p", {
              className: "text-[10px] font-medium text-[var(--muted-light)] shrink-0",
              children: [(item.file.size / (1024 * 1024)).toFixed(1), " MB"]
            })]
          }), /*#__PURE__*/_jsx("div", {
            className: "w-full h-0.5 bg-[var(--surface)] rounded-full overflow-hidden",
            children: /*#__PURE__*/_jsx("div", {
              className: `h-full rounded-full transition-all duration-500 ${item.status === 'success' ? 'bg-[hsl(158_64%_44%)]' : item.status === 'error' ? 'bg-[hsl(343_85%_58%)]' : 'bg-[hsl(239_68%_58%)]'}`,
              style: {
                width: item.status === 'success' ? '100%' : item.status === 'uploading' ? '65%' : '5%'
              }
            })
          })]
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => removeFromQueue(item.id),
          className: "w-7 h-7 flex items-center justify-center rounded-lg text-[var(--muted-light)] hover:text-[hsl(343_85%_58%)] hover:bg-[hsl(343_85%_58%/0.08)] transition-all opacity-0 group-hover/item:opacity-100 shrink-0",
          children: /*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined icon-thin text-[16px]",
            children: "close"
          })
        })]
      }, item.id))
    }), error && /*#__PURE__*/_jsxs("div", {
      className: "flex items-center gap-3 p-3.5 bg-[hsl(343_85%_58%/0.08)] border border-[hsl(343_85%_58%/0.20)] rounded-xl shrink-0",
      children: [/*#__PURE__*/_jsx("span", {
        className: "material-symbols-outlined icon-thin text-[hsl(343_85%_58%)] text-[18px] shrink-0",
        children: "error"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[12px] text-[hsl(343_85%_58%)] font-medium flex-1",
        children: error
      }), /*#__PURE__*/_jsx("button", {
        onClick: () => setError(""),
        className: "text-[var(--muted-light)] hover:text-[var(--foreground)] transition-colors",
        children: /*#__PURE__*/_jsx("span", {
          className: "material-symbols-outlined icon-thin text-[16px]",
          children: "close"
        })
      })]
    })]
  });
}