import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SETTINGS_PAGE_TEXTS, QUOTA_TEXTS } from "@/constants/texts";


/* ── Types ────────────────────────────────────────────────────────────────── */

import { authFetch } from "@/services/api.service";
import { useTheme } from "@/components/ThemeProvider";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const API = import.meta.env.VITE_API_URL || "http://localhost:8081/api/v1";
const T = SETTINGS_PAGE_TEXTS;

/* ── Utilities ────────────────────────────────────────────────────────────── */
function parseUA(ua) {
  let browser = "Trình duyệt không rõ",
    os = "Hệ điều hành không rõ";
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome"; else if (/Firefox/i.test(ua)) browser = "Firefox"; else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari"; else if (/Edg/i.test(ua)) browser = "Edge";
  if (/Windows/i.test(ua)) os = "Windows"; else if (/Mac/i.test(ua)) os = "macOS"; else if (/Linux/i.test(ua)) os = "Linux"; else if (/Android/i.test(ua)) os = "Android"; else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  return {
    browser,
    os
  };
}
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
    label: "Yếu",
    color: "bg-[hsl(343_85%_58%)]",
    width: "w-1/4"
  };
  if (score <= 2) return {
    label: "Trung bình",
    color: "bg-[hsl(38_92%_50%)]",
    width: "w-2/4"
  };
  if (score <= 3) return {
    label: "Khá",
    color: "bg-[hsl(38_80%_42%)]",
    width: "w-3/4"
  };
  return {
    label: "Mạnh",
    color: "bg-[hsl(158_64%_44%)]",
    width: "w-full"
  };
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
const Skeleton = ({
  cls = ""
}) => /*#__PURE__*/_jsx("div", {
  className: `rounded-xl bg-[var(--surface)] animate-pulse ${cls}`
});

/* ── Toggle ───────────────────────────────────────────────────────────────── */
const Toggle = ({
  on,
  onToggle
}) => /*#__PURE__*/_jsx("button", {
  onClick: onToggle,
  className: `relative w-10 h-6 rounded-full transition-all duration-200 border ${on ? "bg-[hsl(239_68%_58%)] border-[hsl(239_55%_50%)]" : "bg-[var(--surface)] border-[var(--border-color)]"}`,
  children: /*#__PURE__*/_jsx("span", {
    className: `absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${on ? "left-[18px]" : "left-0.5"}`
  })
});

/* ── Message toast ────────────────────────────────────────────────────────── */
const Msg = ({
  msg
}) => msg ? /*#__PURE__*/_jsx("span", {
  className: `text-[12px] font-semibold ${msg.type === "ok" ? "text-[hsl(158_64%_44%)]" : "text-[hsl(343_72%_48%)]"}`,
  children: msg.text
}) : null;

/* ══════════════════════════════════════════════════════════════════════════ */
/*  PROFILE SECTION                                                           */
/* ══════════════════════════════════════════════════════════════════════════ */
function ProfileSection({
  profile,
  onRefresh
}) {
  const {
    updateUser
  } = useAuth();
  const [name, setName] = useState(profile.full_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await authFetch(`${API}/users/profile`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: name.trim(),
          bio: bio.trim()
        })
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      // Cập nhật Header ngay lập tức
      updateUser({
        full_name: name.trim()
      });
      setMsg({
        type: "ok",
        text: T.profile.success
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
  const fieldCls = "w-full px-3.5 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[hsl(239_68%_58%/0.30)] transition-all";
  const disabledCls = "w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[13px] text-[var(--muted)] cursor-not-allowed";
  return /*#__PURE__*/_jsxs("div", {
    className: "space-y-8",
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h2", {
        className: "font-display text-[22px] font-semibold text-[var(--foreground)] tracking-tight",
        children: T.profile.title
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[13px] text-[var(--muted)] mt-0.5",
        children: T.profile.subtitle
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "flex items-center gap-6",
      children: [/*#__PURE__*/_jsx("div", {
        className: "w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] flex items-center justify-center text-white text-2xl font-bold shadow-[0_4px_16px_hsl(239_68%_58%/0.30)]",
        children: profile.full_name?.[0]?.toUpperCase() ?? "?"
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("p", {
          className: "text-[13px] font-semibold text-[var(--foreground)]",
          children: profile.full_name
        }), /*#__PURE__*/_jsx("p", {
          className: "text-[11px] text-[var(--muted)] mt-0.5",
          children: profile.email
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-sm",
      children: [/*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5",
          children: T.profile.fields.fullName
        }), /*#__PURE__*/_jsx("input", {
          value: name,
          onChange: e => setName(e.target.value),
          className: fieldCls
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5",
          children: T.profile.fields.studentId
        }), /*#__PURE__*/_jsx("input", {
          value: profile.student_id,
          disabled: true,
          className: disabledCls
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5",
          children: T.profile.fields.email
        }), /*#__PURE__*/_jsx("input", {
          value: profile.email,
          disabled: true,
          className: disabledCls
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5",
          children: T.profile.fields.bio
        }), /*#__PURE__*/_jsx("textarea", {
          value: bio,
          onChange: e => setBio(e.target.value),
          rows: 3,
          maxLength: 300,
          placeholder: T.profile.fields.bioPlaceholder,
          className: `${fieldCls} resize-none`
        }), /*#__PURE__*/_jsx("p", {
          className: "text-[10px] text-[var(--muted)] text-right mt-0.5",
          children: T.profile.fields.bioMaxChars(bio.length, 300)
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "flex items-center gap-4",
      children: [/*#__PURE__*/_jsx("button", {
        onClick: save,
        disabled: saving,
        className: "px-5 py-2.5 rounded-xl bg-[hsl(239_68%_58%)] text-white text-[13px] font-semibold hover:bg-[hsl(239_55%_50%)] active:scale-95 transition-all disabled:opacity-50",
        children: saving ? T.profile.saving : T.profile.save
      }), /*#__PURE__*/_jsx(Msg, {
        msg: msg
      })]
    })]
  });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  SECURITY SECTION                                                          */
/* ══════════════════════════════════════════════════════════════════════════ */
function SecuritySection() {
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
        text: T.security.changePassword.errors.mismatch
      });
      return;
    }
    if (form.newPw.length < 8) {
      setMsg({
        type: "err",
        text: T.security.changePassword.errors.tooShort
      });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await authFetch(`${API}/users/password`, {
        method: "PUT",
        body: JSON.stringify({
          current_password: form.current,
          new_password: form.newPw,
          confirm_password: form.confirm
        })
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setMsg({
        type: "ok",
        text: T.security.changePassword.success
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
    label: T.security.changePassword.current
  }, {
    k: "newPw",
    label: T.security.changePassword.newPw
  }, {
    k: "confirm",
    label: T.security.changePassword.confirm
  }];
  return /*#__PURE__*/_jsxs("div", {
    className: "space-y-8",
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h2", {
        className: "font-display text-[22px] font-semibold text-[var(--foreground)] tracking-tight",
        children: T.security.title
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[13px] text-[var(--muted)] mt-0.5",
        children: T.security.subtitle
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "max-w-sm p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] space-y-4",
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-[14px] font-semibold text-[var(--foreground)]",
        children: T.security.changePassword.title
      }), FIELDS.map(({
        k,
        label
      }) => /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5",
          children: label
        }), /*#__PURE__*/_jsxs("div", {
          className: "relative",
          children: [/*#__PURE__*/_jsx("input", {
            type: show[k] ? "text" : "password",
            value: form[k],
            onChange: e => setForm(p => ({
              ...p,
              [k]: e.target.value
            })),
            className: "w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[hsl(239_68%_58%/0.30)] transition-all"
          }), /*#__PURE__*/_jsx("button", {
            type: "button",
            onClick: () => setShow(p => ({
              ...p,
              [k]: !p[k]
            })),
            className: "absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors",
            children: /*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined",
              style: {
                fontSize: 16
              },
              children: show[k] ? "visibility_off" : "visibility"
            })
          })]
        }), k === "newPw" && form.newPw && /*#__PURE__*/_jsxs("div", {
          className: "mt-2 space-y-1",
          children: [/*#__PURE__*/_jsx("div", {
            className: "h-1 w-full rounded-full bg-[var(--border-color)] overflow-hidden",
            children: /*#__PURE__*/_jsx("div", {
              className: `h-full rounded-full transition-all duration-500 ${strength.color} ${strength.width}`
            })
          }), /*#__PURE__*/_jsx("p", {
            className: "text-[10px] font-semibold text-[var(--muted)]",
            children: strength.label
          })]
        })]
      }, k)), /*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-4 pt-2",
        children: [/*#__PURE__*/_jsx("button", {
          onClick: save,
          disabled: saving || !form.current || !form.newPw || !form.confirm,
          className: "px-5 py-2.5 rounded-xl bg-[hsl(239_68%_58%)] text-white text-[13px] font-semibold hover:bg-[hsl(239_55%_50%)] active:scale-95 transition-all disabled:opacity-40",
          children: saving ? T.security.changePassword.submitting : T.security.changePassword.submit
        }), /*#__PURE__*/_jsx(Msg, {
          msg: msg
        })]
      })]
    })]
  });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  SESSIONS SECTION                                                          */
/* ══════════════════════════════════════════════════════════════════════════ */
function SessionsSection() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/users/sessions`);
      if (res.ok) setSessions(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const revoke = async id => {
    setRevoking(id);
    try {
      await authFetch(`${API}/users/sessions/${id}`, {
        method: "DELETE"
      });
      setSessions(p => p.filter(s => s.id !== id));
    } finally {
      setRevoking(null);
    }
  };
  const revokeAll = async () => {
    await authFetch(`${API}/users/sessions`, {
      method: "DELETE"
    });
    setSessions([]);
  };
  return /*#__PURE__*/_jsxs("div", {
    className: "space-y-8",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "flex items-start justify-between gap-4",
      children: [/*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("h2", {
          className: "font-display text-[22px] font-semibold text-[var(--foreground)] tracking-tight",
          children: "Phi\xEAn \u0111\u0103ng nh\u1EADp"
        }), /*#__PURE__*/_jsx("p", {
          className: "text-[13px] text-[var(--muted)] mt-0.5",
          children: "C\xE1c thi\u1EBFt b\u1ECB \u0111ang \u0111\u0103ng nh\u1EADp v\xE0o t\xE0i kho\u1EA3n"
        })]
      }), sessions.length > 1 && /*#__PURE__*/_jsx("button", {
        onClick: revokeAll,
        className: "shrink-0 px-4 py-2 rounded-xl text-[12px] font-semibold text-[hsl(343_72%_48%)] border border-[hsl(343_85%_58%/0.25)] hover:bg-[hsl(343_85%_58%/0.06)] active:scale-95 transition-all",
        children: "\u0110\u0103ng xu\u1EA5t t\u1EA5t c\u1EA3"
      })]
    }), /*#__PURE__*/_jsx("div", {
      className: "space-y-3",
      children: loading ? [1, 2].map(i => /*#__PURE__*/_jsx(Skeleton, {
        cls: "h-[72px]"
      }, i)) : sessions.length === 0 ? /*#__PURE__*/_jsx("div", {
        className: "py-12 text-center text-[13px] text-[var(--muted)]",
        children: "Ch\u01B0a c\xF3 phi\xEAn \u0111\u0103ng nh\u1EADp n\xE0o \u0111\u01B0\u1EE3c ghi l\u1EA1i"
      }) : sessions.map(s => {
        const {
          browser,
          os
        } = parseUA(s.user_agent);
        const isMobile = /mobile|android|iphone|ipad/i.test(s.user_agent);
        const when = new Date(s.last_active).toLocaleString("vi-VN", {
          dateStyle: "short",
          timeStyle: "short"
        });
        return /*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-4 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] group transition-all hover:border-[hsl(239_68%_58%/0.25)]",
          children: [/*#__PURE__*/_jsx("div", {
            className: "w-10 h-10 rounded-xl bg-[var(--card-bg)] flex items-center justify-center shrink-0",
            children: /*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined text-[var(--muted)]",
              style: {
                fontSize: 20
              },
              children: isMobile ? "smartphone" : "computer"
            })
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex-1 min-w-0",
            children: [/*#__PURE__*/_jsxs("p", {
              className: "text-[13px] font-semibold text-[var(--foreground)]",
              children: [browser, " \xB7 ", os]
            }), /*#__PURE__*/_jsxs("p", {
              className: "text-[11px] text-[var(--muted)] mt-0.5",
              children: [s.ip_address || "IP không xác định", " \xB7 L\u1EA7n cu\u1ED1i: ", when]
            })]
          }), /*#__PURE__*/_jsx("button", {
            onClick: () => revoke(s.id),
            disabled: revoking === s.id,
            className: "px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--muted)] border border-[var(--border-color)] opacity-0 group-hover:opacity-100 hover:text-[hsl(343_72%_48%)] hover:border-[hsl(343_85%_58%/0.30)] active:scale-95 transition-all disabled:opacity-40",
            children: revoking === s.id ? "..." : "Thu hồi"
          })]
        }, s.id);
      })
    })]
  });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  APPEARANCE SECTION                                                        */
/* ══════════════════════════════════════════════════════════════════════════ */
function AppearanceSection() {
  const {
    theme,
    setTheme
  } = useTheme();
  const cur = theme;
  return /*#__PURE__*/_jsxs("div", {
    className: "space-y-8",
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h2", {
        className: "font-display text-[22px] font-semibold text-[var(--foreground)] tracking-tight",
        children: T.appearance.title
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[13px] text-[var(--muted)] mt-0.5",
        children: T.appearance.subtitle
      })]
    }), /*#__PURE__*/_jsx("div", {
      className: "grid grid-cols-2 gap-3 max-w-xs",
      children: [T.appearance.light, T.appearance.dark].map(t => /*#__PURE__*/_jsxs("button", {
        onClick: () => setTheme(String(t.id)),
        className: `p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${cur === t.id ? "border-[hsl(239_68%_58%)] bg-[hsl(239_68%_58%/0.06)]" : "border-[var(--border-color)] hover:border-[hsl(239_68%_58%/0.40)]"}`,
        children: [/*#__PURE__*/_jsx("span", {
          className: `material-symbols-outlined text-[24px] ${cur === t.id ? "text-[hsl(239_55%_50%)]" : "text-[var(--muted)]"}`,
          children: t.icon
        }), /*#__PURE__*/_jsx("p", {
          className: `text-[12px] font-semibold ${cur === t.id ? "text-[hsl(239_55%_50%)]" : "text-[var(--foreground)]"}`,
          children: t.label
        })]
      }, t.id))
    })]
  });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  PREFERENCES SECTION                                                       */
/* ══════════════════════════════════════════════════════════════════════════ */
function PreferencesSection({
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
  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await authFetch(`${API}/users/preferences`, {
        method: "PUT",
        body: JSON.stringify({
          email_notifications: emailNotif,
          ai_response_detail: aiDetail
        })
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setMsg({
        type: "ok",
        text: "Đã lưu cài đặt"
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
  const AI_OPTS = [{
    id: "concise",
    label: "Ngắn gọn",
    desc: "Súc tích, trọng tâm"
  }, {
    id: "balanced",
    label: "Cân bằng",
    desc: "Đủ chi tiết, rõ ràng"
  }, {
    id: "detailed",
    label: "Chi tiết",
    desc: "Giải thích sâu, nhiều ví dụ"
  }];
  return /*#__PURE__*/_jsxs("div", {
    className: "space-y-8",
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h2", {
        className: "font-display text-[22px] font-semibold text-[var(--foreground)] tracking-tight",
        children: "T\xF9y ch\u1EC9nh"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[13px] text-[var(--muted)] mt-0.5",
        children: "C\xE1 nh\xE2n h\xF3a tr\u1EA3i nghi\u1EC7m AI Tutor"
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "max-w-sm space-y-4",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] space-y-4",
        children: [/*#__PURE__*/_jsx("h3", {
          className: "text-[13px] font-semibold text-[var(--foreground)]",
          children: "Th\xF4ng b\xE1o"
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex items-center justify-between",
          children: [/*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("p", {
              className: "text-[13px] font-medium text-[var(--foreground)]",
              children: "Th\xF4ng b\xE1o Email"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-[11px] text-[var(--muted)] mt-0.5",
              children: "Tin t\u1EE9c v\u1EC1 t\xE0i li\u1EC7u v\xE0 ti\u1EBFn tr\xECnh h\u1ECDc"
            })]
          }), /*#__PURE__*/_jsx(Toggle, {
            on: emailNotif,
            onToggle: () => setEmailNotif(p => !p)
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] space-y-3",
        children: [/*#__PURE__*/_jsx("h3", {
          className: "text-[13px] font-semibold text-[var(--foreground)]",
          children: "M\u1EE9c \u0111\u1ED9 chi ti\u1EBFt AI"
        }), /*#__PURE__*/_jsx("div", {
          className: "grid grid-cols-3 gap-2",
          children: AI_OPTS.map(opt => /*#__PURE__*/_jsxs("button", {
            onClick: () => setAiDetail(opt.id),
            className: `p-3 rounded-xl border text-left transition-all ${aiDetail === opt.id ? "border-[hsl(239_68%_58%)] bg-[hsl(239_68%_58%/0.06)]" : "border-[var(--border-color)] hover:border-[hsl(239_68%_58%/0.30)]"}`,
            children: [/*#__PURE__*/_jsx("p", {
              className: `text-[11px] font-semibold ${aiDetail === opt.id ? "text-[hsl(239_55%_50%)]" : "text-[var(--foreground)]"}`,
              children: opt.label
            }), /*#__PURE__*/_jsx("p", {
              className: "text-[10px] text-[var(--muted)] mt-0.5 leading-relaxed",
              children: opt.desc
            })]
          }, opt.id))
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "flex items-center gap-4",
      children: [/*#__PURE__*/_jsx("button", {
        onClick: save,
        disabled: saving,
        className: "px-5 py-2.5 rounded-xl bg-[hsl(239_68%_58%)] text-white text-[13px] font-semibold hover:bg-[hsl(239_55%_50%)] active:scale-95 transition-all disabled:opacity-50",
        children: saving ? "Đang lưu..." : "Lưu cài đặt"
      }), /*#__PURE__*/_jsx(Msg, {
        msg: msg
      })]
    })]
  });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  UPGRADE SECTION                                                           */
/* ══════════════════════════════════════════════════════════════════════════ */

const UPGRADE_PLANS = [
  {
    id: "free",
    name: "Miễn phí",
    tagline: "Xem AI có thể làm gì",
    priceLabel: "₫0",
    unit: "VND /tháng",
    featured: false,
    features: [
      { icon: "hub", text: "Mô hình cốt lõi" },
      { icon: "chat", text: "30 tin/ngày" },
      { icon: "auto_awesome", text: "10 lượt tạo nội dung AI/ngày" },
      { icon: "upload_file", text: "Tối đa 3 file tài liệu" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Tối đa hóa năng suất của bạn",
    priceLabel: "₫99.000",
    unit: "VND /tháng (bao gồm VAT)",
    featured: true,
    badge: "Phổ biến",
    features: [
      { icon: "hub", text: "Mô hình nâng cao" },
      { icon: "chat", text: "Không giới hạn tin nhắn" },
      { icon: "auto_awesome", text: "Không giới hạn tạo nội dung AI" },
      { icon: "upload_file", text: "Không giới hạn tài liệu" },
      { icon: "psychology", text: "Ưu tiên xử lý AI" },
    ],
  },
];

function UpgradeSection({ profile }) {
  const navigate = useNavigate();
  const isPro = profile.is_pro;
  const U = QUOTA_TEXTS.upgrade;

  return (
    <div className="space-y-6">
      {/* Current plan row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-[var(--muted)] mb-2">{U.currentPlanLabel}</p>
          <div className="flex items-center gap-2">
            {isPro ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white text-[12px] font-bold">
                <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                {U.proPlan}
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border-color)] text-[var(--foreground)] text-[12px] font-bold">
                {U.freePlan}
              </span>
            )}
          </div>
        </div>
        {!isPro && (
          <button
            onClick={() => navigate("/pricing")}
            className="px-5 py-2.5 rounded-xl bg-[hsl(239_68%_58%)] text-white font-bold text-[13px] hover:bg-[hsl(239_62%_52%)] active:scale-95 transition-all shadow-[0_4px_16px_hsl(239_68%_58%/0.30)] hover:shadow-[0_8px_24px_hsl(239_68%_58%/0.40)]"
          >
            {U.upgradeBtn}
          </button>
        )}
      </div>

      <div className="h-px bg-[var(--border-color)]" />

      {!isPro && (
        <>
          <p className="text-[13px] font-bold text-[var(--foreground)] mb-3">{U.featuresIntro}</p>
          <ul className="space-y-3">
            {U.freeFeatures.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[var(--muted)] text-[20px] shrink-0">{f.icon}</span>
                <span className="text-[13px] text-[var(--foreground)] font-medium">{f.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {isPro && (
        <>
          <p className="text-[13px] font-bold text-[var(--foreground)] mb-3">{U.proFeaturesIntro}</p>
          <ul className="space-y-3 mb-6">
            {U.proFeatures.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[hsl(239_68%_58%)] text-[20px] shrink-0">{f.icon}</span>
                <span className="text-[13px] text-[var(--foreground)] font-medium">{f.text}</span>
              </li>
            ))}
          </ul>
          <div className="pt-4 border-t border-[var(--border-color)]">
            <button
              onClick={() => navigate("/pricing")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--muted)] text-[12px] font-semibold hover:text-[var(--foreground)] hover:border-[var(--border-emphasis)] transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              {U.viewAllPlans}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
/* ══════════════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */
const NAV = [{
  id: "profile",
  label: T.nav.profile.label,
  icon: T.nav.profile.icon
}, {
  id: "security",
  label: T.nav.security.label,
  icon: T.nav.security.icon
}, {
  id: "appearance",
  label: T.nav.appearance.label,
  icon: T.nav.appearance.icon
}, {
  id: "upgrade",
  label: QUOTA_TEXTS.upgrade.navLabel,
  icon: "credit_card"
}];

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchProfile = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/users/me`);
      if (res.ok) setProfile(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  return /*#__PURE__*/_jsx("div", {
    className: "min-h-screen bg-[var(--background)]",
    children: /*#__PURE__*/_jsxs("div", {
      className: "max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "mb-8",
        children: [/*#__PURE__*/_jsx("h1", {
          className: "font-sans text-[28px] font-extrabold text-[var(--foreground)] tracking-[-0.03em] leading-[1.05]",
          children: T.page.title
        }), /*#__PURE__*/_jsx("p", {
          className: "text-[14px] text-[var(--muted)] mt-1.5 leading-relaxed",
          children: T.page.subtitle
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-col gap-4 sm:flex-row sm:gap-8 sm:items-start",
        children: [/*#__PURE__*/_jsx("aside", {
          className: "w-full sm:w-52 sm:shrink-0 sm:sticky sm:top-6",
          children: /*#__PURE__*/_jsx("nav", {
            className: "flex gap-1 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:space-y-1 sm:pb-0",
            children: NAV.map(n => /*#__PURE__*/_jsxs("button", {
              onClick: () => setTab(n.id),
              className: `shrink-0 sm:w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-left ${tab === n.id ? "bg-[hsl(239_68%_58%/0.10)] text-[hsl(239_55%_50%)] border border-[hsl(239_68%_58%/0.20)]" : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] border border-transparent"}`,
              children: [/*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined",
                style: { fontSize: 18 },
                children: n.icon
              }), n.label]
            }, n.id))
          })
        }), /*#__PURE__*/_jsx("div", {

          className: "flex-1 min-w-0 p-4 sm:p-7 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-[0_4px_24px_hsl(228_25%_5%/0.08)]",
          children: loading ? /*#__PURE__*/_jsxs("div", {
            className: "space-y-5",
            children: [/*#__PURE__*/_jsx(Skeleton, {
              cls: "h-7 w-44"
            }), /*#__PURE__*/_jsx(Skeleton, {
              cls: "h-4 w-60"
            }), /*#__PURE__*/_jsx(Skeleton, {
              cls: "h-20 w-20 rounded-2xl"
            }), /*#__PURE__*/_jsx(Skeleton, {
              cls: "h-10 w-full max-w-sm"
            }), /*#__PURE__*/_jsx(Skeleton, {
              cls: "h-10 w-full max-w-sm"
            })]
          }) : !profile ? /*#__PURE__*/_jsx("div", {
            className: "py-20 text-center text-[13px] text-[var(--muted)]",
            children: T.loading.error
          }) : /*#__PURE__*/_jsxs("div", {
            className: "animate-dialog-enter",
            children: [tab === "profile" && /*#__PURE__*/_jsx(ProfileSection, {
              profile: profile,
              onRefresh: fetchProfile
            }), tab === "security" && /*#__PURE__*/_jsx(SecuritySection, {}), tab === "appearance" && /*#__PURE__*/_jsx(AppearanceSection, {}), tab === "upgrade" && /*#__PURE__*/_jsx(UpgradeSection, {
              profile: profile
            })]
          }, tab)
        })]
      })]
    })
  });
}
