import { useState, useEffect } from "react";
import { SETTINGS_WORKSPACE_TEXTS } from "@/shared/constants/texts";
import { authFetch } from "@/shared/services/api.service";
import { safeJson } from "@/shared/utils/httpUtils";
import { Msg, InlineLoading } from "./SettingsShared";

const API = "/api/v1";
const WORKSPACE_TEXTS = SETTINGS_WORKSPACE_TEXTS;

/** Toggle switch — chỉ dùng trong PreferencesSection */
const Toggle = ({
  on,
  onToggle
}) => (
  <button
    onClick={onToggle}
    className={`relative w-10 h-6 rounded-full transition-all duration-200 border ${on ? "bg-[var(--brand-primary)] border-[var(--brand-primary-strong)]" : "bg-[var(--surface)] border-[var(--border-color)]"}`}
  >
    <span
      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${on ? "left-[18px]" : "left-0.5"}`}
    />
  </button>
);

/** Cài đặt thông báo email và mức chi tiết phản hồi AI */
export default function PreferencesSection({
  profile,
  onRefresh
}) {
  const prefs = profile.preferences ?? {
    email_notifications: true,
    ai_response_detail: "balanced"
  };
  const [emailNotif, setEmailNotif] = useState(prefs.email_notifications);
  const [aiDetail, setAiDetail] = useState(prefs.ai_response_detail);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    setEmailNotif(prefs.email_notifications);
    setAiDetail(prefs.ai_response_detail);
  }, [prefs.email_notifications, prefs.ai_response_detail]);
  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await authFetch(`${API}/users/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email_notifications: emailNotif,
          ai_response_detail: aiDetail
        })
      });
      if (!res.ok) throw new Error((await safeJson(res, {})).detail || "Preferences save failed");
      setMsg({
        type: "ok",
        text: WORKSPACE_TEXTS.passwordSaved
      });
      onRefresh();
    } catch (e) {
      setMsg({
        type: "err",
        text: e.message
      });
    } finally {
      setSaving(false);
    }
  };
  const AI_OPTS = WORKSPACE_TEXTS.preferences.options;
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[22px] font-semibold text-[var(--foreground)] tracking-tight">
          {WORKSPACE_TEXTS.preferences.title}
        </h2>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">
          {WORKSPACE_TEXTS.preferences.subtitle}
        </p>
      </div>
      <div className="space-y-4">
        <div className="p-5 rounded-lg bg-[var(--surface)] border border-[var(--border-color)] space-y-4">
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
            {WORKSPACE_TEXTS.preferences.notificationsTitle}
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[var(--foreground)]">
                {WORKSPACE_TEXTS.preferences.emailNotifications}
              </p>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                {WORKSPACE_TEXTS.preferences.emailNotificationsDesc}
              </p>
            </div>
            <Toggle
              on={emailNotif}
              onToggle={() => setEmailNotif(prevState => !prevState)}
            />
          </div>
        </div>
        <div className="p-5 rounded-lg bg-[var(--surface)] border border-[var(--border-color)] space-y-3">
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
            {WORKSPACE_TEXTS.preferences.detailTitle}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {AI_OPTS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setAiDetail(opt.id)}
                className={`p-3 rounded-lg border text-left transition-all ${aiDetail === opt.id ? "border-[var(--brand-primary)] bg-[hsl(166_61%_35%/0.06)]" : "border-[var(--border-color)] hover:border-[var(--border-emphasis)]"}`}
              >
                <p className={`text-[11px] font-semibold ${aiDetail === opt.id ? "text-[var(--brand-primary)]" : "text-[var(--foreground)]"}`}>
                  {opt.label}
                </p>
                <p className="text-[10px] text-[var(--muted)] mt-0.5 leading-relaxed">
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-[13px] font-semibold hover:bg-[var(--brand-primary-strong)] active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? <InlineLoading label={WORKSPACE_TEXTS.preferences.saving} /> : WORKSPACE_TEXTS.preferences.save}
        </button>
        <Msg msg={msg} />
      </div>
    </div>
  );
}
