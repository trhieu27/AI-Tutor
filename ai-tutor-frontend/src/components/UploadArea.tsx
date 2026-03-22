"use client";

import { useState } from 'react';
import { UPLOAD_AREA_TEXTS } from '@/constants/texts';

export default function UploadArea() {
  const [isDragging, setIsDragging] = useState(false);

  const handleUploadDocument = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
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

  return (
    <div 
      className={`border-2 border-dashed rounded-[32px] p-6 sm:p-12 flex flex-col items-center justify-center transition-colors
        ${isDragging ? 'border-primary bg-primary-container/20' : 'border-[#d0d0fc] bg-white hover:border-primary/50 cursor-pointer'}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="w-[72px] h-[72px] rounded-full bg-primary-container flex items-center justify-center text-primary mb-6 shadow-sm">
        <span className="material-symbols-outlined text-[40px]">cloud_upload</span>
      </div>
      
      <h3 className="text-[22px] font-bold text-on-surface mb-3 text-center">{UPLOAD_AREA_TEXTS.title}</h3>
      
      <p className="text-on-surface-variant text-[15px] mb-8 max-w-md text-center leading-relaxed">
        {UPLOAD_AREA_TEXTS.descriptionPrefix}{' '}
        <span className="text-primary font-bold hover:underline bg-transparent border-none p-0 cursor-pointer">{UPLOAD_AREA_TEXTS.selectFileLink}</span>
      </p>
      
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="px-4 py-2 rounded-lg bg-surface text-on-surface-variant text-xs font-bold tracking-widest uppercase">{UPLOAD_AREA_TEXTS.maxSizeDesc}</span>
        <span className="px-4 py-2 rounded-lg bg-surface text-on-surface-variant text-xs font-bold tracking-widest uppercase">{UPLOAD_AREA_TEXTS.acceptedTypes}</span>
      </div>
    </div>
  );
}
