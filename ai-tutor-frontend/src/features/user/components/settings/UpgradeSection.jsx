import { useNavigate } from "react-router-dom";
import { QUOTA_TEXTS } from "@/shared/constants/texts";

/** Hiển thị gói hiện tại và danh sách tính năng Free/Pro */
export default function UpgradeSection({ profile }) {
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
