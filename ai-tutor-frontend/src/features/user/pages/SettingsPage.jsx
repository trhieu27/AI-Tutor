import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { SETTINGS_PAGE_TEXTS, SETTINGS_WORKSPACE_TEXTS } from "@/shared/constants/texts";
import { authFetch } from "@/shared/services/api.service";
import { safeJson } from "@/shared/utils/httpUtils";
import { PageFrame, PageHeader } from "@/shared/ui/Premium";

// Section components
import { Skeleton } from "@/features/user/components/settings/SettingsShared";
import ProfileSection from "@/features/user/components/settings/ProfileSection";
import SecuritySection from "@/features/user/components/settings/SecuritySection";
import AppearanceSection from "@/features/user/components/settings/AppearanceSection";
import PreferencesSection from "@/features/user/components/settings/PreferencesSection";
import SessionsSection from "@/features/user/components/settings/SessionsSection";
import UpgradeSection from "@/features/user/components/settings/UpgradeSection";
import UsageQuotaCard from "@/features/user/components/settings/UsageQuotaCard";

const API = "/api/v1";
const TEXTS = SETTINGS_PAGE_TEXTS;
const WORKSPACE_TEXTS = SETTINGS_WORKSPACE_TEXTS;

// Utilities
function profileFromAuthUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    student_id: user.student_id || "",
    full_name: user.full_name || "",
    email: user.email || "",
    bio: user.bio ?? "",
    is_pro: user.is_pro ?? user.isPro ?? user.isProUser ?? false,
    preferences: user.preferences || { email_notifications: true, ai_response_detail: "balanced" },
  };
}

const NAV = [{
  id: "profile",
  label: TEXTS.nav.profile.label,
  icon: TEXTS.nav.profile.icon
}, {
  id: "security",
  label: TEXTS.nav.security.label,
  icon: TEXTS.nav.security.icon
}, {
  id: "usage",
  label: WORKSPACE_TEXTS.nav.usage,
  icon: "monitoring"
}];

/** Trang Cài đặt — điều hướng tab giữa các section con */
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
      setProfile(await safeJson(res));
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
        title={WORKSPACE_TEXTS.page.title}
        subtitle={WORKSPACE_TEXTS.page.subtitle}
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
            <div className="py-20 text-center text-[13px] text-[var(--muted)]">{TEXTS.loading.error}</div>
          ) : (
            <div>
              {tab === "profile" && <ProfileSection profile={profile} onRefresh={fetchProfile} />}
              {tab === "security" && <SecuritySection />}
              {tab === "appearance" && <AppearanceSection />}
              {tab === "preferences" && <PreferencesSection profile={profile} onRefresh={fetchProfile} />}
              {tab === "usage" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">{WORKSPACE_TEXTS.page.usageTitle}</h2>
                    <p className="mt-0.5 text-[13px] text-[var(--muted)]">
                      {WORKSPACE_TEXTS.page.usageSubtitle}
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

