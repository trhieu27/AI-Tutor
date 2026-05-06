import { authService } from './auth.service';

const API_BASE = "/api/v1";

// Upload gửi thẳng đến backend, bỏ qua Next.js proxy (tránh giới hạn 10MB)
const UPLOAD_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081/api/v1";

/** Custom error class for quota exceeded (HTTP 429) */
export class QuotaError extends Error {
  status = 429;
  constructor(message: string) {
    super(message);
    this.name = 'QuotaError';
  }
}

// Helper để lấy token
const getAuthHeaders = (): HeadersInit => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) return { 'Authorization': `Bearer ${token}` };
  }
  return {};
};

// Wrapper cho fetch hỗ trợ tự động refresh token
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...options.headers,
    ...getAuthHeaders(),
  };

  let response = await fetch(url, { ...options, headers });

  // Nếu gặp lỗi 401 và đang ở phía client, thử refresh token
  if (response.status === 401 && typeof window !== 'undefined') {
    console.log("Access token expired, attempting to refresh...");
    const newToken = await authService.refreshToken();

    if (newToken) {
      // Retry với token mới
      const newHeaders = {
        ...options.headers,
        'Authorization': `Bearer ${newToken}`,
      };
      response = await fetch(url, { ...options, headers: newHeaders });
    } else {
      // Nếu refresh thất bại, xóa session và redirect về login
      console.error("Refresh token failed or expired");
      authService.logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  return response;
}

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

// Helper để làm sạch tên file (tránh lỗi ký tự đặc biệt trong header)
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[’'"]/g, "'") // Thay các loại dấu nháy
    .replace(/[^\x00-\x7F]/g, "_") // Thay ký tự non-ASCII bằng dấu gạch dưới
    .replace(/\s+/g, "_"); // Thay khoảng trắng bằng dấu gạch dưới
};

export async function uploadDocument(file: File): Promise<DocumentResponse> {
  const sanitizedName = sanitizeFileName(file.name);
  console.log(`Uploading file: ${file.name} (Sanitized as: ${sanitizedName})`);

  const formData = new FormData();
  formData.append("file", file, sanitizedName);

  // AbortController timeout 60s — tránh treo mãi
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await authFetch(`${UPLOAD_BASE}/documents/upload`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error("Upload timeout — file quá lớn hoặc kết nối chậm");
    throw new Error("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    // Đọc body CHỄ MỘT LẦN bằng text(), sau đó thử parse JSON — tránh “body stream already read”
    let errorDetail = `Upload thất bại (HTTP ${res.status})`;
    try {
      const rawText = await res.text();
      if (rawText) {
        try {
          const errorData = JSON.parse(rawText);
          errorDetail = errorData.detail || errorData.message || errorDetail;
        } catch {
          if (rawText.length < 300) errorDetail = rawText;
        }
        console.error("Upload Error:", rawText);
      }
    } catch {
      console.error("Upload Error: could not read response body");
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export async function fetchDocuments(): Promise<DocumentResponse[]> {
  const res = await authFetch(`${API_BASE}/documents`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error("Không thể tải danh sách tài liệu");
  return res.json();
}

export async function fetchDocument(documentId: string): Promise<DocumentResponse> {
  const res = await authFetch(`${API_BASE}/documents/${documentId}`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error("Không tìm thấy tài liệu");
  return res.json();
}

export async function deleteDocument(documentId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/documents/${documentId}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error("Xóa tài liệu thất bại");
}

export async function retryDocument(documentId: string): Promise<DocumentResponse> {
  const res = await authFetch(`${API_BASE}/documents/${documentId}/retry`, {
    method: "POST",
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error("Yêu cầu xử lý lại thất bại");
  return res.json();
}

// ─── Chat API ─────────────────────────────────────────────────────────────────

export async function askQuestion(
  documentId: string,
  request: AskRequest,
  signal?: AbortSignal
): Promise<AskResponse> {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify(request),
    signal
  });

  if (!res.ok) {
    if (res.status === 429) {
      const err = await res.json().catch(() => ({}));
      throw new QuotaError(err.detail || 'Quota exceeded');
    }
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
  const res = await authFetch(`${API_BASE}/chat/${documentId}/sessions`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error("Không thể tải lịch sử chat");
  return res.json();
}

export async function fetchSessionDetail(sessionId: string): Promise<ChatSessionDetail> {
  const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}`, {
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
  const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error("Xóa phiên chat thất bại");
}

export async function fetchDocumentSummaryStream(
  documentId: string, 
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/summarize`, {
    headers: { ...getAuthHeaders() },
    signal
  });

  if (!res.ok) {
    if (res.status === 429) {
      const err = await res.json().catch(() => ({}));
      throw new QuotaError(err.detail || 'Quota exceeded');
    }
    throw new Error("Không thể tạo bản tóm tắt");
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  }
}

export async function fetchDocumentSummary(documentId: string, signal?: AbortSignal): Promise<string> {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/summarize`, {
    headers: { ...getAuthHeaders() },
    signal
  });
  if (!res.ok) throw new Error("Không thể tải bản tóm tắt");
  return res.text();
}

export async function fetchDocumentQuizStream(
  documentId: string,
  onChunk: (chunk: string) => void,
  force = false,
  signal?: AbortSignal
): Promise<void> {
  const url = `${API_BASE}/chat/${documentId}/quiz${force ? "?force=true" : ""}`;
  const res = await authFetch(url, {
    headers: { ...getAuthHeaders() },
    signal
  });
  if (!res.ok) {
    if (res.status === 429) {
      const err = await res.json().catch(() => ({}));
      throw new QuotaError(err.detail || 'Quota exceeded');
    }
    throw new Error("Không thể tạo bài kiểm tra");
  }
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  }
}

export async function fetchDocumentQuiz(documentId: string, signal?: AbortSignal): Promise<any[]> {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/quiz`, {
    headers: { ...getAuthHeaders() },
    signal
  });
  if (!res.ok) throw new Error("Không thể tải bài kiểm tra");
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return [];
  }
}

export async function fetchDocumentMindmapStream(
  documentId: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  force: boolean = false
): Promise<void> {
  const url = `${API_BASE}/chat/${documentId}/mindmap${force ? '?force=true' : ''}`;
  console.log(`[API] Fetching Mindmap: ${url} (Force: ${force})`);
  
  const res = await authFetch(url, {
    headers: { ...getAuthHeaders() },
    signal
  });
  if (!res.ok) {
    if (res.status === 429) {
      const err = await res.json().catch(() => ({}));
      throw new QuotaError(err.detail || 'Quota exceeded');
    }
    throw new Error("Không thể tạo sơ đồ tư duy");
  }
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  }
}

export async function fetchDocumentMindmap(documentId: string, signal?: AbortSignal, force: boolean = false): Promise<string> {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/mindmap${force ? '?force=true' : ''}`, {
    headers: { ...getAuthHeaders() },
    signal
  });
  if (!res.ok) throw new Error("Không thể tải sơ đồ tư duy");
  return res.text();
}

export async function updateDocumentMindmap(documentId: string, mindmapCode: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/mindmap`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({ mindmap_code: mindmapCode })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Không thể cập nhật sơ đồ tư duy");
  }
}

export async function fetchDocumentStudyQuestionsStream(
  documentId: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/study-questions`, {
    headers: { ...getAuthHeaders() },
    signal
  });
  if (!res.ok) {
    if (res.status === 429) {
      const err = await res.json().catch(() => ({}));
      throw new QuotaError(err.detail || 'Quota exceeded');
    }
    throw new Error("Không thể tạo câu hỏi ôn tập");
  }
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  }
}

export async function fetchDocumentStudyQuestions(documentId: string, signal?: AbortSignal): Promise<string[]> {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/study-questions`, {
    headers: { ...getAuthHeaders() },
    signal
  });
  if (!res.ok) throw new Error("Không thể tải câu hỏi ôn tập");
  const text = await res.text();
  return text.split('\n')
    .map(l => l.replace(/^\d+\.\s*/, "").trim())
    .filter(l => l.length > 5);
}

// ─── Quota API ─────────────────────────────────────────────────────────────────

export interface QuotaUsage {
  documents: number;
  chat_messages: number;
  ai_features: number;
}

export interface QuotaResponse {
  is_pro: boolean;
  limits: Record<string, number> | null;
  usage: QuotaUsage | null;
}

export async function fetchQuota(): Promise<QuotaResponse> {
  const res = await authFetch(`${API_BASE}/quota/me`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Không thể tải thông tin quota");
  return res.json();
}
