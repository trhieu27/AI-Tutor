import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/services/api.service";
import { PRICING_PAGE_TEXTS as T } from "@/constants/texts";
import { Button, IconButton, PageFrame, SegmentedControl, Skeleton, cx } from "@/components/ui/Premium";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081/api/v1";

const fmt = (value) => {
  const amount = Number(value || 0);
  return amount === 0 ? T.price.zeroDong : `${new Intl.NumberFormat("vi-VN").format(amount)}${T.price.dongSuffix}`;
};

function billingLabel(plan) {
  return plan.billing_cycle === "annual" ? T.payment.annual : T.payment.monthly;
}

function visibleFeatures(plan) {
  return (plan.features || []).filter(
    (feature) => !T.planFallbacks.hiddenFeatureKeywords.some((keyword) => feature.text?.toLowerCase().includes(keyword))
  );
}

function PaymentModal({ plan, onClose, onSuccess }) {
  const P = T.payment;
  const [method, setMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const price = plan.discounted_price_vnd;

  const methods = [
    {
      id: "momo",
      label: P.method.momo,
      icon: "account_balance_wallet",
      className: "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--brand-rose)]",
    },
    {
      id: "vnpay",
      label: P.method.vnpay,
      icon: "qr_code_2",
      className: "border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--brand-secondary)]",
    },
  ];

  const handlePay = async () => {
    setErr("");
    if (!method) {
      setErr(P.errors.selectMethod);
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(`${API}/plans/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id, payment_method: method }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setDone(true);
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[hsl(222_29%_8%/0.54)] p-4 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="premium-card w-full max-w-2xl overflow-hidden p-0 animate-dialog-enter">
        {done ? (
          <div className="px-6 py-8 text-center sm:px-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--brand-success)]">
              <span className="material-symbols-outlined text-[30px]" aria-hidden="true">verified</span>
            </span>
            <h2 className="mt-5 text-[21px] font-bold text-[var(--foreground)]">{P.successTitle}</h2>
            <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-6 text-[var(--muted)]">
              {P.successMsg(plan.display_name)}
            </p>
            <Button onClick={() => { onSuccess(); onClose(); }} className="mt-6 w-full sm:w-auto">
              {P.successBtn}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-[17px] font-bold text-[var(--foreground)]">{P.title}</h2>
                <p className="mt-1 text-[13px] font-medium text-[var(--muted)]">{P.subtitle(plan.display_name)}</p>
              </div>
              <IconButton icon="close" label={P.close} onClick={onClose} />
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                <p className="text-[11px] font-bold text-[var(--muted)]">{P.orderSummary}</p>
                <div className="mt-4 space-y-3 text-[13px]">
                  <div className="flex justify-between gap-4">
                    <span className="text-[var(--muted)]">{P.plan}</span>
                    <span className="text-right font-bold text-[var(--foreground)]">{plan.display_name}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[var(--muted)]">{P.billingCycle}</span>
                    <span className="font-semibold text-[var(--foreground)]">{billingLabel(plan)}</span>
                  </div>
                  <div className="border-t border-[var(--border-subtle)] pt-3">
                    <div className="flex items-end justify-between gap-4">
                      <span className="pb-1 text-[var(--muted)]">{P.total}</span>
                      <span className="text-[24px] font-[820] leading-none text-[var(--foreground)]">{fmt(price)}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <p className="text-[11px] font-bold text-[var(--muted)]">{P.method.title}</p>
                <div className="mt-3 grid gap-2">
                  {methods.map((paymentMethod) => {
                    const selected = method === paymentMethod.id;
                    return (
                      <button
                        key={paymentMethod.id}
                        type="button"
                        onClick={() => setMethod(paymentMethod.id)}
                        className={cx(
                          "flex h-14 w-full items-center gap-3.5 rounded-[var(--radius-control)] border px-4 text-left transition",
                          selected
                            ? "border-[var(--brand-primary)] bg-[hsl(166_61%_35%/0.06)] shadow-[var(--premium-shadow-sm)]"
                            : "border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[var(--border-emphasis)] hover:bg-[var(--card-bg-hover)]"
                        )}
                      >
                        <span className={cx(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                          paymentMethod.className
                        )}>
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{paymentMethod.icon}</span>
                        </span>
                        <span className={cx("min-w-0 flex-1 truncate text-[13px] font-bold", selected ? "text-[var(--foreground)]" : "text-[var(--foreground)]")}>{paymentMethod.label}</span>
                        <span className={cx(
                          "material-symbols-outlined shrink-0 text-[20px] transition",
                          selected ? "text-[var(--brand-primary)]" : "text-[var(--border-color)]"
                        )} aria-hidden="true">
                          {selected ? "check_circle" : "radio_button_unchecked"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {err && <p className="mt-3 text-[12px] font-semibold text-[var(--brand-rose)]">{err}</p>}
                <div className="mt-4 grid grid-cols-[0.8fr_1.2fr] gap-2">
                  <Button variant="secondary" onClick={onClose} disabled={loading}>{P.cancelBtn}</Button>
                  <Button onClick={handlePay} disabled={loading}>
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden="true" />
                        {P.submitting}
                      </span>
                    ) : (
                      P.submitBtn
                    )}
                  </Button>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlanCard({ plan, isActive, featured, onSelect }) {
  const texts = T.plans[plan.name] || {};
  const isFree = Number(plan.price_vnd || 0) === 0;
  const features = visibleFeatures(plan);
  const price = isFree ? fmt(0) : fmt(plan.discounted_price_vnd);
  const unit = T.price.vndByCycle(plan.billing_cycle);

  return (
    <article
      className={cx(
        "premium-card flex min-h-[420px] flex-col p-5",
        featured && "border-[var(--border-emphasis)] shadow-[var(--premium-shadow-md)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cx(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                featured
                  ? "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--brand-primary)]"
                  : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--muted)]"
              )}
            >
              <span className="material-symbols-outlined icon-thin text-[17px]" aria-hidden="true">
                {isFree ? "school" : "workspace_premium"}
              </span>
            </span>
            <h3 className="truncate text-[18px] font-bold text-[var(--foreground)]">{plan.display_name}</h3>
          </div>
        </div>
        {featured && (
          <span className="shrink-0 rounded-[var(--radius-chip)] bg-[var(--foreground)] px-2.5 py-1 text-[10px] font-bold text-[var(--background)]">
            {plan.billing_cycle === "annual" ? T.toggle.saveBadge : texts.popularBadge || T.planFallbacks.popular}
          </span>
        )}
      </div>

      <div className="mt-6">
        {!isFree && plan.discount_percent > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold">
            <span className="text-[var(--muted)] line-through">{fmt(plan.price_vnd)}</span>
            <span className="rounded-[var(--radius-chip)] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand-rose)]">
              -{plan.discount_percent}%
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="text-[38px] font-[860] leading-none text-[var(--foreground)]">{price}</span>
          <span className="pb-1 text-[12px] font-semibold text-[var(--muted)]">{unit}</span>
        </div>
      </div>

      <div className="mt-5">
        {isActive ? (
          <div className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--success-border)] bg-[var(--success-soft)] text-[13px] font-bold text-[var(--brand-success)]">
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">verified</span>
            {texts.ctaActive || T.planFallbacks.currentPlan}
          </div>
        ) : (
          <Button variant={featured ? "primary" : "secondary"} onClick={() => onSelect(plan)} className="w-full">
            {texts.cta || (isFree ? T.planFallbacks.freeCta : T.planFallbacks.proCta)}
          </Button>
        )}
      </div>

      <ul className="mt-5 space-y-2.5">
        {features.map((feature, index) => (
          <li key={`${feature.text}-${index}`} className="flex items-start gap-2.5">
            <span
              className={cx(
                "material-symbols-outlined mt-0.5 shrink-0 text-[17px]",
                feature.included ? "text-[var(--brand-success)]" : "text-[var(--muted-light)]"
              )}
              aria-hidden="true"
            >
              {feature.included ? "check_circle" : "remove_circle"}
            </span>
            <span className={cx("text-[12.5px] font-medium leading-5", feature.included ? "text-[var(--foreground)]" : "text-[var(--muted)]")}>
              {feature.text}
              {feature.limit && <span className="ml-1 text-[11px] text-[var(--muted)]">· {feature.limit}</span>}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function PricingSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-[420px]" />
      <Skeleton className="h-[420px]" />
    </div>
  );
}

function BillingToggle({ billingAnnual, onChange }) {
  return (
    <div className="flex items-center">
      <SegmentedControl
        value={billingAnnual ? "annual" : "monthly"}
        onChange={(value) => onChange(value === "annual")}
        options={[
          { id: "monthly", label: T.toggle.monthly, icon: "calendar_month" },
          {
            id: "annual",
            icon: "savings",
            label: (
              <span className="inline-flex items-center gap-1.5">
                <span>{T.toggle.annual}</span>
                <span className="rounded-[var(--radius-chip)] border border-[var(--success-border)] bg-[var(--success-soft)] px-1.5 py-0.5 text-[9px] font-[820] leading-none text-[var(--brand-success)]">
                  {T.toggle.saveShort}
                </span>
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

export default function PricingPage() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [myPlan, setMyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const load = useCallback(async () => {
    try {
      const [plansRes, myRes] = await Promise.all([
        fetch(`${API}/plans`),
        authFetch(`${API}/plans/my`),
      ]);
      if (plansRes.ok) setPlans(await plansRes.json());
      if (myRes.ok) {
        const data = await myRes.json();
        setMyPlan(data.plan);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visiblePlans = useMemo(
    () => plans.filter((plan) => plan.name === "free" || (billingAnnual ? plan.billing_cycle === "annual" : plan.billing_cycle === "monthly")),
    [billingAnnual, plans]
  );

  const handleSuccess = () => {
    updateUser({});
    load();
  };

  return (
    <PageFrame className="min-h-[calc(100svh-72px)] space-y-5 py-6 lg:py-7">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold leading-tight text-[var(--foreground)] sm:text-[34px]">
            {T.hero.title}
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] font-medium leading-6 text-[var(--muted)] sm:text-[14px]">
            {T.hero.subtitle}
          </p>
        </div>
        <IconButton icon="close" label={T.payment.close} onClick={() => navigate(-1)} className="shrink-0" />
      </div>

      <div className="premium-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--foreground)]">{T.toggle.title}</h2>
            <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--muted)]">
              {billingAnnual ? T.toggle.annualNote : T.toggle.monthlyNote}
            </p>
          </div>
          <BillingToggle billingAnnual={billingAnnual} onChange={setBillingAnnual} />
        </div>
      </div>

      {loading ? (
        <PricingSkeleton />
      ) : visiblePlans.length === 0 ? (
        <div className="premium-card p-10 text-center text-[13px] font-medium text-[var(--muted)]">
          <span className="material-symbols-outlined mb-3 block text-[34px]" aria-hidden="true">info</span>
          <p>{T.empty.noPlans}</p>
        </div>
      ) : (
        <div className={cx("grid gap-4", visiblePlans.length === 2 ? "mx-auto max-w-5xl lg:grid-cols-2" : "lg:grid-cols-3")}>
          {visiblePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              featured={plan.price_vnd > 0}
              isActive={myPlan?.id === plan.id}
              onSelect={setSelectedPlan}
            />
          ))}
        </div>
      )}

      {selectedPlan && (
        <PaymentModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} onSuccess={handleSuccess} />
      )}
    </PageFrame>
  );
}
