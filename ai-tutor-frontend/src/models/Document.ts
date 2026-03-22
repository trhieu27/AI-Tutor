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
    public id: string,
    public ownerId: string,
    public fileName: string,
    public fileSizeMB: number,
    public status: DocumentStatus,
    public uploadedAt: Date = new Date(),
    public pageCount: number = 0,
    public url?: string // Cdn or Storage URL
  ) { }

  getFileType(): FileType {
    const ext = this.fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return FileType.PDF;
      case 'doc': return FileType.DOC;
      case 'docx': return FileType.DOCX;
      default: return FileType.UNKNOWN;
    }
  }

  isReadyForRAG(): boolean {
    return this.status === DocumentStatus.READY;
  }
}
