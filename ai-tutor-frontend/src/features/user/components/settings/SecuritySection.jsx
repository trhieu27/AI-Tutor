import { useState } from "react";
import { SETTINGS_PAGE_TEXTS } from "@/shared/constants/texts";
import { authFetch } from "@/shared/services/api.service";
import { safeJson } from "@/shared/utils/httpUtils";
import { Msg, InlineLoading } from "./SettingsShared";

const API = "/api/v1";
const TEXTS = SETTINGS_PAGE_TEXTS;

/** Đánh giá độ mạnh mật khẩu */
function getPasswordStrength(p) {
  if (!p) return {
    label: "",
    color: "",
    width: "w-0"
  };
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return {
    label: TEXTS.security.strength.weak,
    color: "bg-[hsl(4_72%_52%)]",
    width: "w-1/4"
  };
  if (score <= 2) return {
    label: TEXTS.security.strength.medium,
    color: "bg-[hsl(38_92%_50%)]",
    width: "w-2/4"
  };
  if (score <= 3) return {
    label: TEXTS.security.strength.fair,
    color: "bg-[hsl(38_80%_42%)]",
    width: "w-3/4"
  };
  return {
    label: TEXTS.security.strength.strong,
    color: "bg-[hsl(158_64%_44%)]",
    width: "w-full"
  };
}

/** Đổi mật khẩu và hiển thị chỉ báo độ mạnh */
export default function SecuritySection() {
  const [form, setForm] = useState({
    current: "",
    newPw: "",
    confirm: ""
  });
  const [show, setShow] = useState({
    current: false,
    newPw: false,
    confirm: false
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const strength = getPasswordStrength(form.newPw);
  const save = async () => {
    if (form.newPw !== form.confirm) {
      setMsg({
        type: "err",
        text: TEXTS.security.changePassword.errors.mismatch
      });
      return;
    }
    if (form.newPw.length < 8) {
      setMsg({
        type: "err",
        text: TEXTS.security.changePassword.errors.tooShort
      });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await authFetch(`${API}/users/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          current_password: form.current,
          new_password: form.newPw,
          confirm_password: form.confirm
        })
      });
      if (!res.ok) throw new Error((await safeJson(res, {})).detail || "Password change failed");
      setMsg({
        type: "ok",
        text: TEXTS.security.changePassword.success
      });
      setForm({
        current: "",
        newPw: "",
        confirm: ""
      });
    } catch (e) {
      setMsg({
        type: "err",
        text: e.message
      });
    } finally {
      setSaving(false);
    }
  };
  const FIELDS = [{
    k: "current",
    label: TEXTS.security.changePassword.current
  }, {
    k: "newPw",
    label: TEXTS.security.changePassword.newPw
  }, {
    k: "confirm",
    label: TEXTS.security.changePassword.confirm
  }];
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[22px] font-semibold text-[var(--foreground)] tracking-tight">
          {TEXTS.security.title}
        </h2>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">
          {TEXTS.security.subtitle}
        </p>
      </div>
      <div className="p-6 rounded-lg bg-[var(--surface)] border border-[var(--border-color)] space-y-4">
        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
          {TEXTS.security.changePassword.title}
        </h3>
        {FIELDS.map(({
          k,
          label
        }) => (
          <div key={k}>
            <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1.5">
              {label}
            </label>
            <div className="relative">
              <input
                type={show[k] ? "text" : "password"}
                value={form[k]}
                onChange={e => setForm(prevState => ({
                  ...prevState,
                  [k]: e.target.value
                }))}
                autoComplete={k === "current" ? "current-password" : "new-password"}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[hsl(166_61%_35%/0.30)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShow(prevState => ({
                  ...prevState,
                  [k]: !prevState[k]
                }))}
                className="absolute right-0 top-0 h-full flex items-center px-3 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <span
                  className="material-symbols-outlined leading-none"
                  style={{ fontSize: 18 }}
                >
                  {show[k] ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {k === "newPw" && form.newPw && (
              <div className="mt-2 space-y-1">
                <div className="h-1 w-full rounded-full bg-[var(--border-color)] overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${strength.color} ${strength.width}`} />
                </div>
                <p className="text-[10px] font-semibold text-[var(--muted)]">
                  {strength.label}
                </p>
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={save}
            disabled={saving || !form.current || !form.newPw || !form.confirm}
            className="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-[13px] font-semibold hover:bg-[var(--brand-primary-strong)] active:scale-95 transition-all disabled:opacity-40"
          >
            {saving ? <InlineLoading label={TEXTS.security.changePassword.submitting} /> : TEXTS.security.changePassword.submit}
          </button>
          <Msg msg={msg} />
        </div>
      </div>
    </div>
  );
}
