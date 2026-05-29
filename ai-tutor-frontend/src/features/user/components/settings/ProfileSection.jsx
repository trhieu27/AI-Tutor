import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { SETTINGS_PAGE_TEXTS } from "@/shared/constants/texts";
import { authFetch } from "@/shared/services/api.service";
import { safeJson } from "@/shared/utils/httpUtils";
import { Msg, InlineLoading } from "./SettingsShared";

const API = "/api/v1";
const TEXTS = SETTINGS_PAGE_TEXTS;

/** Chỉnh sửa hồ sơ cá nhân (tên, ID, email, bio) */
export default function ProfileSection({
  profile,
  onRefresh
}) {
  const {
    updateUser
  } = useAuth();
  const [name, setName] = useState(profile.full_name);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    setName(profile.full_name);
  }, [profile.full_name]);
  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await authFetch(`${API}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          full_name: name.trim()
        })
      });
      if (!res.ok) throw new Error((await safeJson(res, {})).detail || "Profile save failed");
      // Cập nhật Header ngay lập tức
      updateUser({
        full_name: name.trim()
      });
      setMsg({
        type: "ok",
        text: TEXTS.profile.success
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
  const fieldCls = "w-full px-3.5 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[hsl(166_61%_35%/0.30)] transition-all";
  const disabledCls = "w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[13px] text-[var(--muted)] cursor-not-allowed";
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[22px] font-semibold text-[var(--foreground)] tracking-tight">
          {TEXTS.profile.title}
        </h2>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">
          {TEXTS.profile.subtitle}
        </p>
      </div>
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-[var(--foreground)] flex items-center justify-center text-[var(--background)] text-xl font-bold shadow-[var(--premium-shadow-sm)]">
          {profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "?"}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[var(--foreground)]">
            {profile.full_name}
          </p>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">
            {profile.email}
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1.5">
            {TEXTS.profile.fields.fullName}
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className={fieldCls}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1.5">
            {TEXTS.profile.fields.studentId}
          </label>
          <input
            value={profile.student_id}
            disabled={true}
            className={disabledCls}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1.5">
            {TEXTS.profile.fields.email}
          </label>
          <input
            value={profile.email}
            disabled={true}
            className={disabledCls}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-[13px] font-semibold hover:bg-[var(--brand-primary-strong)] active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? <InlineLoading label={TEXTS.profile.saving} /> : TEXTS.profile.save}
        </button>
        <Msg msg={msg} />
      </div>
    </div>
  );
}
