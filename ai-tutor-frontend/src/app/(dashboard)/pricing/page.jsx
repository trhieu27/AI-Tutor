import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/services/api.service';
import { PRICING_PAGE_TEXTS as T } from '@/constants/texts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1';

/* ── Helpers ─────────────────────────────────────────────── */
const fmt = (n) =>
  n === 0 ? T.price.free : new Intl.NumberFormat('vi-VN').format(n) + 'đ';

/* ── Payment Modal ───────────────────────────────────────── */
function PaymentModal({ plan, onClose, onSuccess }) {
  const P = T.payment;
  const [method, setMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const price =
    plan.billing_cycle === 'annual'
      ? plan.discounted_price_vnd
      : plan.discounted_price_vnd;

  const handlePay = async () => {
    setErr('');
    if (!method) { setErr(P.errors.selectMethod); return; }
    setLoading(true);
    try {
      const res = await authFetch(`${API}/plans/subscribe`, {
        method: 'POST',
        body: JSON.stringify({ plan_id: plan.id, payment_method: method }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setDone(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const METHODS = [
    { id: 'momo',  img: '/momo-logo.png',  label: P.method.momo,  color: '#A50064' },
    { id: 'vnpay', img: '/vnpay-logo.png', label: P.method.vnpay, color: '#1a3f6f' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--background)', border: '1px solid var(--border-color)' }}
      >
        {done ? (
          /* ── Success ── */
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{ background: 'hsl(158 64% 44% / 0.12)' }}>🎉</div>
            <h2 className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>{P.successTitle}</h2>
            <p className="text-[14px]" style={{ color: 'var(--muted)' }}>{P.successMsg(plan.display_name)}</p>
            <button
              onClick={() => { onSuccess(); onClose(); }}
              className="mt-2 px-8 py-3 rounded-2xl text-white font-bold text-[14px] transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg,hsl(239 68% 58%),hsl(263 70% 62%))' }}
            >{P.successBtn}</button>
          </div>
        ) : (
          /* ── Form ── */
          <>
            <div className="px-7 pt-7 pb-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-bold" style={{ color: 'var(--foreground)' }}>{P.title}</h2>
                  <p className="text-[13px] mt-0.5" style={{ color: 'var(--muted)' }}>{P.subtitle(plan.display_name)}</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-70"
                  style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>
            </div>

            <div className="px-7 py-5 space-y-5">
              {/* Order summary */}
              <div className="p-4 rounded-2xl space-y-2" style={{ background: 'var(--surface)' }}>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{P.orderSummary}</p>
                <div className="flex justify-between text-[13px]">
                  <span style={{ color: 'var(--foreground)' }}>{P.plan}</span>
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{plan.display_name}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span style={{ color: 'var(--muted)' }}>{P.billingCycle}</span>
                  <span style={{ color: 'var(--muted)' }}>{plan.billing_cycle === 'annual' ? P.annual : P.monthly}</span>
                </div>
                <div className="flex justify-between text-[15px] font-bold pt-1" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--foreground)' }}>{P.total}</span>
                  <span style={{ color: 'hsl(239 68% 58%)' }}>{fmt(price)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{P.method.title}</p>
                {METHODS.map((m) => (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    border: `1.5px solid ${method === m.id ? m.color : 'var(--border-color)'}`,
                    background: method === m.id ? `${m.color}18` : 'transparent',
                  }}>
                  <img src={m.img} alt={m.label} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--foreground)' }}>{m.label}</span>
                  {method === m.id && (
                    <span className="ml-auto material-symbols-outlined text-[16px]" style={{ color: m.color }}>check_circle</span>
                  )}
                </button>
              ))}
              </div>

              {/* QR info for selected method */}
              {method && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                  <span className="material-symbols-outlined text-[18px]" style={{ color: 'hsl(158 64% 44%)' }}>qr_code_2</span>
                  <p className="text-[12px]" style={{ color: 'var(--muted)' }}>
                    Mở app <strong style={{ color: 'var(--foreground)' }}>{method === 'momo' ? 'MoMo' : 'VNPay'}</strong> trên điện thoại, quét mã QR để hoàn tất thanh toán.
                  </p>
                </div>
              )}

              {err && <p className="text-[12px] font-semibold" style={{ color: 'hsl(343 72% 48%)' }}>{err}</p>}

              <p className="text-[11px] text-center" style={{ color: 'var(--muted)' }}>{P.mockNote}</p>
              <p className="text-[11px] text-center" style={{ color: 'var(--muted)' }}>{P.secureNote}</p>

              <div className="flex gap-3">
                <button onClick={onClose} disabled={loading}
                  className="flex-1 py-3 rounded-2xl text-[13px] font-semibold transition-all hover:opacity-80"
                  style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border-color)' }}>
                  {P.cancelBtn}
                </button>
                <button onClick={handlePay} disabled={loading}
                  className="flex-[2] py-3 rounded-2xl text-white text-[13px] font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,hsl(239 68% 58%),hsl(263 70% 62%))' }}>
                  {loading ? P.submitting : P.submitBtn}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Plan Card ───────────────────────────────────────────── */
function PlanCard({ plan, isActive, billingAnnual, onSelect }) {
  const texts = T.plans[plan.name] || {};
  const isPopular = plan.is_popular;
  const isPro = plan.name !== 'free';
  const displayPrice = billingAnnual && plan.billing_cycle === 'annual'
    ? plan.discounted_price_vnd
    : plan.discounted_price_vnd;

  return (
    <div
      className="relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300"
      style={{
        border: isPopular ? '2px solid hsl(239 68% 58%)' : '1px solid var(--border-color)',
        background: isPopular
          ? 'linear-gradient(160deg, hsl(239 68% 58% / 0.06) 0%, hsl(263 70% 62% / 0.04) 100%)'
          : 'var(--surface)',
        boxShadow: isPopular ? '0 8px 40px hsl(239 68% 58% / 0.15)' : 'none',
      }}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-px left-0 right-0 flex justify-center">
          <span className="px-4 py-1 rounded-b-xl text-[11px] font-bold text-white"
            style={{ background: 'linear-gradient(90deg, hsl(239 68% 58%), hsl(263 70% 62%))' }}>
            {texts.popularBadge}
          </span>
        </div>
      )}

      <div className="p-7 flex flex-col flex-1" style={{ paddingTop: isPopular ? '2.25rem' : '1.75rem' }}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[18px] font-bold" style={{ color: 'var(--foreground)' }}>{plan.display_name}</h3>
            {isPro && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white"
                style={{ background: 'linear-gradient(90deg,hsl(239 68% 58%),hsl(263 70% 62%))' }}>PRO</span>
            )}
          </div>
          <p className="text-[12px]" style={{ color: 'var(--muted)' }}>{texts.tagline}</p>
        </div>

        {/* Price */}
        <div className="mb-6">
          {plan.price_vnd === 0 ? (
            <div className="text-[36px] font-black" style={{ color: 'var(--foreground)' }}>
              {T.price.free}
            </div>
          ) : (
            <>
              {plan.discount_percent > 0 && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="line-through text-[14px]" style={{ color: 'var(--muted)' }}>
                    {fmt(plan.price_vnd)}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white"
                    style={{ background: 'hsl(343 85% 58%)' }}>
                    -{plan.discount_percent}%
                  </span>
                </div>
              )}
              <div className="flex items-end gap-1">
                <span className="text-[36px] font-black leading-none" style={{ color: 'var(--foreground)' }}>
                  {fmt(displayPrice)}
                </span>
                <span className="text-[13px] mb-1" style={{ color: 'var(--muted)' }}>
                  {plan.billing_cycle === 'annual' ? T.price.perYear : T.price.perMonth}
                </span>
              </div>
              {plan.billing_cycle === 'annual' && plan.discount_percent > 0 && (
                <p className="text-[11px] mt-1" style={{ color: 'hsl(158 64% 44%)' }}>
                  {T.price.savePercent(plan.discount_percent)} so với tháng
                </p>
              )}
            </>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => !isActive && onSelect(plan)}
          disabled={isActive}
          className="w-full py-3 rounded-2xl text-[13px] font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-default mb-6"
          style={isActive
            ? { background: 'var(--border-color)', color: 'var(--muted)' }
            : isPopular
              ? { background: 'linear-gradient(135deg,hsl(239 68% 58%),hsl(263 70% 62%))', color: '#fff', boxShadow: '0 4px 20px hsl(239 68% 58% / 0.35)' }
              : { background: 'var(--background)', color: 'var(--foreground)', border: '1.5px solid var(--border-color)' }
          }
        >
          {isActive ? texts.ctaActive : texts.cta}
        </button>

        {/* Features */}
        <ul className="space-y-3 flex-1">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="material-symbols-outlined flex-shrink-0 mt-0.5"
                style={{ fontSize: 16, color: f.included ? 'hsl(158 64% 44%)' : 'var(--muted)' }}>
                {f.included ? 'check_circle' : 'remove_circle'}
              </span>
              <div>
                <span className="text-[12px] font-medium" style={{ color: f.included ? 'var(--foreground)' : 'var(--muted)' }}>
                  {f.text}
                </span>
                {f.limit && (
                  <span className="ml-1 text-[11px]" style={{ color: f.included ? 'hsl(239 68% 60%)' : 'var(--muted)' }}>
                    · {f.limit}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── FAQ Item ────────────────────────────────────────────── */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden transition-all" style={{ border: '1px solid var(--border-color)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left transition-all hover:opacity-80"
        style={{ background: 'var(--surface)' }}
      >
        <span className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>{q}</span>
        <span className="material-symbols-outlined flex-shrink-0 ml-4 transition-transform"
          style={{ fontSize: 20, color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none' }}>
          expand_more
        </span>
      </button>
      {open && (
        <div className="px-6 py-4" style={{ background: 'var(--background)', borderTop: '1px solid var(--border-color)' }}>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>{a}</p>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function PricingPage() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [myPlan, setMyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null); // plan to pay

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

  useEffect(() => { load(); }, [load]);

  // Show annual plans when toggle is ON, monthly when OFF
  const visiblePlans = plans.filter((p) => {
    if (p.name === 'free') return true;
    if (billingAnnual) return p.billing_cycle === 'annual';
    return p.billing_cycle === 'monthly';
  });

  const handleSuccess = () => {
    updateUser({ is_pro: true });
    load();
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-5xl mx-auto px-6 py-14">

        {/* ── Hero ── */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4"
            style={{ background: 'hsl(239 68% 58% / 0.10)', color: 'hsl(239 55% 50%)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>diamond</span>
            {T.hero.badge}
          </span>
          <h1 className="text-[38px] font-black tracking-tight mb-3" style={{ color: 'var(--foreground)' }}>
            {T.hero.title}
          </h1>
          <p className="text-[15px] max-w-lg mx-auto" style={{ color: 'var(--muted)' }}>{T.hero.subtitle}</p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
            {[false, true].map((annual) => (
              <button key={String(annual)}
                onClick={() => setBillingAnnual(annual)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                style={billingAnnual === annual
                  ? { background: 'hsl(239 68% 58%)', color: '#fff', boxShadow: '0 2px 12px hsl(239 68% 58% / 0.35)' }
                  : { color: 'var(--muted)' }
                }>
                {annual ? T.toggle.annual : T.toggle.monthly}
                {annual && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                    style={{ background: billingAnnual ? 'hsl(158 64% 44% / 0.25)' : 'hsl(158 64% 44% / 0.15)', color: 'hsl(158 64% 44%)' }}>
                    {T.toggle.saveBadge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Plan cards ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[480px] rounded-3xl animate-pulse" style={{ background: 'var(--surface)' }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visiblePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isActive={myPlan?.id === plan.id}
                billingAnnual={billingAnnual}
                onSelect={setSelectedPlan}
              />
            ))}
          </div>
        )}

        {/* ── Trust badges ── */}
        <div className="mt-10 flex flex-wrap justify-center gap-6">
          {[
            { icon: 'lock', label: 'Thanh toán bảo mật SSL' },
            { icon: 'cancel', label: 'Hủy bất cứ lúc nào' },
            { icon: 'support_agent', label: 'Hỗ trợ 24/7' },
            { icon: 'verified', label: 'Đảm bảo hoàn tiền 7 ngày' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'hsl(158 64% 44%)' }}>{icon}</span>
              <span className="text-[12px]" style={{ color: 'var(--muted)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div className="mt-20">
          <h2 className="text-[26px] font-bold text-center mb-8" style={{ color: 'var(--foreground)' }}>
            {T.faq.title}
          </h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {T.faq.items.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

        {/* ── CTA bottom ── */}
        <div className="mt-16 text-center p-10 rounded-3xl"
          style={{ background: 'linear-gradient(135deg, hsl(239 68% 58% / 0.08), hsl(263 70% 62% / 0.06))', border: '1px solid hsl(239 68% 58% / 0.15)' }}>
          <h2 className="text-[24px] font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Sẵn sàng học thông minh hơn?
          </h2>
          <p className="text-[14px] mb-6" style={{ color: 'var(--muted)' }}>
            Hàng nghìn học sinh đã nâng cấp điểm số của họ với AI Tutor Pro.
          </p>
          <button
            onClick={() => {
              const pro = plans.find((p) => p.name === (billingAnnual ? 'pro_annual' : 'pro_monthly'));
              if (pro) setSelectedPlan(pro);
            }}
            className="px-8 py-3.5 rounded-2xl text-white font-bold text-[14px] transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,hsl(239 68% 58%),hsl(263 70% 62%))', boxShadow: '0 4px 24px hsl(239 68% 58% / 0.35)' }}
          >
            Bắt đầu dùng Pro ngay
          </button>
        </div>
      </div>

      {/* ── Payment Modal ── */}
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
