/** Component dùng chung cho các section trong trang Settings */

/** Skeleton placeholder for loading states */
export const Skeleton = ({ cls = "" }) => (
  <div className={`premium-skeleton ${cls}`} />
);

/** Inline status message (success / error) */
export const Msg = ({ msg }) => msg ? (
  <span
    className={`text-[12px] font-semibold ${msg.type === "ok" ? "text-[hsl(158_64%_44%)]" : "text-[hsl(4_72%_52%)]"}`}
  >
    {msg.text}
  </span>
) : null;

/** Inline spinner with label */
export const InlineLoading = ({ label }) => (
  <span className="inline-flex items-center justify-center gap-2">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden="true" />
    <span>{label}</span>
  </span>
);
