import { useState, useCallback, useEffect } from "react";
import { SETTINGS_WORKSPACE_TEXTS } from "@/shared/constants/texts";
import { authFetch } from "@/shared/services/api.service";
import { safeJson } from "@/shared/utils/httpUtils";
import { parseUserAgent } from "@/shared/utils/userAgentUtils";
import { Skeleton, InlineLoading } from "./SettingsShared";

const API = "/api/v1";
const WORKSPACE_TEXTS = SETTINGS_WORKSPACE_TEXTS;

/** Quản lý phiên đăng nhập — hiển thị danh sách thiết bị và cho phép thu hồi */
export default function SessionsSection() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/users/sessions`);
      if (res.ok) setSessions(await safeJson(res, []));
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
      setSessions(prevState => prevState.filter(session => session.id !== id));
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
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold text-[var(--foreground)] tracking-tight">
            {WORKSPACE_TEXTS.sessions.title}
          </h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            {WORKSPACE_TEXTS.sessions.subtitle}
          </p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={revokeAll}
            className="shrink-0 px-4 py-2 rounded-xl text-[12px] font-semibold text-[hsl(4_72%_52%)] border border-[hsl(343_85%_58%/0.25)] hover:bg-[hsl(343_85%_58%/0.06)] active:scale-95 transition-all"
          >
            {WORKSPACE_TEXTS.sessions.revokeAll}
          </button>
        )}
      </div>
      <div className="space-y-3">
        {loading ? [1, 2].map(i => (
          <Skeleton cls="h-[72px]" key={i} />
        )) : sessions.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-[var(--muted)]">
            {WORKSPACE_TEXTS.sessions.empty}
          </div>
        ) : sessions.map(s => {
          const {
            browser,
            os
          } = parseUserAgent(s.user_agent);
          const isMobile = /mobile|android|iphone|ipad/i.test(s.user_agent);
          const when = new Date(s.last_active).toLocaleString("vi-VN", {
            dateStyle: "short",
            timeStyle: "short"
          });
          return (
            <div
              key={s.id}
              className="flex items-center gap-4 p-4 rounded-lg bg-[var(--surface)] border border-[var(--border-color)] group transition-all hover:border-[var(--border-emphasis)] hover:bg-[var(--card-bg-hover)]"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--card-bg)] flex items-center justify-center shrink-0">
                <span
                  className="material-symbols-outlined text-[var(--muted)]"
                  style={{ fontSize: 20 }}
                >
                  {isMobile ? "smartphone" : "computer"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--foreground)]">
                  {browser} {"\xB7"} {os}
                </p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  {WORKSPACE_TEXTS.sessions.lastSeen} {when}
                </p>
              </div>
              <button
                onClick={() => revoke(s.id)}
                disabled={revoking === s.id}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--muted)] border border-[var(--border-color)] opacity-0 group-hover:opacity-100 hover:text-[hsl(4_72%_52%)] hover:border-[hsl(343_85%_58%/0.30)] active:scale-95 transition-all disabled:opacity-40"
              >
                {revoking === s.id ? <InlineLoading label={WORKSPACE_TEXTS.sessions.revoking} /> : WORKSPACE_TEXTS.sessions.revoke}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
