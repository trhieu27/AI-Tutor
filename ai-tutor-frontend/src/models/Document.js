export let DocumentStatus = /*#__PURE__*/function (DocumentStatus) {
  DocumentStatus["UPLOADING"] = "UPLOADING";
  DocumentStatus["PROCESSING"] = "PROCESSING";
  // Extracting text & generating embeddings
  DocumentStatus["READY"] = "READY";
  // RAG is ready
  DocumentStatus["FAILED"] = "FAILED";
  return DocumentStatus;
}({});
export let FileType = /*#__PURE__*/function (FileType) {
  FileType["PDF"] = "pdf";
  FileType["DOC"] = "doc";
  FileType["DOCX"] = "docx";
  FileType["UNKNOWN"] = "unknown";
  return FileType;
}({});
export class UploadedDocument {
  constructor(id, ownerId, fileName, fileSizeMB, status, uploadedAt = new Date(), pageCount = 0, url // Cdn or Storage URL
  ) {
    this.id = id;
    this.ownerId = ownerId;
    this.fileName = fileName;
    this.fileSizeMB = fileSizeMB;
    this.status = status;
    this.uploadedAt = uploadedAt;
    this.pageCount = pageCount;
    this.url = url;
  }
  getFileType() {
    const ext = this.fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return FileType.PDF;
      case 'doc':
        return FileType.DOC;
      case 'docx':
        return FileType.DOCX;
      default:
        return FileType.UNKNOWN;
    }
  }
  isReadyForRAG() {
    return this.status === DocumentStatus.READY;
  }
}