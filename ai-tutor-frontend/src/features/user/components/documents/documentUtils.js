import { DOCUMENT_COPY } from "@/shared/constants/texts";

export function getDocumentName(doc) {
  return doc?.file_name || doc?.fileName || DOCUMENT_COPY.fallbackName;
}

export function getDocumentExt(doc) {
  const name = getDocumentName(doc);
  return name.split(".").pop()?.toUpperCase() || DOCUMENT_COPY.fallbackExtension;
}

export function getDocumentDate(doc) {
  const value = doc?.uploaded_at || doc?.uploadedAt;
  if (!value) return DOCUMENT_COPY.fallbackDate;
  return new Date(value).toLocaleDateString("vi-VN");
}

export function getDocumentSize(doc) {
  const size = doc?.file_size_mb ?? doc?.fileSizeMb;
  return Number.isFinite(Number(size)) ? `${Number(size).toFixed(1)} MB` : DOCUMENT_COPY.fallbackSize;
}

export function getDocumentPages(doc) {
  const count = Number(doc?.page_count ?? doc?.pageCount ?? 0);
  return count > 0 ? DOCUMENT_COPY.pages(count) : DOCUMENT_COPY.pagesUpdating;
}

export function getDocumentIcon(doc) {
  const ext = getDocumentExt(doc).toLowerCase();
  if (ext === "pdf") return "picture_as_pdf";
  if (ext === "doc" || ext === "docx") return "description";
  return "article";
}

export function normalizeDocumentStatus(status) {
  if (status === "READY") return "ready";
  if (status === "FAILED") return "failed";
  if (status === "PROCESSING") return "processing";
  if (status === "UPLOADING") return "uploading";
  return "default";
}
