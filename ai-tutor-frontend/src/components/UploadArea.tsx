"use client";

import { useState, useRef } from "react";
import { useUpload } from "@/context/UploadContext";
import { UPLOAD_AREA_TEXTS } from "@/constants/texts";

interface UploadAreaProps {
  onUploadSuccess?: () => void;
}

export default function UploadArea({ onUploadSuccess }: UploadAreaProps) {
  const { queue, addToQueue, removeFromQueue, isAnyUploading } = useUpload();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    let hasInvalid = false;
    for (let i = 0; i < files.length; i++) {
        if (!allowedTypes.includes(files[i].type)) {
            hasInvalid = true;
            break;
        }
    }

    if (hasInvalid) {
        setError("Chỉ chấp nhận định dạng PDF hoặc DOCX.");
    }

    await addToQueue(files);
    if (onUploadSuccess) onUploadSuccess();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4 flex-1 flex flex-col">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isAnyUploading && fileInputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-[40px] p-10 transition-all duration-500 flex-1 flex flex-col items-center justify-center text-center overflow-hidden min-h-[220px] ${
          isDragging 
          ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 scale-[0.98]" 
          : "border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:bg-indigo-50 dark:hover:bg-white/[0.05] hover:border-indigo-400 dark:hover:border-indigo-500/30"
        } ${isAnyUploading ? "cursor-wait opacity-80" : ""}`}
      >
        <div className={`absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-700 ${isDragging ? 'opacity-40' : 'opacity-0'}`}>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500 blur-[80px] rounded-full"></div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className={`w-16 h-16 rounded-[22px] mx-auto flex items-center justify-center transition-all duration-500 shadow-2xl ${
            isAnyUploading ? 'bg-indigo-500 text-white animate-pulse' : 'bg-indigo-500 dark:bg-indigo-400 text-white dark:text-slate-950 group-hover:scale-110 group-hover:rotate-6 shadow-indigo-500/20'
          }`}>
            <span className="material-symbols-outlined text-[32px] font-bold">
              {isAnyUploading ? 'sync' : 'cloud_upload'}
             </span>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isAnyUploading ? "ĐANG TẢI LÊN HÀNG ĐỢI..." : UPLOAD_AREA_TEXTS.title}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.25em] opacity-80 leading-relaxed">
              Kéo thả nhiều file PDF/DOCX hoặc nhấn để chọn
            </p>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.docx"
          multiple
        />
      </div>

      {/* Upload Queue List */}
      {queue.length > 0 && (
        <div className="space-y-3 mt-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar shrink-0">
          {queue.map((item) => (
            <div key={item.id} className="group/item bg-slate-50 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-4 animate-in slide-in-from-right-4 duration-300 relative transition-colors duration-500">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                item.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                item.status === 'error' ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
                'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
              }`}>
                <span className="material-symbols-outlined">
                  {item.status === 'success' ? 'check_circle' : 
                   item.status === 'error' ? 'error' : 
                   item.status === 'uploading' ? 'sync' : 'hourglass_empty'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate pr-4">{item.file.name}</p>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase shrink-0 pt-0.5">
                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <div className="w-full h-1 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                   <div className={`h-full transition-all duration-500 ${
                     item.status === 'success' ? 'bg-emerald-500' :
                     item.status === 'error' ? 'bg-red-500' :
                     'bg-indigo-500 animate-pulse'
                   }`} style={{ width: item.status === 'success' ? '100%' : item.status === 'uploading' ? '70%' : '5%' }}></div>
                </div>
              </div>

              <button 
                onClick={() => removeFromQueue(item.id)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/20 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 transition-all opacity-0 group-hover/item:opacity-100 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 shrink-0">
          <span className="material-symbols-outlined text-red-500 dark:text-red-400">error</span>
          <p className="text-xs text-red-600 dark:text-red-300 font-bold">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
