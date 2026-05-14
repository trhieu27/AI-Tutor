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

const asQuotaRecord = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
};

const toQuotaNumber = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const readQuotaNumber = (record, keys) => {
  const source = asQuotaRecord(record);
  const candidates = Array.isArray(keys) ? keys : [keys];

  for (const key of candidates) {
    const number = toQuotaNumber(source[key]);
    if (number !== undefined) return number;
  }

  return undefined;
};

const normalizeQuotaRecord = (record) => {
  const source = asQuotaRecord(record);
  const chatMessages = readQuotaNumber(source, "chat_messages");
  const aiGenerations = readQuotaNumber(source, ["ai_generations", "ai_features"]);
  const documents = readQuotaNumber(source, "documents");

  return {
    ...source,
    ...(chatMessages !== undefined ? { chat_messages: chatMessages } : {}),
    ...(aiGenerations !== undefined ? { ai_generations: aiGenerations, ai_features: aiGenerations } : {}),
    ...(documents !== undefined ? { documents } : {}),
  };
};

/**
 * Quota model — map API response to typed class.
 * API shape: { is_pro: bool, usage: { chat_messages, ai_features }, limits: { chat_messages, ai_features, documents } }
 */
export class Quota {
  constructor(payload = {}) {
    const { usage = {}, limits = {}, plan = 'free', is_pro = false } = payload ?? {};

    this.usage  = normalizeQuotaRecord(usage);
    this.limits = normalizeQuotaRecord(limits);
    this.plan   = plan;
    // Backend returns is_pro directly — expose it as a plain property
    this.is_pro = is_pro;
  }

  static fromJSON(json) {
    return new Quota(json ?? {});
  }

  // isPro is true if either is_pro flag is set OR plan name is 'pro'
  get isPro() { return this.is_pro || this.plan === 'pro'; }

  usageValue(keys) {
    return readQuotaNumber(this.usage, keys) ?? 0;
  }

  limitValue(keys) {
    return readQuotaNumber(this.limits, keys);
  }

  remaining(limitKeys, usageKeys = limitKeys) {
    const limit = this.limitValue(limitKeys);
    if (limit === undefined) return undefined;

    return Math.max(0, limit - this.usageValue(usageKeys));
  }

  chatRemaining() {
    return this.remaining("chat_messages");
  }

  aiRemaining() {
    return this.remaining(["ai_generations", "ai_features"]);
  }
}
