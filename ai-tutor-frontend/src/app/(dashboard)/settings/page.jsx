import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SETTINGS_PAGE_TEXTS, QUOTA_TEXTS, SETTINGS_WORKSPACE_TEXTS } from "@/constants/texts";


/* ── Types ────────────────────────────────────────────────────────────────── */

import { authFetch } from "@/services/api.service";
import { useTheme } from "@/components/ThemeProvider";
import { PageFrame, PageHeader } from "@/components/ui/Premium";
import UsageQuotaCard from "@/components/settings/UsageQuotaCard";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const API = "/api/v1";
const T = SETTINGS_PAGE_TEXTS;
const W = SETTINGS_WORKSPACE_TEXTS;

/* ── Utilities ────────────────────────────────────────────────────────────── */
function profileFromAuthUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    student_id: user.student_id || "",
    full_name: user.full_name || "",
    email: user.email || "",
    bio: user.bio ?? "",
    is_pro: user.is_pro ?? user.isPro ?? user.isPro_flag ?? false,
    preferences: user.preferences || { email_notifications: true, ai_response_detail: "balanced" },
  };
}

function parseUA(ua) {
  let browser = W.unknownBrowser,
    os = W.unknownOs;
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
    label: T.security.strength.weak,
    color: "bg-[hsl(4_72%_52%)]",
    width: "w-1/4"
  };
  if (score <= 2) return {
    label: T.security.strength.medium,
    color: "bg-[hsl(38_92%_50%)]",
    width: "w-2/4"
  };
  if (score <= 3) return {
    label: T.security.strength.fair,
    color: "bg-[hsl(38_80%_42%)]",
    width: "w-3/4"
  };
  return {
    label: T.security.strength.strong,
    color: "bg-[hsl(158_64%_44%)]",
    width: "w-full"
  };
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
const Skeleton = ({
  cls = ""
}) => /*#__PURE__*/_jsx("div", {
  className: `premium-skeleton ${cls}`
});

/* ── Toggle ───────────────────────────────────────────────────────────────── */
const Toggle = ({
  on,
  onToggle
}) => /*#__PURE__*/_jsx("button", {
  onClick: onToggle,
  className: `relative w-10 h-6 rounded-full transition-all duration-200 border ${on ? "bg-[var(--brand-primary)] border-[var(--brand-primary-strong)]" : "bg-[var(--surface)] border-[var(--border-color)]"}`,
  children: /*#__PURE__*/_jsx("span", {
    className: `absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${on ? "left-[18px]" : "left-0.5"}`
  })
});

/* ── Message toast ────────────────────────────────────────────────────────── */
const Msg = ({
  msg
}) => msg ? /*#__PURE__*/_jsx("span", {
  className: `text-[12px] font-semibold ${msg.type === "ok" ? "text-[hsl(158_64%_44%)]" : "text-[hsl(4_72%_52%)]"}`,
  children: msg.text
}) : null;

const InlineLoading = ({ label }) => (
  <span className="inline-flex items-center justify-center gap-2">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden="true" />
    <span>{label}</span>
  </span>
);

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
  const fieldCls = "w-full px-3.5 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[hsl(166_61%_35%/0.30)] transition-all";
  const disabledCls = "w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[13px] text-[var(--muted)] cursor-not-allowed";
  return /*#__PURE__*/_jsxs("div", {
    className: "space-y-8",
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h2", {
        className: "text-[22px] font-semibold text-[var(--foreground)] tracking-tight",
        children: T.profile.title
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[13px] text-[var(--muted)] mt-0.5",
        children: T.profile.subtitle
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "flex items-center gap-6",
      children: [/*#__PURE__*/_jsx("div", {
        className: "w-16 h-16 rounded-full bg-[var(--foreground)] flex items-center justify-center text-[var(--background)] text-xl font-bold shadow-[var(--premium-shadow-sm)]",
        children: profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "?"
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
      className: "space-y-4",
      children: [/*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-[11px] font-semibold text-[var(--muted)] mb-1.5",
          children: T.profile.fields.fullName
        }), /*#__PURE__*/_jsx("input", {
          value: name,
          onChange: e => setName(e.target.value),
          className: fieldCls
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-[11px] font-semibold text-[var(--muted)] mb-1.5",
          children: T.profile.fields.studentId
        }), /*#__PURE__*/_jsx("input", {
          value: profile.student_id,
          disabled: true,
          className: disabledCls
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-[11px] font-semibold text-[var(--muted)] mb-1.5",
          children: T.profile.fields.email
        }), /*#__PURE__*/_jsx("input", {
          value: profile.email,
          disabled: true,
          className: disabledCls
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "flex items-center gap-4",
      children: [/*#__PURE__*/_jsx("button", {
        onClick: save,
        disabled: saving,
        className: "px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-[13px] font-semibold hover:bg-[var(--brand-primary-strong)] active:scale-95 transition-all disabled:opacity-50",
        children: saving ? <InlineLoading label={T.profile.saving} /> : T.profile.save
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
        headers: {
          "Content-Type": "application/json"
        },
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
        className: "text-[22px] font-semibold text-[var(--foreground)] tracking-tight",
        children: T.security.title
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[13px] text-[var(--muted)] mt-0.5",
        children: T.security.subtitle
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "p-6 rounded-lg bg-[var(--surface)] border border-[var(--border-color)] space-y-4",
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-[14px] font-semibold text-[var(--foreground)]",
        children: T.security.changePassword.title
      }), FIELDS.map(({
        k,
        label
      }) => /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-[11px] font-semibold text-[var(--muted)] mb-1.5",
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
            className: "w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[hsl(166_61%_35%/0.30)] transition-all"
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
          className: "px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-[13px] font-semibold hover:bg-[var(--brand-primary-strong)] active:scale-95 transition-all disabled:opacity-40",
          children: saving ? <InlineLoading label={T.security.changePassword.submitting} /> : T.security.changePassword.submit
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
          className: "text-[22px] font-semibold text-[var(--foreground)] tracking-tight",
          children: W.sessions.title
        }), /*#__PURE__*/_jsx("p", {
          className: "text-[13px] text-[var(--muted)] mt-0.5",
          children: W.sessions.subtitle
        })]
      }), sessions.length > 1 && /*#__PURE__*/_jsx("button", {
        onClick: revokeAll,
        className: "shrink-0 px-4 py-2 rounded-xl text-[12px] font-semibold text-[hsl(4_72%_52%)] border border-[hsl(343_85%_58%/0.25)] hover:bg-[hsl(343_85%_58%/0.06)] active:scale-95 transition-all",
        children: W.sessions.revokeAll
      })]
    }), /*#__PURE__*/_jsx("div", {
      className: "space-y-3",
      children: loading ? [1, 2].map(i => /*#__PURE__*/_jsx(Skeleton, {
        cls: "h-[72px]"
      }, i)) : sessions.length === 0 ? /*#__PURE__*/_jsx("div", {
        className: "py-12 text-center text-[13px] text-[var(--muted)]",
        children: W.sessions.empty
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
          className: "flex items-center gap-4 p-4 rounded-lg bg-[var(--surface)] border border-[var(--border-color)] group transition-all hover:border-[var(--border-emphasis)] hover:bg-[var(--card-bg-hover)]",
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
              children: [s.ip_address || W.sessions.unknownIp, " · ", W.sessions.lastSeen, " ", when]
            })]
          }), /*#__PURE__*/_jsx("button", {
            onClick: () => revoke(s.id),
            disabled: revoking === s.id,
            className: "px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--muted)] border border-[var(--border-color)] opacity-0 group-hover:opacity-100 hover:text-[hsl(4_72%_52%)] hover:border-[hsl(343_85%_58%/0.30)] active:scale-95 transition-all disabled:opacity-40",
            children: revoking === s.id ? <InlineLoading label={W.sessions.revoking} /> : W.sessions.revoke
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
        className: "text-[22px] font-semibold text-[var(--foreground)] tracking-tight",
        children: T.appearance.title
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[13px] text-[var(--muted)] mt-0.5",
        children: T.appearance.subtitle
      })]
    }), /*#__PURE__*/_jsx("div", {
      className: "grid grid-cols-2 gap-3 max-w-xs",
      children: [T.appearance.light, T.appearance.dark].map(t => /*#__PURE__*/_jsxs("button", {
        onClick: () => setTheme(String(t.id)),
        className: `p-4 rounded-lg border-2 flex flex-col items-center gap-3 transition-all ${cur === t.id ? "border-[var(--brand-primary)] bg-[hsl(166_61%_35%/0.06)]" : "border-[var(--border-color)] hover:border-[var(--border-emphasis)]"}`,
        children: [/*#__PURE__*/_jsx("span", {
          className: `material-symbols-outlined text-[24px] ${cur === t.id ? "text-[var(--brand-primary)]" : "text-[var(--muted)]"}`,
          children: t.icon
        }), /*#__PURE__*/_jsx("p", {
          className: `text-[12px] font-semibold ${cur === t.id ? "text-[var(--brand-primary)]" : "text-[var(--foreground)]"}`,
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
      if (!res.ok) throw new Error((await res.json()).detail);
      setMsg({
        type: "ok",
        text: W.passwordSaved
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
  const AI_OPTS = W.preferences.options;
  return /*#__PURE__*/_jsxs("div", {
    className: "space-y-8",
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h2", {
        className: "text-[22px] font-semibold text-[var(--foreground)] tracking-tight",
        children: W.preferences.title
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[13px] text-[var(--muted)] mt-0.5",
        children: W.preferences.subtitle
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "p-5 rounded-lg bg-[var(--surface)] border border-[var(--border-color)] space-y-4",
        children: [/*#__PURE__*/_jsx("h3", {
          className: "text-[13px] font-semibold text-[var(--foreground)]",
          children: W.preferences.notificationsTitle
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex items-center justify-between",
          children: [/*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("p", {
              className: "text-[13px] font-medium text-[var(--foreground)]",
              children: W.preferences.emailNotifications
            }), /*#__PURE__*/_jsx("p", {
              className: "text-[11px] text-[var(--muted)] mt-0.5",
              children: W.preferences.emailNotificationsDesc
            })]
          }), /*#__PURE__*/_jsx(Toggle, {
            on: emailNotif,
            onToggle: () => setEmailNotif(p => !p)
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-5 rounded-lg bg-[var(--surface)] border border-[var(--border-color)] space-y-3",
        children: [/*#__PURE__*/_jsx("h3", {
          className: "text-[13px] font-semibold text-[var(--foreground)]",
          children: W.preferences.detailTitle
        }), /*#__PURE__*/_jsx("div", {
          className: "grid grid-cols-3 gap-2",
          children: AI_OPTS.map(opt => /*#__PURE__*/_jsxs("button", {
            onClick: () => setAiDetail(opt.id),
            className: `p-3 rounded-lg border text-left transition-all ${aiDetail === opt.id ? "border-[var(--brand-primary)] bg-[hsl(166_61%_35%/0.06)]" : "border-[var(--border-color)] hover:border-[var(--border-emphasis)]"}`,
            children: [/*#__PURE__*/_jsx("p", {
              className: `text-[11px] font-semibold ${aiDetail === opt.id ? "text-[var(--brand-primary)]" : "text-[var(--foreground)]"}`,
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
        className: "px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-[13px] font-semibold hover:bg-[var(--brand-primary-strong)] active:scale-95 transition-all disabled:opacity-50",
        children: saving ? <InlineLoading label={W.preferences.saving} /> : W.preferences.save
      }), /*#__PURE__*/_jsx(Msg, {
        msg: msg
      })]
    })]
  });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  UPGRADE SECTION                                                           */
/* ══════════════════════════════════════════════════════════════════════════ */

const UPGRADE_PLANS = W.plans;

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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white text-[12px] font-bold">
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
            className="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white font-bold text-[13px] hover:bg-[var(--brand-primary-strong)] active:scale-95 transition-all shadow-[0_4px_16px_hsl(166_61%_35%/0.28)]"
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
                <span className="material-symbols-outlined text-[var(--brand-primary)] text-[20px] shrink-0">{f.icon}</span>
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
  id: "usage",
  label: W.nav.usage,
  icon: "monitoring"
}];

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(() => profileFromAuthUser(user));
  const [loading, setLoading] = useState(() => !profileFromAuthUser(user));
  const fetchProfile = useCallback(async () => {
    const fallback = profileFromAuthUser(user);
    if (!fallback) setLoading(true);
    try {
      const res = await authFetch(`${API}/users/me`);
      if (!res.ok) throw new Error("profile");
      setProfile(await res.json());
    } catch {
      if (fallback) setProfile((current) => current || fallback);
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    const fallback = profileFromAuthUser(user);
    if (fallback) {
      setProfile((current) => current || fallback);
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <PageFrame narrow className="space-y-6">
      <PageHeader
        icon="settings"
        title={W.page.title}
        subtitle={W.page.subtitle}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <aside className="min-w-0 w-full sm:sticky sm:top-24 sm:w-56 sm:shrink-0">
          <div className="premium-card p-1">
            <nav className="flex max-w-full touch-pan-x gap-1 overflow-x-auto overscroll-x-contain pb-1 sm:flex-col sm:overflow-visible sm:pb-0 custom-scrollbar">
            {NAV.map((n) => (
              <button
                type="button"
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-left text-[13px] font-bold transition-all sm:w-full ${tab === n.id ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"}`}
              >
                <span className="material-symbols-outlined text-[18px]">{n.icon}</span>
                {n.label}
              </button>
            ))}
            </nav>
          </div>
        </aside>

        <div className="premium-card min-w-0 flex-1 p-4 sm:p-7">
          {loading ? (
            <div className="min-h-[360px] space-y-5">
              <Skeleton cls="h-7 w-44" />
              <Skeleton cls="h-4 w-60" />
              <Skeleton cls="h-20 w-20 rounded-lg" />
              <Skeleton cls="h-10 w-full max-w-sm" />
              <Skeleton cls="h-10 w-full max-w-sm" />
            </div>
          ) : !profile ? (
            <div className="py-20 text-center text-[13px] text-[var(--muted)]">{T.loading.error}</div>
          ) : (
            <div>
              {tab === "profile" && <ProfileSection profile={profile} onRefresh={fetchProfile} />}
              {tab === "security" && <SecuritySection />}
              {tab === "appearance" && <AppearanceSection />}
              {tab === "preferences" && <PreferencesSection profile={profile} onRefresh={fetchProfile} />}
              {tab === "usage" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">{W.page.usageTitle}</h2>
                    <p className="mt-0.5 text-[13px] text-[var(--muted)]">
                      {W.page.usageSubtitle}
                    </p>
                  </div>
                  <UsageQuotaCard />
                  <UpgradeSection profile={profile} />
                </div>
              )}
              {tab === "sessions" && <SessionsSection />}
            </div>
          )}
        </div>
      </div>
    </PageFrame>
  );
}
