export enum DocumentStatus {
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING', // Extracting text & generating embeddings
  READY = 'READY',           // RAG is ready
  FAILED = 'FAILED'
}

export enum FileType {
  PDF = 'pdf',
  DOC = 'doc',
  DOCX = 'docx',
  UNKNOWN = 'unknown'
}

export class UploadedDocument {
  constructor(
    public id,
    public ownerId,
    public fileName,
    public fileSizeMB,
    public status: DocumentStatus,
    public uploadedAt = new Date(),
    public pageCount = 0,
    public url // Cdn or Storage URL
  ) { }

  getFileType() {
    const ext = this.fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return FileType.PDF;
      case 'doc': return FileType.DOC;
      case 'docx': return FileType.DOCX;
      default: return FileType.UNKNOWN;
    }
  }

  isReadyForRAG() {
    return this.status === DocumentStatus.READY;
  }
}
