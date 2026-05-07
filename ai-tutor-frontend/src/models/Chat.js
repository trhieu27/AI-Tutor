export let ChatRole = /*#__PURE__*/function (ChatRole) {
  ChatRole["USER"] = "user";
  ChatRole["AI"] = "assistant";
  return ChatRole;
}({});
export class ChatMessage {
  constructor(id, role, content, timestamp = new Date(), sources // References from RAG (Retrieved Chunks)
  ) {
    this.id = id;
    this.role = role;
    this.content = content;
    this.timestamp = timestamp;
    this.sources = sources;
  }
}
export class ChatSession {
  constructor(id, userId, documentId,
  // The material this chat is based on
  title, messages = [], startedAt = new Date(), lastUpdatedAt = new Date()) {
    this.id = id;
    this.userId = userId;
    this.documentId = documentId;
    this.title = title;
    this.messages = messages;
    this.startedAt = startedAt;
    this.lastUpdatedAt = lastUpdatedAt;
  }
  addMessage(message) {
    this.messages.push(message);
    this.lastUpdatedAt = new Date();
  }
  getRecentMessages(limit = 5) {
    return this.messages.slice(-limit);
  }
}