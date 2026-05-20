import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminPlans, readCachedAdminPlans, updateAdminPlan } from "@/features/admin/services/admin.service";
import { ADMIN_TEXTS } from "@/shared/constants/texts";
import Button from "@/shared/ui/Button";
import {
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminLoading,
  AdminPageIntro,
  AdminSection,
  AdminStatusPill,
  formatNumber,
  formatVnd,
} from "@/features/admin/components/AdminPrimitives";

function toDraft(plan) {
  return {
    display_name: plan.display_name || "",
    price_vnd: plan.price_vnd || 0,
    discounted_price_vnd: plan.discounted_price_vnd || 0,
    discount_percent: plan.discount_percent || 0,
    sort_order: plan.sort_order || 0,
    is_active: Boolean(plan.is_active),
    is_popular: Boolean(plan.is_popular),
    quota: {
      chat_per_day: plan.quota?.chat_per_day ?? 0,
      ai_generations_per_day: plan.quota?.ai_generations_per_day ?? 0,
      max_documents: plan.quota?.max_documents ?? 0,
    },
  };
}

function PlanEditor({ plan, draft, saving, onChange, onSave }) {
  const quota = draft.quota || {};
  const update = (key, value) => onChange(plan.id, { ...draft, [key]: value });
  const updateQuota = (key, value) => onChange(plan.id, { ...draft, quota: { ...quota, [key]: value } });

  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--premium-shadow-sm)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-[16px] font-[780] text-[var(--foreground)]">{plan.name}</h2>
            <AdminStatusPill tone={draft.is_active ? "green" : "neutral"}>{draft.is_active ? "Đang bán" : "Tạm ẩn"}</AdminStatusPill>
            {draft.is_popular && <AdminStatusPill tone="warm" icon="star">Phổ biến</AdminStatusPill>}
          </div>
          <p className="mt-1 text-[12px] font-semibold text-[var(--muted)]">{formatVnd(draft.discounted_price_vnd || draft.price_vnd)} · {plan.billing_cycle}</p>
        </div>
        <Button loading={saving} variant="primary" icon="save" onClick={() => onSave(plan.id)}>
          {ADMIN_TEXTS.common.save}
        </Button>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
          Tên hiển thị
          <AdminInput value={draft.display_name} onChange={(event) => update("display_name", event.target.value)} />
        </label>
        <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
          {ADMIN_TEXTS.plans.sortOrder}
          <AdminInput type="number" value={draft.sort_order} onChange={(event) => update("sort_order", Number(event.target.value))} />
        </label>
        <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
          {ADMIN_TEXTS.plans.price}
          <AdminInput type="number" value={draft.price_vnd} onChange={(event) => update("price_vnd", Number(event.target.value))} />
        </label>
        <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
          {ADMIN_TEXTS.plans.discountedPrice}
          <AdminInput type="number" value={draft.discounted_price_vnd} onChange={(event) => update("discounted_price_vnd", Number(event.target.value))} />
        </label>
        <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
          {ADMIN_TEXTS.plans.discount}
          <AdminInput type="number" value={draft.discount_percent} onChange={(event) => update("discount_percent", Number(event.target.value))} />
        </label>
        <div className="flex flex-wrap items-center gap-2 pt-5">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface)] px-3 text-[12px] font-bold text-[var(--foreground)] transition-colors duration-150 hover:border-[var(--border-emphasis)] hover:bg-[var(--card-bg)]"
            onClick={() => update("is_active", !draft.is_active)}
          >
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">{draft.is_active ? "toggle_on" : "toggle_off"}</span>
            {ADMIN_TEXTS.plans.active}
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface)] px-3 text-[12px] font-bold text-[var(--foreground)] transition-colors duration-150 hover:border-[var(--border-emphasis)] hover:bg-[var(--card-bg)]"
            onClick={() => update("is_popular", !draft.is_popular)}
          >
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">{draft.is_popular ? "star" : "star_outline"}</span>
            {ADMIN_TEXTS.plans.popular}
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-t border-[var(--border-subtle)] p-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
          {ADMIN_TEXTS.plans.chatQuota}
          <AdminInput type="number" value={quota.chat_per_day} onChange={(event) => updateQuota("chat_per_day", Number(event.target.value))} aria-label={ADMIN_TEXTS.plans.chatQuota} />
        </label>
        <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
          {ADMIN_TEXTS.plans.generationQuota}
          <AdminInput type="number" value={quota.ai_generations_per_day} onChange={(event) => updateQuota("ai_generations_per_day", Number(event.target.value))} aria-label={ADMIN_TEXTS.plans.generationQuota} />
        </label>
        <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
          {ADMIN_TEXTS.plans.documentLimit}
          <AdminInput type="number" value={quota.max_documents} onChange={(event) => updateQuota("max_documents", Number(event.target.value))} aria-label={ADMIN_TEXTS.plans.documentLimit} />
        </label>
        <p className="text-[11px] font-semibold leading-5 text-[var(--muted)] sm:col-span-2 xl:col-span-3">
          Nhập -1 cho các hạn mức không giới hạn.
        </p>
      </div>
    </article>
  );
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState(() => readCachedAdminPlans() || []);
  const [drafts, setDrafts] = useState(() => {
    const cached = readCachedAdminPlans() || [];
    return Object.fromEntries(cached.map((plan) => [plan.id, toDraft(plan)]));
  });
  const [savingId, setSavingId] = useState("");
  const [loading, setLoading] = useState(() => !readCachedAdminPlans());
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const cached = readCachedAdminPlans();
    if (cached) {
      setPlans(cached);
      setDrafts(Object.fromEntries(cached.map((plan) => [plan.id, toDraft(plan)])));
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const items = await fetchAdminPlans();
      setPlans(items);
      setDrafts(Object.fromEntries(items.map((plan) => [plan.id, toDraft(plan)])));
    } catch (err) {
      if (!cached) setError(err.message);
      else console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const active = plans.filter((plan) => drafts[plan.id]?.is_active).length;
    const popular = plans.filter((plan) => drafts[plan.id]?.is_popular).length;
    return `${formatNumber(active)} đang bán · ${formatNumber(popular)} gói nổi bật`;
  }, [plans, drafts]);

  const savePlan = async (id) => {
    setSavingId(id);
    try {
      await updateAdminPlan(id, drafts[id]);
      await load();
    } catch (err) {
      console.error(err.message);
    } finally {
      setSavingId("");
    }
  };

  return (
    <div>
      <AdminPageIntro title={ADMIN_TEXTS.plans.title} subtitle={ADMIN_TEXTS.plans.subtitle} />
      <div className="space-y-5 p-4 sm:p-6">
        {loading ? (
          <AdminLoading variant="plans" />
        ) : error ? (
          <AdminError message={error} onRetry={load} />
        ) : (
          <AdminSection title="Cấu hình gói" subtitle={summary}>
            {plans.length ? (
              <div className="space-y-4 p-4">
                {plans.map((plan) => (
                  <PlanEditor
                    key={plan.id}
                    plan={plan}
                    draft={drafts[plan.id] || toDraft(plan)}
                    saving={savingId === plan.id}
                    onChange={(id, nextDraft) => setDrafts((current) => ({ ...current, [id]: nextDraft }))}
                    onSave={savePlan}
                  />
                ))}
              </div>
            ) : (
              <AdminEmpty icon="workspace_premium" title="Chưa có gói dịch vụ" subtitle="Tạo gói miễn phí, gói tháng và gói năm để quản trị giá cùng hạn mức" />
            )}
          </AdminSection>
        )}
      </div>
    </div>
  );
}
