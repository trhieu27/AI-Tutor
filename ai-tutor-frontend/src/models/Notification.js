/**
 * Notification model — map API response to typed class.
 * API shape: { id, type, title, message, is_read, created_at }
 */
export class Notification {
  constructor({ id, type, title, message, is_read, created_at }) {
    this.id        = id;
    this.type      = type;
    this.title     = title;
    this.message   = message;
    this.isRead    = is_read;
    this.createdAt = created_at ? new Date(created_at) : new Date();

    // snake_case alias for backward-compat
    this.is_read    = is_read;
    this.created_at = created_at;
  }

  static fromJSON(json) {
    return new Notification(json);
  }

  get isUnread() { return !this.isRead; }
}

/**
 * Quota model — map API response to typed class.
 * API shape: { usage: { chat_messages, ai_generations }, limits: { chat_messages, ai_generations }, plan }
 */
export class Quota {
  constructor({ usage = {}, limits = {}, plan = 'free' } = {}) {
    this.usage  = usage;
    this.limits = limits;
    this.plan   = plan;
  }

  static fromJSON(json) {
    return new Quota(json ?? {});
  }

  get isPro() { return this.plan === 'pro'; }

  chatRemaining() {
    return Math.max(0, (this.limits.chat_messages ?? 0) - (this.usage.chat_messages ?? 0));
  }

  aiRemaining() {
    return Math.max(0, (this.limits.ai_generations ?? 0) - (this.usage.ai_generations ?? 0));
  }
}
