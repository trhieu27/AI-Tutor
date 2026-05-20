/**
 * Document model — maps API response fields to a clean class.
 * API shape: { id, file_name, file_size_mb, page_count, status, uploaded_at }
 *
 * Provides both camelCase properties AND snake_case aliases
 * so existing component code continues to work without changes.
 */
export class Document {
  constructor({ id, file_name, file_size_mb, page_count, status, uploaded_at }) {
    this.id          = id;
    this.fileName    = file_name;
    this.fileSizeMb  = file_size_mb;
    this.pageCount   = page_count ?? 0;
    this.status      = status;           // 'READY' | 'PROCESSING' | 'UPLOADING' | 'FAILED'
    this.uploadedAt  = uploaded_at ? new Date(uploaded_at) : new Date();

    // ── snake_case aliases for backward-compat with existing JSX ──
    this.file_name    = file_name;
    this.file_size_mb = file_size_mb;
    this.page_count   = page_count ?? 0;
    this.uploaded_at  = uploaded_at;
  }

  /** Factory from raw API JSON */
  static fromJSON(json) {
    return new Document(json);
  }

  /** Status sugar */
  get isReady()      { return this.status === 'READY'; }
  get isProcessing() { return this.status === 'PROCESSING' || this.status === 'UPLOADING'; }
  get isFailed()     { return this.status === 'FAILED'; }

  get extension() {
    return this.fileName.split('.').pop()?.toUpperCase() ?? '';
  }

  get uploadedDateVN() {
    return this.uploadedAt.toLocaleDateString('vi-VN');
  }

  /** Re-serialize for API calls */
  toJSON() {
    return {
      id:           this.id,
      file_name:    this.fileName,
      file_size_mb: this.fileSizeMb,
      page_count:   this.pageCount,
      status:       this.status,
      uploaded_at:  this.uploadedAt.toISOString(),
    };
  }
}
