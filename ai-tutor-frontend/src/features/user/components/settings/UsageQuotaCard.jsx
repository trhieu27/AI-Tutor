import { useEffect, useState } from "react";
import { fetchQuota } from "@/shared/services/api.service";
import Button from "@/shared/ui/Button";
import { USAGE_QUOTA_TEXTS } from "@/shared/constants/texts";

const quotaMetric = (quota, kind, keys) => {
  const method = kind === "limit" ? quota?.limitValue : quota?.usageValue;
  if (typeof method === "function") {
    const value = method.call(quota, keys);
    return Number.isFinite(value) ? value : 0;
  }

  const source = kind === "limit" ? quota?.limits : quota?.usage;
  const candidates = Array.isArray(keys) ? keys : [keys];

  for (const key of candidates) {
    const value = Number(source?.[key]);
    if (Number.isFinite(value)) return value;
  }

  return 0;
};

function UsageBar({ label, used = 0, limit = 0 }) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-bold text-[var(--muted)]">
        <span>{label}</span>
        <span>{limit > 0 ? `${used} / ${limit}` : USAGE_QUOTA_TEXTS.unlimited}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
        <div className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-300" style={{ width: `${limit > 0 ? percent : 100}%` }} />
      </div>
    </div>
  );
}

export default function UsageQuotaCard() {
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    fetchQuota().then(setQuota).catch(() => setQuota(null));
  }, []);

  if (!quota) return (
    <section className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] p-5 space-y-4 animate-pulse">
      <div className="h-4 w-40 rounded bg-[var(--border-color)]" />
      <div className="h-3 w-64 rounded bg-[var(--border-color)]" />
      <div className="space-y-3 pt-2">
        <div className="h-2 w-full rounded-full bg-[var(--border-color)]" />
        <div className="h-2 w-full rounded-full bg-[var(--border-color)]" />
        <div className="h-2 w-full rounded-full bg-[var(--border-color)]" />
      </div>
    </section>
  );

  const chatUsed = quotaMetric(quota, "usage", "chat_messages");
  const chatLimit = quotaMetric(quota, "limit", "chat_messages");
  const aiUsed = quotaMetric(quota, "usage", ["ai_generations", "ai_features"]);
  const aiLimit = quotaMetric(quota, "limit", ["ai_generations", "ai_features"]);
  const documentsUsed = quotaMetric(quota, "usage", "documents");
  const documentsLimit = quotaMetric(quota, "limit", "documents");

  return (
    <section className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">{USAGE_QUOTA_TEXTS.title}</h3>
          <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--muted)]">
            {USAGE_QUOTA_TEXTS.subtitle}
          </p>
        </div>
        <Button to="/pricing" variant="outline" size="sm" icon="workspace_premium">
          {USAGE_QUOTA_TEXTS.plan}
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        <UsageBar label={USAGE_QUOTA_TEXTS.chatMessages} used={chatUsed} limit={chatLimit} />
        <UsageBar label={USAGE_QUOTA_TEXTS.aiGenerations} used={aiUsed} limit={aiLimit} />
        <UsageBar label={USAGE_QUOTA_TEXTS.documents} used={documentsUsed} limit={documentsLimit} />
      </div>
    </section>
  );
}
