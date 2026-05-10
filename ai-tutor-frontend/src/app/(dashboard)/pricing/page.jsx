import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/services/api.service';
import { PRICING_PAGE_TEXTS as T } from '@/constants/texts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1';
const fmt = (n) => n === 0 ? '0đ' : new Intl.NumberFormat('vi-VN').format(n) + 'đ';

/* ── Payment Modal ── */
function PaymentModal({ plan, onClose, onSuccess }) {
  const P = T.payment;
  const [method, setMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const price = plan.discounted_price_vnd;

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
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const METHODS = [
    { id: 'momo',  label: 'Ví MoMo',   color: '#A50064', icon: 'account_balance_wallet' },
    { id: 'vnpay', label: 'VNPay QR',  color: '#1a3f6f', icon: 'qr_code_2' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        style={{ background: 'var(--background)', border: '1px solid var(--border-color)' }}>
        {done ? (
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{ background: 'hsl(158 64% 44% / 0.12)' }}>🎉</div>
            <h2 className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>{P.successTitle}</h2>
            <p className="text-[14px]" style={{ color: 'var(--muted)' }}>{P.successMsg(plan.display_name)}</p>
            <button onClick={() => { onSuccess(); onClose(); }}
              className="mt-2 px-8 py-3 rounded-2xl text-white font-bold text-[14px] transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg,hsl(239 68% 58%),hsl(263 70% 62%))' }}>
              {P.successBtn}
            </button>
          </div>
        ) : (
          <>
            <div className="px-7 pt-6 pb-5 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 className="text-[18px] font-bold" style={{ color: 'var(--foreground)' }}>{P.title}</h2>
                <p className="text-[13px] mt-0.5" style={{ color: 'var(--muted)' }}>{P.subtitle(plan.display_name)}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-70"
                style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="px-7 py-5 space-y-4">
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
                <div className="flex justify-between text-[15px] font-bold pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--foreground)' }}>{P.total}</span>
                  <span style={{ color: 'hsl(239 68% 58%)' }}>{fmt(price)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{P.method.title}</p>
                {METHODS.map((m) => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                    style={{ border: `1.5px solid ${method === m.id ? m.color : 'var(--border-color)'}`, background: method === m.id ? `${m.color}15` : 'transparent' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: m.color }}>{m.icon}</span>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--foreground)' }}>{m.label}</span>
                    {method === m.id && <span className="ml-auto material-symbols-outlined text-[16px]" style={{ color: m.color }}>check_circle</span>}
                  </button>
                ))}
              </div>
              {err && <p className="text-[12px] font-semibold" style={{ color: 'hsl(343 72% 48%)' }}>{err}</p>}

              <div className="flex gap-3 pt-1">
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

/* ── Plan Card ── */
function PlanCard({ plan, isActive, onSelect }) {
  const texts = T.plans[plan.name] || {};
  const isPopular = plan.is_popular;
  const isFree = plan.price_vnd === 0;

  return (
    <div className="relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        border: isPopular ? '2px solid hsl(239 68% 58%)' : '1px solid var(--border-color)',
        background: isPopular
          ? 'linear-gradient(160deg, hsl(239 68% 58% / 0.07) 0%, hsl(263 70% 62% / 0.04) 100%)'
          : 'var(--surface)',
        boxShadow: isPopular ? '0 12px 40px hsl(239 68% 58% / 0.18)' : '0 2px 12px rgba(0,0,0,0.05)',
      }}>
      {isPopular && (
        <div className="absolute -top-px left-0 right-0 flex justify-center">
          <span className="px-4 py-1 rounded-b-xl text-[11px] font-bold text-white"
            style={{ background: 'linear-gradient(90deg, hsl(239 68% 58%), hsl(263 70% 62%))' }}>
            {texts.popularBadge || 'Phổ biến nhất'}
          </span>
        </div>
      )}

      <div className="p-7 flex flex-col flex-1" style={{ paddingTop: isPopular ? '2.5rem' : '1.75rem' }}>
        {/* Header */}
        <div className="mb-5">
          <h3 className="text-[19px] font-bold mb-1" style={{ color: isPopular ? 'hsl(239 68% 58%)' : 'var(--foreground)' }}>
            {plan.display_name}
          </h3>
        </div>


        {/* Price */}
        <div className="mb-6">
          {isFree ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[40px] font-black leading-none" style={{ color: 'var(--foreground)' }}>₫0</span>
              <span className="text-[12px]" style={{ color: 'var(--muted)' }}>VND /tháng</span>
            </div>
          ) : (
            <>
              {plan.discount_percent > 0 && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="line-through text-[13px]" style={{ color: 'var(--muted)' }}>
                    {fmt(plan.price_vnd)}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white"
                    style={{ background: 'hsl(343 85% 58%)' }}>-{plan.discount_percent}%</span>
                </div>
              )}
              <div className="flex items-baseline gap-1.5">
                <span className="text-[40px] font-black leading-none" style={{ color: 'var(--foreground)' }}>
                  {fmt(plan.discounted_price_vnd)}
                </span>
                <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
                  VND/{plan.billing_cycle === 'annual' ? 'năm' : 'tháng'}
                </span>
              </div>
              {plan.billing_cycle === 'annual' && plan.discount_percent > 0 && (
                <p className="text-[11px] mt-1" style={{ color: 'hsl(158 64% 44%)' }}>
                  Tiết kiệm {plan.discount_percent}% so với tháng
                </p>
              )}
            </>
          )}
        </div>

        {/* CTA */}
        {isActive ? (
          <div className="flex items-center justify-center gap-2 py-3 rounded-2xl mb-6"
            style={{ background: 'hsl(158 64% 44% / 0.10)', border: '1px solid hsl(158 64% 44% / 0.25)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'hsl(158 64% 44%)' }}>verified</span>
            <span className="text-[13px] font-bold" style={{ color: 'hsl(158 64% 44%)' }}>Gói hiện tại của bạn</span>
          </div>
        ) : (
          <button onClick={() => onSelect(plan)}
            className="w-full py-3 rounded-2xl text-[13px] font-bold transition-all hover:opacity-90 active:scale-[0.98] mb-6"
            style={isPopular
              ? { background: 'linear-gradient(135deg,hsl(239 68% 58%),hsl(263 70% 62%))', color: '#fff', boxShadow: '0 4px 20px hsl(239 68% 58% / 0.35)' }
              : { background: 'var(--background)', color: 'var(--foreground)', border: '1.5px solid var(--border-color)' }}>
            {isFree ? 'Dùng miễn phí' : texts.cta || 'Đăng ký ngay'}
          </button>
        )}

        {/* Features — exclude Hỗ trợ, Lịch sử hội thoại, Ưu tiên xử lý */}
        <ul className="space-y-3 flex-1">
          {(plan.features || [])
            .filter(f => !['hỗ trợ', 'lịch sử', 'ưu tiên'].some(kw => f.text?.toLowerCase().includes(kw)))
            .map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="material-symbols-outlined flex-shrink-0 mt-0.5"
                style={{ fontSize: 16, color: f.included ? 'hsl(158 64% 44%)' : 'var(--muted)' }}>
                {f.included ? 'check_circle' : 'remove_circle'}
              </span>
              <span className="text-[12.5px]" style={{ color: f.included ? 'var(--foreground)' : 'var(--muted)' }}>
                {f.text}
                {f.limit && <span className="ml-1 text-[11px]" style={{ color: 'var(--muted)' }}>· {f.limit}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


/* ── Main Page ── */

export default function PricingPage() {
  const { user, updateUser } = useAuth();
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
      if (myRes.ok) { const d = await myRes.json(); setMyPlan(d.plan); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visiblePlans = plans.filter(p => {
    if (p.name === 'free') return true;
    return billingAnnual ? p.billing_cycle === 'annual' : p.billing_cycle === 'monthly';
  });

  const handleSuccess = () => {
    updateUser({ is_pro: true, isPro: true });
    load();
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>

      {/* ── Close button ── */}
      <button onClick={() => navigate(-1)}
        className="fixed top-4 right-4 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
        style={{ border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--muted)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
      </button>

      <div className="max-w-5xl mx-auto px-6 py-14">

        {/* ── Hero ── */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4"
            style={{ background: 'hsl(239 68% 58% / 0.10)', color: 'hsl(239 55% 50%)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>diamond</span>
            Bảng giá
          </span>
          <h1 className="text-[38px] font-black tracking-tight mb-3" style={{ color: 'var(--foreground)' }}>
            Nâng cấp gói của bạn
          </h1>


          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
            {[false, true].map((annual) => (
              <button key={String(annual)} onClick={() => setBillingAnnual(annual)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                style={billingAnnual === annual
                  ? { background: 'hsl(239 68% 58%)', color: '#fff', boxShadow: '0 2px 12px hsl(239 68% 58% / 0.35)' }
                  : { color: 'var(--muted)' }}>
                {annual ? 'Hàng năm' : 'Hàng tháng'}
                {annual && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                    style={{ background: 'hsl(158 64% 44% / 0.20)', color: 'hsl(158 64% 44%)' }}>
                    Tiết kiệm 40%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Plan cards ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[440px] rounded-3xl animate-pulse" style={{ background: 'var(--surface)' }} />
            ))}
          </div>
        ) : visiblePlans.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
            <span className="material-symbols-outlined text-[48px] mb-4 block">info</span>
            <p>Không có gói nào khả dụng.</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${visiblePlans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-3'}`}>
            {visiblePlans.map(plan => (
              <PlanCard key={plan.id} plan={plan}
                isActive={myPlan?.id === plan.id}
                onSelect={setSelectedPlan} />
            ))}
          </div>
        )}
      </div>

      {selectedPlan && (
        <PaymentModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}
