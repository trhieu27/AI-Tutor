export enum ChatRole {
  USER = 'user',
  AI = 'assistant'
}

export class ChatMessage {
  constructor(
    public id,
    public role: ChatRole,
    public content,
    public timestamp = new Date(),
    public sources?: {
      documentId;
      pageNumber;
      textExcerpt;
    }[] // References from RAG (Retrieved Chunks)
  ) {}
}

export class ChatSession {
  constructor(
    public id,
    public userId,
    public documentId, // The material this chat is based on
    public title,
    public messages = [],
    public startedAt = new Date(),
    public lastUpdatedAt = new Date()
  ) {}

  addMessage(message) {
    this.messages.push(message);
    this.lastUpdatedAt = new Date();
  }

  getRecentMessages(limit = 5) {
    return this.messages.slice(-limit);
  }
}
