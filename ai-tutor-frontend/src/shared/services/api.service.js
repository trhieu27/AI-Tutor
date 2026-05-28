import { authService } from './auth.service';
import { safeJson } from '@/shared/utils/httpUtils';
import { Document } from '@/shared/models/Document';
import { ChatSession } from '@/shared/models/Chat';
import { Notification, Quota } from '@/shared/models/Notification';
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
function buildQueryParams(params = {}) {
  const queryParts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return queryParts.length ? `?${queryParts.join('&')}` : '';
}

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
    } else if (authService.shouldLogoutAfterRefreshFailure()) {
      authService.logout();
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
  }
  // Account blocked/locked → force logout
  if (response.status === 403) {
    authService.logout();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login?reason=blocked';
    }
  }
  return response;
}
/** Normalise curly quotes, replace non-ASCII chars and whitespace with underscores */
const sanitizeFileName = fileName => fileName.replace(/[''\"]/g, "'").replace(/[^\x00-\x7F]/g, '_').replace(/\s+/g, '_');
export async function uploadDocument(file) {
  const sanitizedName = sanitizeFileName(file.name);
  const formData = new FormData();
  formData.append('file', file, sanitizedName);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);
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
  const data = await safeJson(res);
  if (!data) throw new Error('Không nhận được phản hồi từ máy chủ');
  return data;
}
export async function fetchDocuments(params = {}) {
  const wantsPaginated = params.withPagination || params.page || params.limit;
  const query = buildQueryParams({ ...params, withPagination: wantsPaginated ? true : undefined });
  const res = await authFetch(`${API_BASE}/documents${query}`);
  if (!res.ok) throw new Error('Không thể tải danh sách tài liệu');
  const data = await safeJson(res, wantsPaginated ? { items: [], pagination: {} } : []);

  if (wantsPaginated && data && data.items) {
    return {
      items: data.items.map(rawDocument => Document.fromJSON(rawDocument)),
      pagination: data.pagination
    };
  }

  const list = Array.isArray(data) ? data : (data?.items || []);
  return list.map(rawDocument => Document.fromJSON(rawDocument));
}
export async function fetchDocument(documentId) {
  const res = await authFetch(`${API_BASE}/documents/${documentId}`);
  if (!res.ok) throw new Error('Không tìm thấy tài liệu');
  const data = await safeJson(res);
  if (!data) throw new Error('Không nhận được dữ liệu tài liệu');
  return Document.fromJSON(data);
}
export async function fetchDocumentFileBlob(documentId) {
  const res = await authFetch(`${API_BASE}/documents/${documentId}/file`);
  if (!res.ok) throw new Error('Không thể mở file tài liệu');
  return res.blob();
}
export async function locateDocumentCitation(documentId, text) {
  const res = await authFetch(`${API_BASE}/documents/${documentId}/locate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('Không thể tìm trang trích dẫn');
  return safeJson(res, {});
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
  return safeJson(res, {});
}
export async function askQuestion(documentId, request, signal) {
  const headers = { 'Content-Type': 'application/json' };
  // Gửi header debug nếu bật chế độ nâng cao
  if (request.debug) headers['X-Debug'] = 'true';

  const res = await authFetch(`${API_BASE}/chat/${documentId}/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal
  });
  if (!res.ok) {
    if (res.status === 429) {
      const errorData = await safeJson(res, {});
      throw new QuotaError(errorData.detail || 'Quota exceeded');
    }
    const error = await safeJson(res, { detail: 'Hỏi thất bại' });
    throw new Error(error.detail || 'Hỏi thất bại');
  }
  const data = await safeJson(res);
  if (!data || !data.message) throw new Error('Không nhận được phản hồi từ máy chủ');
  const msgContent = data.message.content;
  if (Array.isArray(msgContent)) data.message.content = msgContent.map(p => p.text || '').join(''); else if (typeof msgContent === 'object' && msgContent !== null) data.message.content = msgContent.text || JSON.stringify(msgContent);
  return data;
}

/**
 * Stream chat answer via SSE.
 * @param {string} documentId
 * @param {object} request - { question, session_id }
 * @param {function} onChunk - called with each text chunk string
 * @param {AbortSignal} signal
 * @returns {Promise<object>} final data { session_id, message, sources, pipeline }
 */
export async function askQuestionStream(documentId, request, onChunk, signal, onStatus, onSession) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' };
  if (request.debug) headers['X-Debug'] = 'true';

  const res = await authFetch(`${API_BASE}/chat/${documentId}/ask-stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal
  });

  if (!res.ok) {
    if (res.status === 429) {
      const errorData = await safeJson(res, {});
      throw new QuotaError(errorData.detail || 'Quota exceeded');
    }
    const error = await safeJson(res, { detail: 'Hỏi thất bại' });
    throw new Error(error.detail || 'Hỏi thất bại');
  }

  const reader = res.body && res.body.getReader();
  if (!reader) throw new Error('Streaming not supported');

  const decoder = new TextDecoder();
  let buffer = '';
  let finalData = null;

  // ── Read SSE stream ──────────────────────────────────────────────────
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const dataStr = line.slice(6);
        if (currentEvent === 'session') {
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.session_id) onSession?.(parsed.session_id);
          } catch (e) { /* skip */ }
        } else if (currentEvent === 'status') {
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.step) onStatus?.(parsed.step);
          } catch (e) { /* skip */ }
        } else if (currentEvent === 'chunk') {
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) onChunk(parsed.text);
          } catch (e) { /* skip malformed */ }
        } else if (currentEvent === 'done') {
          try {
            finalData = JSON.parse(dataStr);
          } catch (e) { /* skip */ }
        } else if (currentEvent === 'error') {
          try {
            const errData = JSON.parse(dataStr);
            const msg = errData.detail || 'Lỗi streaming';
            if (msg.includes('quota') || msg.includes('429') || msg.includes('quá tải')) {
              throw new QuotaError(msg);
            }
            throw new Error(msg);
          } catch (e) {
            if (e instanceof QuotaError) throw e;
            throw e;
          }
        }
        currentEvent = '';
      }
    }
  }

  if (!finalData) throw new Error('Stream ended without completion');
  return finalData;
}
export async function fetchChatSessions(documentId, params = {}) {
  const wantsPaginated = params.withPagination || params.page || params.limit;
  const query = buildQueryParams({ ...params, withPagination: wantsPaginated ? true : undefined });
  const res = await authFetch(`${API_BASE}/chat/${documentId}/sessions${query}`);
  if (!res.ok) throw new Error('Không thể tải lịch sử chat');
  const data = await safeJson(res, wantsPaginated ? { items: [], pagination: {} } : []);

  if (wantsPaginated && data && data.items) {
    return {
      items: data.items.map(rawSession => ChatSession.fromJSON(rawSession)),
      pagination: data.pagination
    };
  }

  const list = Array.isArray(data) ? data : (data?.items || []);
  return list.map(rawSession => ChatSession.fromJSON(rawSession));
}
export async function fetchRecentChatSessions(params = {}) {
  const actualParams = typeof params === 'number' ? { limit: params } : params;
  const wantsPaginated = actualParams.withPagination || actualParams.page;
  const query = buildQueryParams({ ...actualParams, withPagination: wantsPaginated ? true : undefined });
  const res = await authFetch(`${API_BASE}/chat/sessions/recent${query}`);
  if (!res.ok) throw new Error('Không thể tải lịch sử chat gần đây');
  const data = await safeJson(res, wantsPaginated ? { items: [], pagination: {} } : []);

  if (wantsPaginated && data && data.items) {
    return {
      items: data.items.map(rawSession => ChatSession.fromJSON(rawSession)),
      pagination: data.pagination
    };
  }

  const list = Array.isArray(data) ? data : (data?.items || []);
  return list.map(rawSession => ChatSession.fromJSON(rawSession));
}
export async function fetchSessionDetail(sessionId) {
  const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}`);
  if (!res.ok) {
    const errorData = await safeJson(res, {});
    throw new Error(`[${res.status}] ${errorData.detail || 'Không tìm thấy phiên chat'}`);
  }
  return safeJson(res, {});
}

export async function fetchOlderMessages(sessionId, beforeMessageId, limit = 20) {
  const params = new URLSearchParams({ before: beforeMessageId, limit: String(limit) });
  const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}?${params}`);
  if (!res.ok) {
    const errorData = await safeJson(res, {});
    throw new Error(`[${res.status}] ${errorData.detail || 'Lỗi tải tin nhắn'}`);
  }
  return safeJson(res, { has_more: false, messages: [] });
}
export async function deleteChatSession(sessionId) {
  const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Xóa phiên chat thất bại');
}
export async function truncateChatMessage(sessionId, content) {
  const res = await authFetch(`${API_BASE}/chat/sessions/${sessionId}/truncate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Cập nhật tin nhắn thất bại');
}
export async function discardChatSession(sessionId) {
  await authFetch(`${API_BASE}/chat/sessions/${sessionId}/discard`, { method: 'POST' });
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
      const errorData = await safeJson(res, {});
      throw new QuotaError(errorData.detail || 'Quota exceeded');
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
      const errorData = await safeJson(res, {});
      throw new QuotaError(errorData.detail || 'Quota exceeded');
    }
    throw new Error('Không thể tạo bài kiểm tra');
  }
  await readStream(res, onChunk);
}

/**
 * Stream quiz generation với incremental parsing.
 * Dùng brace-depth tracking để phát hiện từng object JSON hoàn chỉnh
 * ngay khi dấu } cuối cùng của object đó xuất hiện trong stream.
 * @param {string} documentId
 * @param {object} callbacks - { onQuestion, onDone }
 * @param {boolean} force - true để tạo lại quiz mới
 * @param {AbortSignal} signal
 */
export async function streamDocumentQuiz(documentId, { onQuestion, onDone }, force = false, signal) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/quiz${force ? '?force=true' : ''}`, {
    signal
  });
  if (!res.ok) {
    if (res.status === 429) {
      const errorData = await safeJson(res, {});
      throw new QuotaError(errorData.detail || 'Quota exceeded');
    }
    throw new Error('Không thể tạo bài kiểm tra');
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('Streaming not supported');

  const decoder = new TextDecoder();
  let accumulated = '';
  const allQuestions = [];
  let questionIndex = 0;

  // Tìm tất cả object JSON hoàn chỉnh trong text bằng brace-depth
  function extractCompleteObjects(text) {
    // Bỏ markdown code fence
    let str = text.trim();
    if (str.includes('```json')) str = str.split('```json')[1]?.split('```')[0] || str;
    else if (str.includes('```')) str = str.split('```')[1]?.split('```')[0] || str;
    str = str.trim();

    const objects = [];
    let depth = 0;
    let inString = false;
    let escape = false;
    let objStart = -1;

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (ch === '{') {
        if (depth === 0) objStart = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && objStart >= 0) {
          // Object hoàn chỉnh — thử parse
          try {
            const obj = JSON.parse(str.slice(objStart, i + 1));
            objects.push(obj);
          } catch { /* bỏ qua object lỗi */ }
          objStart = -1;
        }
      }
    }
    return objects;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    accumulated += chunk;

    // Phát hiện lỗi mid-stream
    if (accumulated.includes('__ERROR__:')) {
      const errMsg = accumulated.split('__ERROR__:')[1]?.trim() || 'Đã xảy ra lỗi';
      if (errMsg.includes('quá tải') || errMsg.includes('quota') || errMsg.includes('429')) {
        throw new QuotaError(errMsg);
      }
      throw new Error(errMsg);
    }

    // Parse tất cả object hoàn chỉnh từ text tích lũy
    const found = extractCompleteObjects(accumulated);
    // Emit những câu mới (chưa emit)
    for (let i = questionIndex; i < found.length; i++) {
      const q = found[i];
      if (q?.question && Array.isArray(q?.options) && q.options.length > 0) {
        // Yield để React render từng câu riêng
        if (i > questionIndex) await new Promise(r => setTimeout(r, 100));
        allQuestions.push(q);
        onQuestion?.(q, allQuestions.length - 1);
      }
    }
    questionIndex = found.length;
  }

  // Parse cuối cùng — bắt câu hỏi còn sót
  const finalFound = extractCompleteObjects(accumulated);
  for (let i = questionIndex; i < finalFound.length; i++) {
    const q = finalFound[i];
    if (q?.question && Array.isArray(q?.options) && q.options.length > 0) {
      if (i > questionIndex) await new Promise(r => setTimeout(r, 100));
      allQuestions.push(q);
      onQuestion?.(q, allQuestions.length - 1);
    }
  }

  onDone?.(allQuestions);
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
      const errorData = await safeJson(res, {});
      throw new QuotaError(errorData.detail || 'Quota exceeded');
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
    const errorData = await safeJson(res, {});
    throw new Error(errorData.detail || 'Không thể cập nhật sơ đồ tư duy');
  }
}
export async function fetchDocumentStudyQuestionsStream(documentId, onChunk, signal) {
  const res = await authFetch(`${API_BASE}/chat/${documentId}/study-questions`, {
    signal
  });
  if (!res.ok) {
    if (res.status === 429) {
      const errorData = await safeJson(res, {});
      throw new QuotaError(errorData.detail || 'Quota exceeded');
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
  return (await res.text()).split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(line => line.length > 5);
}
export async function fetchQuota() {
  const res = await authFetch(`${API_BASE}/quota/me`);
  if (!res.ok) throw new Error('Không thể tải thông tin quota');
  const data = await safeJson(res);
  if (!data) throw new Error('Không nhận được dữ liệu quota');
  return Quota.fromJSON(data);
}
export async function fetchNotifications(params = {}) {
  const actualParams = typeof params === 'number' ? { limit: params } : params;
  const wantsPaginated = actualParams.withPagination || actualParams.page;
  const query = buildQueryParams({ ...actualParams, withPagination: wantsPaginated ? true : undefined });
  const res = await authFetch(`${API_BASE}/notifications${query}`);
  if (!res.ok) {
    return wantsPaginated ? { items: [], pagination: { page: 1, limit: 30, total: 0, totalPages: 1 } } : [];
  }
  const data = await safeJson(res, wantsPaginated ? { items: [], pagination: {} } : []);

  if (wantsPaginated && data && data.items) {
    return {
      items: data.items.map(rawNotification => Notification.fromJSON(rawNotification)),
      pagination: data.pagination
    };
  }

  const list = Array.isArray(data) ? data : (data?.items || []);
  return list.map(rawNotification => Notification.fromJSON(rawNotification));
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
