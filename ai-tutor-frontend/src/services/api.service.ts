// API base URL - sử dụng đường dẫn tương đối để đi qua Next.js Rewrite Proxy
const API_BASE = "/api/v1";
console.log("📍 API_BASE:", API_BASE);

export interface DocumentResponse {
  id: string;
  owner_id: string;
  file_name: string;
  file_size_mb: number;
  page_count: number;
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  uploaded_at: string;
  updated_at: string;
}

export interface ChatSource {
  document_id: string;
  page_number: number;
  text_excerpt: string;
}

export interface MessageResponse {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  created_at: string;
}

export interface ChatSessionResponse {
  id: string;
  user_id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatSessionDetail extends ChatSessionResponse {
  messages: MessageResponse[];
}

export interface AskRequest {
  question: string;
  session_id?: string;
}

export interface AskResponse {
  session_id: string;
  message: MessageResponse;
}

// ─── Document API ─────────────────────────────────────────────────────────────

export async function uploadDocument(file: File): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Upload thất bại" }));
    throw new Error(error.detail || "Upload thất bại");
  }

  return res.json();
}

export async function fetchDocuments(): Promise<DocumentResponse[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error("Không thể tải danh sách tài liệu");
  return res.json();
}

export async function fetchDocument(documentId: string): Promise<DocumentResponse> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`);
  if (!res.ok) throw new Error("Không tìm thấy tài liệu");
  return res.json();
}

export async function deleteDocument(documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Xóa tài liệu thất bại");
}

// ─── Chat API ─────────────────────────────────────────────────────────────────

export async function askQuestion(
  documentId: string,
  request: AskRequest,
  signal?: AbortSignal
): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/chat/${documentId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Hỏi thất bại" }));
    throw new Error(error.detail || "Hỏi thất bại");
  }

  return res.json();
}

export async function fetchChatSessions(documentId: string): Promise<ChatSessionResponse[]> {
  const res = await fetch(`${API_BASE}/chat/${documentId}/sessions`);
  if (!res.ok) throw new Error("Không thể tải lịch sử chat");
  return res.json();
}

export async function fetchSessionDetail(sessionId: string): Promise<ChatSessionDetail> {
  const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.detail || "Không tìm thấy phiên chat";
    throw new Error(`[${res.status}] ${message}`);
  }
  return res.json();
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Xóa phiên chat thất bại");
}

export async function fetchDocumentSummary(documentId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/chat/${documentId}/summarize`);
  if (!res.ok) throw new Error("Không thể tạo bản tóm tắt");
  const data = await res.json();
  return data.summary;
}

export async function fetchDocumentQuiz(documentId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/chat/${documentId}/quiz`);
  if (!res.ok) throw new Error("Không thể tạo bài kiểm tra");
  const data = await res.json();
  return data.quiz;
}

export async function fetchDocumentMindmap(documentId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/chat/${documentId}/mindmap`);
  if (!res.ok) throw new Error("Không thể tạo sơ đồ tư duy");
  const data = await res.json();
  return data.mindmap;
}

export async function fetchDocumentStudyQuestions(documentId: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/chat/${documentId}/study-questions`);
  if (!res.ok) throw new Error("Không thể tạo câu hỏi ôn tập");
  const data = await res.json();
  return data.questions;
}
