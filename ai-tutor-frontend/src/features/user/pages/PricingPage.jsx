import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { authFetch, safeJson } from "@/shared/services/api.service";
import { PRICING_PAGE_TEXTS as T } from "@/shared/constants/texts";
import { Button, IconButton, PageFrame, SegmentedControl, Skeleton, cx } from "@/shared/ui/Premium";
import Lottie from "lottie-react";
import successAnimData from "@/features/user/assets/payment_successfully.json";

function SuccessAnimation() {
  return <Lottie animationData={successAnimData} loop={false} className="mx-auto h-40 w-40 -mb-4" />;
}


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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const price = plan.discounted_price_vnd;

  // Tạo đơn thanh toán khi mở modal
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`${API}/plans/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan_id: plan.id }),
        });
        if (!res.ok) {
          const errData = await safeJson(res, {});
          throw new Error(errData.detail || "Không thể khởi tạo thanh toán");
        }
        const data = await safeJson(res);
        if (!cancelled) setPaymentInfo(data);
      } catch (error) {
        if (!cancelled) setErr(error.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [plan.id]);

  // Poll kiểm tra thanh toán mỗi 5 giây
  useEffect(() => {
    if (!paymentInfo?.order_code || done) return;
    const interval = setInterval(async () => {
      try {
        const res = await authFetch(`${API}/plans/check-payment/${paymentInfo.order_code}`);
        if (res.ok) {
          const data = await safeJson(res);
          if (data?.paid) {
            setDone(true);
            clearInterval(interval);
          }
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [paymentInfo?.order_code, done]);

  const handleClose = () => {
    // Nếu đang chờ thanh toán, chuyển polling về parent (có timeout)
    onClose(paymentInfo && !done ? paymentInfo.order_code : null);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[hsl(222_29%_8%/0.54)] p-4 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && handleClose()}
    >
      <div className="premium-card w-full max-w-xl overflow-hidden p-0 animate-dialog-enter">
        {done ? (
          <div className="px-6 py-8 text-center sm:px-8">
            <SuccessAnimation />
            <h2 className="mt-2 text-[21px] font-bold text-[var(--foreground)]">{P.successTitle}</h2>
            <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-6 text-[var(--muted)]">
              {P.successMsg(plan.display_name)}
            </p>
            <Button onClick={() => { onSuccess(); onClose(null); }} className="mt-6 w-full sm:w-auto">
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
              <IconButton icon="close" label={P.close} onClick={handleClose} />
            </div>

            <div className="p-5">
              {/* Order summary */}
              <section className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                <div className="grid grid-cols-3 gap-2 text-[13px]">
                  <div>
                    <span className="text-[11px] font-bold text-[var(--muted)]">{P.plan}</span>
                    <p className="mt-1 font-bold text-[var(--foreground)]">{plan.display_name}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-[11px] font-bold text-[var(--muted)]">{P.billingCycle}</span>
                    <p className="mt-1 font-semibold text-[var(--foreground)]">{billingLabel(plan)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-[var(--muted)]">{P.total}</span>
                    <p className="mt-1 text-[20px] font-[820] leading-none text-[var(--brand-primary)]">{fmt(price)}</p>
                  </div>
                </div>
              </section>

              {/* QR Section */}
              <div className="mt-5 flex flex-col items-center text-center">
                {loading ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="h-[220px] w-[220px] animate-pulse rounded-2xl bg-[var(--surface-raised)]" />
                    <p className="text-[13px] font-medium text-[var(--muted)]">Đang tạo mã thanh toán...</p>
                  </div>
                ) : err ? (
                  <div className="py-6">
                    <span className="material-symbols-outlined text-[40px] text-[var(--brand-rose)]" aria-hidden="true">error</span>
                    <p className="mt-2 text-[13px] font-semibold text-[var(--brand-rose)]">{err}</p>
                    <Button variant="secondary" onClick={() => onClose(null)} className="mt-4">Đóng</Button>
                  </div>
                ) : paymentInfo ? (
                  <>
                    {/* QR from payOS */}
                    <div className="rounded-2xl border-2 border-[var(--border-emphasis)] bg-white p-2 shadow-[var(--premium-shadow-sm)]">
                      <img
                        src={paymentInfo.qr_code}
                        alt="QR thanh toán"
                        className="h-[220px] w-[220px] object-contain"
                      />
                    </div>

                    <p className="mt-4 text-[13px] font-bold text-[var(--foreground)]">
                      Quét mã QR để thanh toán
                    </p>
                    <p className="mt-1 max-w-xs text-[12px] font-medium leading-5 text-[var(--muted)]">
                      Mở ứng dụng ngân hàng, quét mã QR phía trên để hoàn tất thanh toán
                    </p>

                    {/* Checkout link */}
                    {paymentInfo.checkout_url && (
                      <a
                        href={paymentInfo.checkout_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--brand-primary)] hover:underline"
                      >
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_new</span>
                        Hoặc mở trang thanh toán
                      </a>
                    )}

                    {/* Polling indicator */}
                    <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-medium text-[var(--muted)]">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-primary)]" />
                      Đang chờ xác nhận thanh toán...
                    </div>
                  </>
                ) : null}
              </div>

              {/* Cancel */}
              {!loading && !err && (
                <div className="mt-5 flex justify-center">
                  <Button variant="secondary" onClick={handleClose} className="w-full sm:w-auto">{P.cancelBtn}</Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatFeatureText(text, plan) {
  if (!text) return "";
  const lowerText = text.toLowerCase();
  const quota = plan.quota || {};

  if (lowerText.includes("chat với ai")) {
    const limit = quota.chat_per_day;
    if (limit === undefined) return text;
    return limit === -1
      ? "Chat với AI không giới hạn"
      : `Chat với AI (${limit} tin/ngày)`;
  }

  if (lowerText.includes("tạo nội dung ai")) {
    const limit = quota.ai_generations_per_day;
    if (limit === undefined) return text;
    return limit === -1
      ? "Tạo nội dung AI không giới hạn"
      : `Tạo nội dung AI (${limit} lượt/ngày)`;
  }

  if (lowerText.includes("tài liệu (tối đa") || lowerText.includes("tài liệu không giới hạn") || (lowerText.includes("tài liệu") && (lowerText.includes("file") || lowerText.includes("giới hạn")))) {
    const limit = quota.max_documents;
    if (limit === undefined) return text;
    return limit === -1
      ? "Tài liệu không giới hạn"
      : `Tài liệu (tối đa ${limit} file)`;
  }

  if (lowerText.includes("sơ đồ tư duy")) {
    const limit = quota.ai_generations_per_day;
    if (limit === -1) {
      return "Sơ đồ tư duy không giới hạn";
    }
    return "Sơ đồ tư duy";
  }

  if (lowerText.includes("luyện tập trắc nghiệm")) {
    const limit = quota.ai_generations_per_day;
    if (limit === -1) {
      return "Luyện tập trắc nghiệm không giới hạn";
    }
    return "Luyện tập trắc nghiệm";
  }

  return text;
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
            {plan.billing_cycle === "annual" && plan.discount_percent > 0 ? T.toggle.saveBadge(plan.discount_percent) : texts.popularBadge || T.planFallbacks.popular}
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
              {formatFeatureText(feature.text, plan)}
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

function BillingToggle({ billingAnnual, onChange, annualDiscount = 0 }) {
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
                {annualDiscount > 0 && (
                  <span className="rounded-[var(--radius-chip)] border border-[var(--success-border)] bg-[var(--success-soft)] px-1.5 py-0.5 text-[9px] font-[820] leading-none text-[var(--brand-success)]">
                    {T.toggle.saveShort(annualDiscount)}
                  </span>
                )}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

export default function PricingPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [myPlan, setMyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [bgOrderCode, setBgOrderCode] = useState(null);


  const load = useCallback(async () => {
    try {
      const [plansRes, myRes] = await Promise.all([
        fetch(`${API}/plans`),
        authFetch(`${API}/plans/my`),
      ]);
      if (plansRes.ok) setPlans(await safeJson(plansRes, []));
      if (myRes.ok) {
        const data = await safeJson(myRes, {});
        setMyPlan(data?.plan);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Background polling khi user đóng dialog mà chưa thanh toán xong (tối đa 2 phút)
  useEffect(() => {
    if (!bgOrderCode) return;
    const timeout = setTimeout(() => setBgOrderCode(null), 2 * 60 * 1000);
    const interval = setInterval(async () => {
      try {
        const res = await authFetch(`${API}/plans/check-payment/${bgOrderCode}`);
        if (res.ok) {
          const data = await safeJson(res);
          if (data?.paid) {
            setBgOrderCode(null);
            clearInterval(interval);
            clearTimeout(timeout);
            refreshUser();
            load();
          }
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [bgOrderCode, refreshUser, load]);



  const visiblePlans = useMemo(
    () => plans.filter((plan) => plan.name === "free" || (billingAnnual ? plan.billing_cycle === "annual" : plan.billing_cycle === "monthly")),
    [billingAnnual, plans]
  );

  const annualDiscount = useMemo(
    () => plans.find((p) => p.billing_cycle === "annual")?.discount_percent || 0,
    [plans]
  );

  const handleSuccess = () => {
    setBgOrderCode(null);
    refreshUser();
    load();
  };

  const handleModalClose = (pendingOrderCode) => {
    setSelectedPlan(null);
    if (pendingOrderCode) {
      setBgOrderCode(pendingOrderCode);
    }
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
          <BillingToggle billingAnnual={billingAnnual} onChange={setBillingAnnual} annualDiscount={annualDiscount} />
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
        <PaymentModal plan={selectedPlan} onClose={handleModalClose} onSuccess={handleSuccess} />
      )}

      {bgOrderCode && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-3 shadow-[var(--premium-shadow-md)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-primary)]" />
          <span className="text-[12px] font-semibold text-[var(--muted)]">Đang chờ xác nhận thanh toán...</span>
        </div>
      )}
    </PageFrame>
  );
}
