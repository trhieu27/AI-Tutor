import { authService } from './auth.service';
import { Document } from '@/models/Document';
import { Quiz } from '@/models/Quiz';
import { ChatSession } from '@/models/Chat';
import { Notification, Quota } from '@/models/Notification';
const API_BASE = '/api/v1';
const UPLOAD_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8081/api/v1';

/** Custom error class for quota exceeded (HTTP 429) */
export class QuotaError extends Error {
  status = 429;
  constructor(message) {
    super(message);
    this.name = 'QuotaError';
  }
}
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  if (token) return {
    'Authorization': `Bearer ${token}`
  };
  return {};
};
export async function authFetch(url, options = {}) {
  const headers = {
    ...options.headers,
    ...getAuthHeaders()
  };
  let response = await fetch(url, {
    ...options,
    headers
  });
  if (response.status === 401) {
    const newToken = await authService.refreshToken();
    if (newToken) {
      const newHeaders = {
        ...options.headers,
        'Authorization': `Bearer ${newToken}`
      };
      response = await fetch(url, {
        ...options,
        headers: newHeaders
      });
    } else {
      authService.logout();
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
  }
  return response;
}
const sanitizeFileName = fileName => fileName.replace(/[''\"]/g, "'").replace(/[^\x00-\x7F]/g, '_').replace(/\s+/g, '_');
export async function uploadDocument(file) {
  const sanitizedName = sanitizeFileName(file.name);
  const formData = new FormData();
  formData.append('file', file, sanitizedName);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);
  let res;
  try {
    res = await authFetch(`${UPLOAD_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Upload timeout — file quá lớn hoặc kết nối chậm');
    throw new Error('Không thể kết nối tới máy chủ. Vui lòng thử lại.');
  }
  clearTimeout(timeoutId);
  if (!res.ok) {
    let errorDetail = `Upload thất bại (HTTP ${res.status})`;
    try {
      const rawText = await res.text();
      if (rawText) {
        try {
          errorDetail = JSON.parse(rawText).detail || errorDetail;
        } catch {
          if (rawText.length < 300) errorDetail = rawText;
        }
      }
    } catch { }
    throw new Error(errorDetail);
  }
  return res.json();
}
export async function fetchDocuments() {
  const res = await authFetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Không thể tải danh sách tài liệu');
  const data = await res.json();
  return data.map(d => Document.fromJSON(d));
}
export async function fetchDocument(documentId) {
  const res = await authFetch(`${API_BASE}/documents/${documentId}`);
  if (!res.ok) throw new Error('Không tìm thấy tài liệu');
  return Document.fromJSON(await res.json());
}
export async function deleteDocument(documentId) {
  const res = await authFetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Xóa tài liệu thất bại');
}
export async function retryDocument(documentId) {
  const res = await authFetch(`${API_BASE}/documents/${documentId}/retry`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Yêu cầu xử lý lại thất bại');
  return res.json();
}
export async function askQuestion(documentId, request, signal) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request),
    signal
  });
  if (!res.ok) {
    if (res.status === 429) {
      const err = await res.json().catch(() => ({}));
      throw new QuotaError(err.detail || 'Quota exceeded');
    }
    const error = await res.json().catch(() => ({
      detail: 'Hỏi thất bại'
    }));
    throw new Error(error.detail || 'Hỏi thất bại');
  }
  const data = await res.json();
  const msgContent = data.message.content;
  if (Array.isArray(msgContent)) data.message.content = msgContent.map(p => p.text || '').join(''); else if (typeof msgContent === 'object' && msgContent !== null) data.message.content = msgContent.text || JSON.stringify(msgContent);
  return data;
}
export async function fetchChatSessions(documentId) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/sessions`);
  if (!res.ok) throw new Error('Không thể tải lịch sử chat');
  const data = await res.json();
  return data.map(s => ChatSession.fromJSON(s));
}
export async function fetchSessionDetail(sessionId) {
  const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}`);
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`[${res.status}] ${e.detail || 'Không tìm thấy phiên chat'}`);
  }
  return res.json();
}
export async function deleteChatSession(sessionId) {
  const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Xóa phiên chat thất bại');
}
async function readStream(res, onChunk) {
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (reader) {
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      // Detect error marker written by backend mid-stream
      if (buffer.includes('__ERROR__:')) {
        const errMsg = buffer.split('__ERROR__:')[1]?.trim() || 'Đã xảy ra lỗi';
        if (errMsg.includes('quá tải') || errMsg.includes('quota') || errMsg.includes('429')) {
          throw new QuotaError(errMsg);
        }
        throw new Error(errMsg);
      }
      onChunk(chunk);
    }
  }
}
export async function fetchDocumentSummaryStream(documentId, onChunk, signal) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/summarize`, {
    signal
  });
  if (!res.ok) {
    if (res.status === 429) {
      const e = await res.json().catch(() => ({}));
      throw new QuotaError(e.detail || 'Quota exceeded');
    }
    throw new Error('Không thể tạo bản tóm tắt');
  }
  await readStream(res, onChunk);
}
export async function fetchDocumentSummary(documentId, signal) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/summarize`, {
    signal
  });
  if (!res.ok) throw new Error('Không thể tải bản tóm tắt');
  return res.text();
}
export async function fetchDocumentQuizStream(documentId, onChunk, force = false, signal) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/quiz${force ? '?force=true' : ''}`, {
    signal
  });
  if (!res.ok) {
    if (res.status === 429) {
      const e = await res.json().catch(() => ({}));
      throw new QuotaError(e.detail || 'Quota exceeded');
    }
    throw new Error('Không thể tạo bài kiểm tra');
  }
  await readStream(res, onChunk);
}
export async function fetchDocumentQuiz(documentId, signal) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/quiz`, { signal });
  if (!res.ok) throw new Error('Không thể tải bài kiểm tra');
  try {
    const arr = JSON.parse(await res.text());
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
export async function fetchDocumentMindmapStream(documentId, onChunk, signal, force = false) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/mindmap${force ? '?force=true' : ''}`, {
    signal
  });
  if (!res.ok) {
    if (res.status === 429) {
      const e = await res.json().catch(() => ({}));
      throw new QuotaError(e.detail || 'Quota exceeded');
    }
    throw new Error('Không thể tạo sơ đồ tư duy');
  }
  await readStream(res, onChunk);
}
export async function fetchDocumentMindmap(documentId, signal, force = false) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/mindmap${force ? '?force=true' : ''}`, {
    signal
  });
  if (!res.ok) throw new Error('Không thể tải sơ đồ tư duy');
  return res.text();
}
export async function updateDocumentMindmap(documentId, mindmapCode) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/mindmap`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mindmap_code: mindmapCode
    })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || 'Không thể cập nhật sơ đồ tư duy');
  }
}
export async function fetchDocumentStudyQuestionsStream(documentId, onChunk, signal) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/study-questions`, {
    signal
  });
  if (!res.ok) {
    if (res.status === 429) {
      const e = await res.json().catch(() => ({}));
      throw new QuotaError(e.detail || 'Quota exceeded');
    }
    throw new Error('Không thể tạo câu hỏi ôn tập');
  }
  await readStream(res, onChunk);
}
export async function fetchDocumentStudyQuestions(documentId, signal) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/study-questions`, {
    signal
  });
  if (!res.ok) throw new Error('Không thể tải câu hỏi ôn tập');
  return (await res.text()).split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(l => l.length > 5);
}
export async function fetchQuota() {
  const res = await authFetch(`${API_BASE}/quota/me`);
  if (!res.ok) throw new Error('Không thể tải thông tin quota');
  return Quota.fromJSON(await res.json());
}
export async function fetchNotifications(limit = 30) {
  const res = await authFetch(`${API_BASE}/notifications?limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.map(n => Notification.fromJSON(n));
}
export async function markNotificationRead(notifId) {
  await authFetch(`${API_BASE}/notifications/${notifId}/read`, {
    method: 'PATCH'
  });
}
export async function markAllNotificationsRead() {
  await authFetch(`${API_BASE}/notifications/read-all`, {
    method: 'PATCH'
  });
}
export async function clearAllNotifications() {
  await authFetch(`${API_BASE}/notifications`, {
    method: 'DELETE'
  });
}