"use client";

import { useState, useRef } from "react";
import { UPLOAD_AREA_TEXTS } from "@/constants/texts";
import { uploadDocument, DocumentResponse } from "@/services/api.service";

interface UploadAreaProps {
  onUploadSuccess?: (doc: DocumentResponse) => void;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export default function UploadArea({ onUploadSuccess }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadDocument = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate type
    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const validExts = [".pdf", ".doc", ".docx"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!validExts.includes(ext)) {
      setUploadState("error");
      setErrorMessage("Chỉ chấp nhận file PDF, DOC, DOCX.");
      return;
    }

    // Validate size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadState("error");
      setErrorMessage("File quá lớn. Tối đa 50MB.");
      return;
    }

    setUploadedFileName(file.name);
    setUploadState("uploading");
    setUploadProgress(0);
    setErrorMessage("");

    // Simulate progress while uploading
    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 10, 85));
    }, 200);

    try {
      const doc = await uploadDocument(file);
      clearInterval(interval);
      setUploadProgress(100);
      setUploadState("success");
      onUploadSuccess?.(doc);

      // Reset after 3 seconds
      setTimeout(() => {
        setUploadState("idle");
        setUploadProgress(0);
        setUploadedFileName("");
      }, 3000);
    } catch (err) {
      clearInterval(interval);
      setUploadState("error");
      setErrorMessage(err instanceof Error ? err.message : "Upload thất bại. Vui lòng thử lại.");
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUploadDocument(e.dataTransfer.files);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUploadDocument(e.target.files);
    e.target.value = "";
  };

  const getBorderColor = () => {
    if (uploadState === "error") return "border-red-400 bg-red-50";
    if (uploadState === "success") return "border-green-400 bg-green-50";
    if (isDragging) return "border-primary bg-primary-container/20";
    return "border-[#d0d0fc] bg-white hover:border-primary/50";
  };

  return (
    <div
      className={`border-2 border-dashed rounded-[32px] p-6 sm:p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${getBorderColor()}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => uploadState === "idle" && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={onFileInputChange}
      />

      {/* Icon */}
      <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center mb-6 shadow-sm transition-colors ${
        uploadState === "success" ? "bg-green-100 text-green-600" :
        uploadState === "error" ? "bg-red-100 text-red-500" :
        "bg-primary-container text-primary"
      }`}>
        {uploadState === "uploading" ? (
          <svg className="w-10 h-10 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <span className="material-symbols-outlined text-[40px]">
            {uploadState === "success" ? "check_circle" : uploadState === "error" ? "error" : "cloud_upload"}
          </span>
        )}
      </div>

      {/* Text */}
      {uploadState === "idle" && (
        <>
          <h3 className="text-[22px] font-bold text-on-surface mb-3 text-center">{UPLOAD_AREA_TEXTS.title}</h3>
          <p className="text-on-surface-variant text-[15px] mb-8 max-w-md text-center leading-relaxed">
            {UPLOAD_AREA_TEXTS.descriptionPrefix}{" "}
            <span className="text-primary font-bold hover:underline">{UPLOAD_AREA_TEXTS.selectFileLink}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="px-4 py-2 rounded-lg bg-surface text-on-surface-variant text-xs font-bold tracking-widest uppercase">{UPLOAD_AREA_TEXTS.maxSizeDesc}</span>
            <span className="px-4 py-2 rounded-lg bg-surface text-on-surface-variant text-xs font-bold tracking-widest uppercase">{UPLOAD_AREA_TEXTS.acceptedTypes}</span>
          </div>
        </>
      )}

      {uploadState === "uploading" && (
        <div className="w-full max-w-xs flex flex-col items-center text-center">
          <p className="font-bold text-on-surface mb-1 truncate w-full max-w-[240px]" title={uploadedFileName}>
            {uploadedFileName}
          </p>
          <p className="text-sm text-on-surface-variant mb-4">Đang tải lên & xử lý...</p>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(59,40,204,0.3)]"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-primary mt-3 font-black tabular-nums tracking-wider">{uploadProgress}%</p>
        </div>
      )}

      {uploadState === "success" && (
        <div className="text-center flex flex-col items-center w-full max-w-xs px-4">
          <p className="font-bold text-green-700 text-lg mb-2">Tải lên thành công!</p>
          <div className="w-full flex justify-center">
            <p className="text-sm text-green-600 font-medium truncate w-full max-w-[240px]" title={uploadedFileName}>
              {uploadedFileName}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-3 bg-white/50 px-3 py-1.5 rounded-full border border-green-100">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
            <p className="text-[11px] font-bold text-green-800/70 uppercase tracking-wider">Đang xử lý RAG trong nền...</p>
          </div>
        </div>
      )}

      {uploadState === "error" && (
        <div className="text-center">
          <p className="font-bold text-red-600 text-lg mb-1">Tải lên thất bại</p>
          <p className="text-sm text-red-500 max-w-xs">{errorMessage}</p>
          <button
            className="mt-4 px-5 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-200 transition-colors"
            onClick={(e) => { e.stopPropagation(); setUploadState("idle"); }}
          >
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
