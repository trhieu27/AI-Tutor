export enum ChatRole {
  USER = 'user',
  AI = 'assistant'
}

export class ChatMessage {
  constructor(
    public id: string,
    public role: ChatRole,
    public content: string,
    public timestamp: Date = new Date(),
    public sources?: {
      documentId: string;
      pageNumber: number;
      textExcerpt: string;
    }[] // References from RAG (Retrieved Chunks)
  ) {}
}

export class ChatSession {
  constructor(
    public id: string,
    public userId: string,
    public documentId: string, // The material this chat is based on
    public title: string,
    public messages: ChatMessage[] = [],
    public startedAt: Date = new Date(),
    public lastUpdatedAt: Date = new Date()
  ) {}

  addMessage(message: ChatMessage) {
    this.messages.push(message);
    this.lastUpdatedAt = new Date();
  }

  getRecentMessages(limit: number = 5): ChatMessage[] {
    return this.messages.slice(-limit);
  }
}
