"use client";

import { useState } from 'react';
import { UploadedDocument, DocumentStatus } from '@/models/Document';
import { DOCUMENT_TABLE_TEXTS } from '@/constants/texts';
import { APP_COLORS } from '@/constants/colors';

const INITIAL_DOCUMENTS: UploadedDocument[] = [
  new UploadedDocument("1", "user1", "Neural_Networks_Intro.pdf", 2.4, DocumentStatus.READY, new Date("Oct 24, 2023")),
  new UploadedDocument("2", "user1", "Backpropagation_Calculus.docx", 12.8, DocumentStatus.PROCESSING, new Date("Oct 25, 2023")),
  new UploadedDocument("3", "user1", "Ethics_in_AI_Research.pdf", 1.1, DocumentStatus.READY, new Date("Oct 26, 2023"))
];

export default function DocumentTable() {
  const [documents, setDocuments] = useState<UploadedDocument[]>(INITIAL_DOCUMENTS);

  const handleGenerateQuiz = (documentId: string) => {
  };

  const getStatusBadge = (status: DocumentStatus) => {
    let displayStatus = "";
    if (status === DocumentStatus.READY) {
      displayStatus = DOCUMENT_TABLE_TEXTS.status.processed;
      return (
        <span 
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
          style={{ backgroundColor: APP_COLORS.successBg, color: APP_COLORS.success }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: APP_COLORS.success }}></span>
          {displayStatus}
        </span>
      );
    }
    if (status === DocumentStatus.PROCESSING || status === DocumentStatus.UPLOADING) {
      displayStatus = DOCUMENT_TABLE_TEXTS.status.extracting;
      return (
        <span 
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
          style={{ backgroundColor: APP_COLORS.warningBg, color: APP_COLORS.warning }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: APP_COLORS.warning }}></span>
          {displayStatus}
        </span>
      );
    }
    return <span className="text-sm whitespace-nowrap">{status}</span>;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
       return (
         <div 
           className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
           style={{ backgroundColor: APP_COLORS.pdfBg, color: APP_COLORS.pdfIcon }}
         >
           <span className="material-symbols-outlined text-[24px] sm:text-[28px]">picture_as_pdf</span>
         </div>
       );
    }
    return (
      <div 
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: APP_COLORS.docBg, color: APP_COLORS.docIcon }}
      >
        <span className="material-symbols-outlined text-[24px] sm:text-[28px]">description</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-[24px] overflow-hidden mt-6 sm:mt-8 shadow-sm border border-outline/20">
      <div className="px-5 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline/30 gap-4">
        <h2 className="text-[20px] sm:text-[22px] font-bold text-on-surface tracking-tight">{DOCUMENT_TABLE_TEXTS.title}</h2>
        <div className="flex gap-3 sm:gap-4">
          <button className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 bg-white border border-outline/70 rounded-xl hover:bg-surface transition-colors font-semibold text-[13px] text-on-surface text-center">
            {DOCUMENT_TABLE_TEXTS.btnFilter}
          </button>
          <button className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 bg-white border border-outline/70 rounded-xl hover:bg-surface transition-colors font-semibold text-[13px] text-on-surface text-center">
            {DOCUMENT_TABLE_TEXTS.btnSort}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-outline/30">
              <th className="py-4 px-5 sm:px-8 text-[11px] font-bold tracking-widest uppercase text-on-surface-variant w-[40%]">{DOCUMENT_TABLE_TEXTS.colName}</th>
              <th className="py-4 px-4 text-[11px] font-bold tracking-widest uppercase text-on-surface-variant">{DOCUMENT_TABLE_TEXTS.colDate}</th>
              <th className="py-4 px-4 text-[11px] font-bold tracking-widest uppercase text-on-surface-variant">{DOCUMENT_TABLE_TEXTS.colStatus}</th>
              <th className="py-4 px-5 sm:px-8 text-[11px] font-bold tracking-widest uppercase text-on-surface-variant text-right">{DOCUMENT_TABLE_TEXTS.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline/30">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-[#fcfcff] transition-colors group">
                <td className="py-4 sm:py-5 px-5 sm:px-8">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {getFileIcon(doc.fileName)}
                    <div className="min-w-0">
                      <p className="font-bold text-[14px] sm:text-[15px] text-on-surface mb-0.5 truncate">{doc.fileName}</p>
                      <p className="text-[12px] sm:text-[13px] text-on-surface-variant">{doc.fileSizeMB} MB</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 sm:py-5 px-4 whitespace-nowrap">
                  <p className="text-[13px] sm:text-[14.5px] font-medium text-on-surface-variant">{doc.uploadedAt.toLocaleDateString('vi-VN')}</p>
                </td>
                <td className="py-4 sm:py-5 px-4">
                  {getStatusBadge(doc.status)}
                </td>
                <td className="py-4 sm:py-5 px-5 sm:px-8 text-right">
                  <div className="flex items-center justify-end gap-3 sm:gap-5 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      className="text-[13px] sm:text-[14px] text-on-surface-variant hover:text-primary font-medium p-2 lg:p-0" 
                      onClick={() => handleGenerateQuiz(doc.id)}
                    >
                      {DOCUMENT_TABLE_TEXTS.btnFilter}
                    </button>
                    <button className="text-[13px] sm:text-[14px] text-on-surface-variant hover:text-primary font-medium p-2 lg:p-0">
                      {DOCUMENT_TABLE_TEXTS.btnSort}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between border-t border-outline/30 gap-4">
        <p className="text-[13px] text-on-surface-variant font-medium">{DOCUMENT_TABLE_TEXTS.paginationInfo}</p>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline/50 bg-white hover:bg-surface transition-colors cursor-pointer text-on-surface-variant">
             <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-[13px] shadow-sm">1</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline/50 bg-white hover:bg-surface transition-colors text-on-surface font-bold text-[13px]">2</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline/50 bg-white hover:bg-surface transition-colors cursor-pointer text-on-surface-variant">
             <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
