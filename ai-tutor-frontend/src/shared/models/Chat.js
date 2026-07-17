/**
 * Chat models — map API response to typed classes.
 *
 * Message API shape: { id, role: 'user'|'assistant', content, timestamp, sources? }
 * Session API shape: { id, title, document_id, created_at, updated_at, messages? }
 */

export const ChatRole = Object.freeze({
  USER:      'user',
  ASSISTANT: 'assistant',
});

export class ChatMessage {
  constructor({ id, role, content, timestamp, created_at, session_id, sources = [] }) {
    this.id         = id;
    this.role       = role;       // ChatRole.USER | ChatRole.ASSISTANT
    this.content    = content;
    this.timestamp  = (timestamp || created_at) ? new Date(timestamp || created_at) : new Date();
    this.sources    = sources;    // { page_number, chunk_text }[]

    // snake_case aliases for backward-compat
    this.created_at  = created_at || timestamp;
    this.session_id  = session_id;
  }

  static fromJSON(json) {
    return new ChatMessage(json);
  }

  get isUser()      { return this.role === ChatRole.USER; }
  get isAssistant() { return this.role === ChatRole.ASSISTANT; }
}

export class ChatSession {
  constructor({ id, title, document_id, document_name, document_status, page_count, created_at, updated_at, messages = [], message_count }) {
    this.id         = id;
    this.title      = title;
    this.documentId = document_id;
    this.documentName = document_name;
    this.documentStatus = document_status;
    this.pageCount = page_count;
    this.createdAt  = created_at ? new Date(created_at) : new Date();
    this.updatedAt  = updated_at ? new Date(updated_at) : new Date();
    this.messages   = messages.map(m => ChatMessage.fromJSON(m));
    this.messageCountValue = message_count;

    // snake_case aliases for backward-compat
    this.document_id = document_id;
    this.document_name = document_name;
    this.document_status = document_status;
    this.page_count = page_count;
    this.created_at  = created_at;
    this.updated_at  = updated_at;
  }

  static fromJSON(json) {
    return new ChatSession(json);
  }

  get messageCount() { return this.messageCountValue ?? this.messages.length; }
}
