// API base URL - sử dụng đường dẫn tương đối để đi qua Next.js Rewrite Proxy
const API_BASE = "/api/v1";

// Helper để lấy token
const getAuthHeaders = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
  return {};
};

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
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Upload thất bại" }));
    throw new Error(error.detail || "Upload thất bại");
  }

  return res.json();
}

export async function fetchDocuments(): Promise<DocumentResponse[]> {
  const res = await fetch(`${API_BASE}/documents`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error("Không thể tải danh sách tài liệu");
  return res.json();
}

export async function fetchDocument(documentId: string): Promise<DocumentResponse> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error("Không tìm thấy tài liệu");
  return res.json();
}

export async function deleteDocument(documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() }
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
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify(request),
    signal
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Hỏi thất bại" }));
    throw new Error(error.detail || "Hỏi thất bại");
  }

  const data = await res.json();
  const msgContent = data.message.content;
  
  if (Array.isArray(msgContent)) {
    data.message.content = msgContent.map(part => part.text || "").join("");
  } else if (typeof msgContent === 'object' && msgContent !== null) {
    data.message.content = msgContent.text || JSON.stringify(msgContent);
  }

  return data;
}

export async function fetchChatSessions(documentId: string): Promise<ChatSessionResponse[]> {
  const res = await fetch(`${API_BASE}/chat/${documentId}/sessions`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error("Không thể tải lịch sử chat");
  return res.json();
}

export async function fetchSessionDetail(sessionId: string): Promise<ChatSessionDetail> {
  const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    headers: { ...getAuthHeaders() }
  });
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
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error("Xóa phiên chat thất bại");
}

export async function fetchDocumentSummary(documentId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/chat/${documentId}/summarize`, {
    headers: { ...getAuthHeaders() }
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return "Hệ thống đang bận hoặc gặp lỗi xử lý. Vui lòng thử lại sau.";
  }
  const summaryRaw = data.summary;
  
  if (typeof summaryRaw === 'string') return summaryRaw;
  if (Array.isArray(summaryRaw)) {
    return summaryRaw.map(part => part.text || "").join("");
  }
  if (typeof summaryRaw === 'object' && summaryRaw !== null) {
      return summaryRaw.text || JSON.stringify(summaryRaw);
  }
  return data.detail || "Không thể tạo bản tóm tắt";
}

export async function fetchDocumentQuiz(documentId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/chat/${documentId}/quiz`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error("Không thể tạo bài kiểm tra");
  const data = await res.json();
  return data.quiz;
}

export async function fetchDocumentMindmap(documentId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/chat/${documentId}/mindmap`, {
    headers: { ...getAuthHeaders() }
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return "Không thể tạo sơ đồ tư duy ngay lúc này.";
  }
  const mmRaw = data.mindmap;
  
  if (typeof mmRaw === 'string') return mmRaw;
  if (Array.isArray(mmRaw)) {
    return mmRaw.map(part => part.text || "").join("");
  }
  if (typeof mmRaw === 'object' && mmRaw !== null) {
      return mmRaw.text || JSON.stringify(mmRaw);
  }
  return data.detail || "Không thể tạo sơ đồ tư duy";
}

export async function fetchDocumentStudyQuestions(documentId: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/chat/${documentId}/study-questions`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error("Không thể tạo câu hỏi ôn tập");
  const data = await res.json();
  return data.questions;
}
