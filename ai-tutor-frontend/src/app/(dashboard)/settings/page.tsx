"use client";

import { useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";
import { SETTINGS_PAGE_TEXTS as T, QUOTA_TEXTS } from "@/constants/texts";

/* ── Types ────────────────────────────────────────────────────────────────── */
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  student_id: string;
  bio?: string;
  is_pro?: boolean;
  preferences?: { email_notifications: boolean; ai_response_detail: string };
  created_at?: string;
}

interface Session {
  id: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  last_active: string;
}
import { authFetch } from "@/services/api.service";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api/v1";


/* ── Utilities ────────────────────────────────────────────────────────────── */
function parseUA(ua: string) {
  let browser = "Trình duyệt không rõ", os = "Hệ điều hành không rõ";
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Edg/i.test(ua)) browser = "Edge";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  return { browser, os };
}

function getPasswordStrength(p: string): { label: string; color: string; width: string } {
  if (!p) return { label: "", color: "", width: "w-0" };
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { label: "Yếu", color: "bg-[hsl(343_85%_58%)]", width: "w-1/4" };
  if (score <= 2) return { label: "Trung bình", color: "bg-[hsl(38_92%_50%)]", width: "w-2/4" };
  if (score <= 3) return { label: "Khá", color: "bg-[hsl(38_80%_42%)]", width: "w-3/4" };
  return { label: "Mạnh", color: "bg-[hsl(158_64%_44%)]", width: "w-full" };
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
const Skeleton = ({ cls = "" }: { cls?: string }) => (
  <div className={`rounded-xl bg-[var(--surface)] animate-pulse ${cls}`} />
);

/* ── Toggle ───────────────────────────────────────────────────────────────── */
const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className={`relative w-10 h-6 rounded-full transition-all duration-200 border ${
      on ? "bg-[hsl(239_68%_58%)] border-[hsl(239_55%_50%)]" : "bg-[var(--surface)] border-[var(--border-color)]"
    }`}
  >
    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${on ? "left-[18px]" : "left-0.5"}`} />
  </button>
);

/* ── Message toast ────────────────────────────────────────────────────────── */
const Msg = ({ msg }: { msg: { type: "ok" | "err"; text: string } | null }) =>
  msg ? (
    <span className={`text-[12px] font-semibold ${msg.type === "ok" ? "text-[hsl(158_64%_44%)]" : "text-[hsl(343_72%_48%)]"}`}>
      {msg.text}
    </span>
  ) : null;

/* ══════════════════════════════════════════════════════════════════════════ */
/*  PROFILE SECTION                                                           */
/* ══════════════════════════════════════════════════════════════════════════ */
function ProfileSection({ profile, onRefresh }: { profile: UserProfile; onRefresh: () => void }) {
  const { updateUser } = useAuth();
  const [name, setName] = useState(profile.full_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await authFetch(`${API}/users/profile`, {
        method: "PUT",
        body: JSON.stringify({ full_name: name.trim(), bio: bio.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      // Cập nhật Header ngay lập tức
      updateUser({ full_name: name.trim() });
      setMsg({ type: "ok", text: T.profile.success });
      onRefresh();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally { setSaving(false); }
  };

  const fieldCls = "w-full px-3.5 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[hsl(239_68%_58%/0.30)] transition-all";
  const disabledCls = "w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[13px] text-[var(--muted)] cursor-not-allowed";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-[22px] font-semibold text-[var(--foreground)] tracking-tight">{T.profile.title}</h2>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">{T.profile.subtitle}</p>
      </div>

      {/* Avatar — initial letter */}
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] flex items-center justify-center text-white text-2xl font-bold shadow-[0_4px_16px_hsl(239_68%_58%/0.30)]">
          {profile.full_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[var(--foreground)]">{profile.full_name}</p>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">{profile.email}</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4 max-w-sm">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">{T.profile.fields.fullName}</label>
          <input value={name} onChange={e => setName(e.target.value)} className={fieldCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">{T.profile.fields.studentId}</label>
          <input value={profile.student_id} disabled className={disabledCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">{T.profile.fields.email}</label>
          <input value={profile.email} disabled className={disabledCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">{T.profile.fields.bio}</label>
          <textarea
            value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={300}
            placeholder={T.profile.fields.bioPlaceholder}
            className={`${fieldCls} resize-none`}
          />
          <p className="text-[10px] text-[var(--muted)] text-right mt-0.5">{T.profile.fields.bioMaxChars(bio.length, 300)}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={save} disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[hsl(239_68%_58%)] text-white text-[13px] font-semibold hover:bg-[hsl(239_55%_50%)] active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? T.profile.saving : T.profile.save}
        </button>
        <Msg msg={msg} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  SECURITY SECTION                                                          */
/* ══════════════════════════════════════════════════════════════════════════ */
function SecuritySection() {
  const [form, setForm] = useState({ current: "", newPw: "", confirm: "" });
  const [show, setShow] = useState({ current: false, newPw: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const strength = getPasswordStrength(form.newPw);

  const save = async () => {
    if (form.newPw !== form.confirm) { setMsg({ type: "err", text: T.security.changePassword.errors.mismatch }); return; }
    if (form.newPw.length < 8) { setMsg({ type: "err", text: T.security.changePassword.errors.tooShort }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await authFetch(`${API}/users/password`, {
        method: "PUT",
        body: JSON.stringify({ current_password: form.current, new_password: form.newPw, confirm_password: form.confirm }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setMsg({ type: "ok", text: T.security.changePassword.success });
      setForm({ current: "", newPw: "", confirm: "" });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally { setSaving(false); }
  };

  const FIELDS = [
    { k: "current" as const, label: T.security.changePassword.current },
    { k: "newPw"   as const, label: T.security.changePassword.newPw },
    { k: "confirm" as const, label: T.security.changePassword.confirm },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-[22px] font-semibold text-[var(--foreground)] tracking-tight">{T.security.title}</h2>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">{T.security.subtitle}</p>
      </div>

      <div className="max-w-sm p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] space-y-4">
        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">{T.security.changePassword.title}</h3>
        {FIELDS.map(({ k, label }) => (
          <div key={k}>
            <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">{label}</label>
            <div className="relative">
              <input
                type={show[k] ? "text" : "password"}
                value={form[k]}
                onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[hsl(239_68%_58%/0.30)] transition-all"
              />
              <button type="button" onClick={() => setShow(p => ({ ...p, [k]: !p[k] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{show[k] ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
            {k === "newPw" && form.newPw && (
              <div className="mt-2 space-y-1">
                <div className="h-1 w-full rounded-full bg-[var(--border-color)] overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${strength.color} ${strength.width}`} />
                </div>
                <p className="text-[10px] font-semibold text-[var(--muted)]">{strength.label}</p>
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={save} disabled={saving || !form.current || !form.newPw || !form.confirm}
            className="px-5 py-2.5 rounded-xl bg-[hsl(239_68%_58%)] text-white text-[13px] font-semibold hover:bg-[hsl(239_55%_50%)] active:scale-95 transition-all disabled:opacity-40"
          >
            {saving ? T.security.changePassword.submitting : T.security.changePassword.submit}
          </button>
          <Msg msg={msg} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  SESSIONS SECTION                                                          */
/* ══════════════════════════════════════════════════════════════════════════ */
function SessionsSection() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/users/sessions`);
      if (res.ok) setSessions(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = async (id: string) => {
    setRevoking(id);
    try {
      await authFetch(`${API}/users/sessions/${id}`, { method: "DELETE" });
      setSessions(p => p.filter(s => s.id !== id));
    } finally { setRevoking(null); }
  };

  const revokeAll = async () => {
    await authFetch(`${API}/users/sessions`, { method: "DELETE" });
    setSessions([]);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[22px] font-semibold text-[var(--foreground)] tracking-tight">Phiên đăng nhập</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">Các thiết bị đang đăng nhập vào tài khoản</p>
        </div>
        {sessions.length > 1 && (
          <button onClick={revokeAll}
            className="shrink-0 px-4 py-2 rounded-xl text-[12px] font-semibold text-[hsl(343_72%_48%)] border border-[hsl(343_85%_58%/0.25)] hover:bg-[hsl(343_85%_58%/0.06)] active:scale-95 transition-all">
            Đăng xuất tất cả
          </button>
        )}
      </div>

      <div className="space-y-3">
        {loading
          ? [1, 2].map(i => <Skeleton key={i} cls="h-[72px]" />)
          : sessions.length === 0
            ? <div className="py-12 text-center text-[13px] text-[var(--muted)]">Chưa có phiên đăng nhập nào được ghi lại</div>
            : sessions.map(s => {
                const { browser, os } = parseUA(s.user_agent);
                const isMobile = /mobile|android|iphone|ipad/i.test(s.user_agent);
                const when = new Date(s.last_active).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
                return (
                  <div key={s.id} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] group transition-all hover:border-[hsl(239_68%_58%/0.25)]">
                    <div className="w-10 h-10 rounded-xl bg-[var(--card-bg)] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[var(--muted)]" style={{ fontSize: 20 }}>
                        {isMobile ? "smartphone" : "computer"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--foreground)]">{browser} · {os}</p>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">{s.ip_address || "IP không xác định"} · Lần cuối: {when}</p>
                    </div>
                    <button
                      onClick={() => revoke(s.id)} disabled={revoking === s.id}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--muted)] border border-[var(--border-color)] opacity-0 group-hover:opacity-100 hover:text-[hsl(343_72%_48%)] hover:border-[hsl(343_85%_58%/0.30)] active:scale-95 transition-all disabled:opacity-40"
                    >
                      {revoking === s.id ? "..." : "Thu hồi"}
                    </button>
                  </div>
                );
              })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  APPEARANCE SECTION                                                        */
/* ══════════════════════════════════════════════════════════════════════════ */
function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const cur = mounted ? theme : "dark";
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-[22px] font-semibold text-[var(--foreground)] tracking-tight">{T.appearance.title}</h2>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">{T.appearance.subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-xs">
        {[T.appearance.light, T.appearance.dark].map(t => (
          <button key={t.id} onClick={() => setTheme(t.id)}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${cur === t.id ? "border-[hsl(239_68%_58%)] bg-[hsl(239_68%_58%/0.06)]" : "border-[var(--border-color)] hover:border-[hsl(239_68%_58%/0.40)]"}`}>
            <span className={`material-symbols-outlined text-[24px] ${cur === t.id ? "text-[hsl(239_55%_50%)]" : "text-[var(--muted)]"}`}>{t.icon}</span>
            <p className={`text-[12px] font-semibold ${cur === t.id ? "text-[hsl(239_55%_50%)]" : "text-[var(--foreground)]"}`}>{t.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  PREFERENCES SECTION                                                       */
/* ══════════════════════════════════════════════════════════════════════════ */
function PreferencesSection({ profile, onRefresh }: { profile: UserProfile; onRefresh: () => void }) {
  const prefs = profile.preferences ?? { email_notifications: true, ai_response_detail: "balanced" };
  const [emailNotif, setEmailNotif] = useState(prefs.email_notifications);
  const [aiDetail, setAiDetail] = useState(prefs.ai_response_detail);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await authFetch(`${API}/users/preferences`, {
        method: "PUT",
        body: JSON.stringify({ email_notifications: emailNotif, ai_response_detail: aiDetail }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setMsg({ type: "ok", text: "Đã lưu cài đặt" });
      onRefresh();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally { setSaving(false); }
  };

  const AI_OPTS = [
    { id: "concise",  label: "Ngắn gọn",  desc: "Súc tích, trọng tâm" },
    { id: "balanced", label: "Cân bằng",  desc: "Đủ chi tiết, rõ ràng" },
    { id: "detailed", label: "Chi tiết",  desc: "Giải thích sâu, nhiều ví dụ" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-[22px] font-semibold text-[var(--foreground)] tracking-tight">Tùy chỉnh</h2>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">Cá nhân hóa trải nghiệm AI Tutor</p>
      </div>

      <div className="max-w-sm space-y-4">
        {/* Notification toggle */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] space-y-4">
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Thông báo</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[var(--foreground)]">Thông báo Email</p>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">Tin tức về tài liệu và tiến trình học</p>
            </div>
            <Toggle on={emailNotif} onToggle={() => setEmailNotif(p => !p)} />
          </div>
        </div>

        {/* AI detail level */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] space-y-3">
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Mức độ chi tiết AI</h3>
          <div className="grid grid-cols-3 gap-2">
            {AI_OPTS.map(opt => (
              <button key={opt.id} onClick={() => setAiDetail(opt.id)}
                className={`p-3 rounded-xl border text-left transition-all ${aiDetail === opt.id ? "border-[hsl(239_68%_58%)] bg-[hsl(239_68%_58%/0.06)]" : "border-[var(--border-color)] hover:border-[hsl(239_68%_58%/0.30)]"}`}>
                <p className={`text-[11px] font-semibold ${aiDetail === opt.id ? "text-[hsl(239_55%_50%)]" : "text-[var(--foreground)]"}`}>{opt.label}</p>
                <p className="text-[10px] text-[var(--muted)] mt-0.5 leading-relaxed">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={save} disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[hsl(239_68%_58%)] text-white text-[13px] font-semibold hover:bg-[hsl(239_55%_50%)] active:scale-95 transition-all disabled:opacity-50">
          {saving ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
        <Msg msg={msg} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  UPGRADE SECTION                                                           */
/* ══════════════════════════════════════════════════════════════════════════ */
function UpgradeSection({ profile, onRefresh }: { profile: UserProfile; onRefresh: () => void }) {
  const { updateUser } = useAuth();
  const [activating, setActivating] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const isPro = profile.is_pro;
  const U = QUOTA_TEXTS.upgrade;

  const handleUpgrade = async () => {
    setActivating(true); setMsg(null);
    try {
      const res = await authFetch(`${API}/users/upgrade-pro`, { method: "PUT" });
      if (!res.ok) throw new Error((await res.json()).detail);
      updateUser({ isPro: true });
      setMsg({ type: "ok", text: U.successMsg });
      onRefresh();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally { setActivating(false); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-[22px] font-semibold text-[var(--foreground)] tracking-tight">{U.title}</h2>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">{U.subtitle}</p>
      </div>

      {/* Current plan badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-color)]">
        <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">{U.currentPlan}:</span>
        {isPro ? (
          <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white text-[11px] font-bold">{U.proPlan}</span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-lg bg-[var(--border-color)] text-[var(--foreground)] text-[11px] font-bold">{U.freePlan}</span>
        )}
      </div>

      {/* Feature comparison */}
      <div className="max-w-md">
        <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 gap-0 bg-[var(--surface)] border-b border-[var(--border-color)]">
            <div className="px-4 py-3 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Tính năng</div>
            <div className="px-4 py-3 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-center">{U.freePlan}</div>
            <div className="px-4 py-3 text-[11px] font-bold text-[hsl(239_55%_50%)] uppercase tracking-wider text-center">{U.proPlan}</div>
          </div>
          {/* Rows */}
          {U.features.map((f, i) => (
            <div key={i} className="grid grid-cols-3 gap-0 border-b border-[var(--border-color)] last:border-0">
              <div className="px-4 py-3.5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">{f.icon}</span>
                <span className="text-[12px] font-medium text-[var(--foreground)]">{f.text}</span>
              </div>
              <div className="px-4 py-3.5 text-center text-[12px] text-[var(--muted)] font-medium flex items-center justify-center">{f.free}</div>
              <div className="px-4 py-3.5 text-center text-[12px] text-[hsl(158_64%_44%)] font-semibold flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                {f.pro}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center gap-4">
        {isPro ? (
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(158_64%_44%/0.08)] border border-[hsl(158_64%_44%/0.20)]">
            <span className="material-symbols-outlined text-[16px] text-[hsl(158_64%_44%)]">verified</span>
            <span className="text-[13px] font-semibold text-[hsl(158_64%_44%)]">{U.alreadyPro}</span>
          </div>
        ) : (
          <button
            onClick={handleUpgrade} disabled={activating}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white text-[13px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_4px_16px_hsl(239_68%_58%/0.3)]"
          >
            {activating ? U.activating : U.activateBtn}
          </button>
        )}
        <Msg msg={msg} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */
const NAV = [
  { id: "profile",    label: T.nav.profile.label,    icon: T.nav.profile.icon },
  { id: "security",   label: T.nav.security.label,   icon: T.nav.security.icon },
  { id: "appearance", label: T.nav.appearance.label,  icon: T.nav.appearance.icon },
  { id: "upgrade",    label: QUOTA_TEXTS.upgrade.title, icon: "diamond" },
] as const;
type Tab = typeof NAV[number]["id"];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/users/me`);
      if (res.ok) setProfile(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-display text-[28px] font-semibold text-[var(--foreground)] tracking-tight">{T.page.title}</h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">{T.page.subtitle}</p>
        </div>

        <div className="flex gap-8 items-start">
          {/* Sidebar */}
          <aside className="w-52 shrink-0 sticky top-6">
            <nav className="space-y-1">
              {NAV.map(n => (
                <button key={n.id} onClick={() => setTab(n.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-left ${
                    tab === n.id
                      ? "bg-[hsl(239_68%_58%/0.10)] text-[hsl(239_55%_50%)] border border-[hsl(239_68%_58%/0.20)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] border border-transparent"
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{n.icon}</span>
                  {n.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content panel */}
          <div className="flex-1 min-w-0 p-7 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-[0_2px_16px_hsl(222_47%_4%/0.06)]">
            {loading ? (
              <div className="space-y-5">
                <Skeleton cls="h-7 w-44" />
                <Skeleton cls="h-4 w-60" />
                <Skeleton cls="h-20 w-20 rounded-2xl" />
                <Skeleton cls="h-10 w-full max-w-sm" />
                <Skeleton cls="h-10 w-full max-w-sm" />
              </div>
            ) : !profile ? (
              <div className="py-20 text-center text-[13px] text-[var(--muted)]">
                {T.loading.error}
              </div>
            ) : (
              <div key={tab} className="animate-dialog-enter">
                {tab === "profile"    && <ProfileSection     profile={profile} onRefresh={fetchProfile} />}
                {tab === "security"   && <SecuritySection />}
                {tab === "appearance" && <AppearanceSection />}
                {tab === "upgrade"    && <UpgradeSection profile={profile} onRefresh={fetchProfile} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
