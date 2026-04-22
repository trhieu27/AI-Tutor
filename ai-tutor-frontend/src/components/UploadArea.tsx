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
      if (!allowedTypes.includes(files[i].type)) { hasInvalid = true; break; }
    }
    if (hasInvalid) setError("Chỉ chấp nhận định dạng PDF hoặc DOCX.");
    await addToQueue(files);
    if (onUploadSuccess) onUploadSuccess();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3 flex-1 flex flex-col">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
        onClick={() => !isAnyUploading && fileInputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-8 transition-all duration-300 flex-1 flex flex-col items-center justify-center text-center overflow-hidden min-h-[200px] ${
          isDragging
            ? 'border-[hsl(239_68%_58%)] bg-[hsl(239_68%_58%/0.06)] scale-[0.99]'
            : 'border-[var(--border-color)] bg-[var(--surface)] hover:border-[hsl(239_68%_58%/0.50)] hover:bg-[hsl(239_68%_58%/0.04)]'
        } ${isAnyUploading ? 'cursor-wait opacity-70' : ''}`}
      >
        {/* Drag glow */}
        {isDragging && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[hsl(239_68%_58%/0.15)] blur-[60px] rounded-full" />
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center gap-4">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-[0_4px_16px_hsl(239_68%_58%/0.25)] ${
            isAnyUploading
              ? 'bg-[hsl(239_68%_58%)] text-white animate-pulse'
              : 'bg-[hsl(239_68%_58%)] text-white group-hover:scale-110 group-hover:rotate-6'
          }`}>
            <span className="material-symbols-outlined icon-thin text-[28px]">
              {isAnyUploading ? 'sync' : 'cloud_upload'}
            </span>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
              {isAnyUploading ? 'Đang tải lên hàng đợi…' : UPLOAD_AREA_TEXTS.title}
            </h3>
            <p className="text-[11px] text-[var(--muted)] font-medium uppercase tracking-[0.18em]">
              Kéo thả PDF/DOCX hoặc nhấn để chọn
            </p>
          </div>

          {/* Format chips */}
          <div className="flex gap-2">
            {['PDF', 'DOCX'].map(f => (
              <span key={f} className="px-2.5 py-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-full text-[10px] font-bold text-[var(--muted)] tracking-wide">
                {f}
              </span>
            ))}
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

      {/* Queue */}
      {queue.length > 0 && (
        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar shrink-0">
          {queue.map((item) => (
            <div
              key={item.id}
              className="group/item bg-[var(--card-bg)] p-3.5 rounded-xl border border-[var(--border-color)] flex items-center gap-3 transition-colors duration-200"
            >
              {/* Status icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                item.status === 'success' ? 'bg-[hsl(158_64%_44%/0.10)] text-[hsl(158_64%_44%)]' :
                item.status === 'error'   ? 'bg-[hsl(343_85%_58%/0.10)] text-[hsl(343_85%_58%)]' :
                'bg-[hsl(239_68%_58%/0.10)] text-[hsl(239_68%_58%)]'
              }`}>
                <span className={`material-symbols-outlined icon-thin text-[18px] ${item.status === 'uploading' ? 'animate-spin' : ''}`}>
                  {item.status === 'success' ? 'check_circle' :
                   item.status === 'error'   ? 'error' :
                   item.status === 'uploading' ? 'sync' : 'hourglass_empty'}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-[12px] font-semibold text-[var(--foreground)] truncate pr-3">{item.file.name}</p>
                  <p className="text-[10px] font-medium text-[var(--muted-light)] shrink-0">{(item.file.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
                <div className="w-full h-0.5 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.status === 'success' ? 'bg-[hsl(158_64%_44%)]' :
                      item.status === 'error'   ? 'bg-[hsl(343_85%_58%)]' :
                      'bg-[hsl(239_68%_58%)]'
                    }`}
                    style={{ width: item.status === 'success' ? '100%' : item.status === 'uploading' ? '65%' : '5%' }}
                  />
                </div>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeFromQueue(item.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--muted-light)] hover:text-[hsl(343_85%_58%)] hover:bg-[hsl(343_85%_58%/0.08)] transition-all opacity-0 group-hover/item:opacity-100 shrink-0"
              >
                <span className="material-symbols-outlined icon-thin text-[16px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-3.5 bg-[hsl(343_85%_58%/0.08)] border border-[hsl(343_85%_58%/0.20)] rounded-xl shrink-0">
          <span className="material-symbols-outlined icon-thin text-[hsl(343_85%_58%)] text-[18px] shrink-0">error</span>
          <p className="text-[12px] text-[hsl(343_85%_58%)] font-medium flex-1">{error}</p>
          <button onClick={() => setError("")} className="text-[var(--muted-light)] hover:text-[var(--foreground)] transition-colors">
            <span className="material-symbols-outlined icon-thin text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
