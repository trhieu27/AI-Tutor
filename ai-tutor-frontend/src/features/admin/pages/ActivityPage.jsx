import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAdminActivity, readCachedAdminActivity } from "@/features/admin/services/admin.service";
import { useAdminRealtime } from "@/features/admin/hooks/useAdminRealtime";
import { ADMIN_TEXTS } from "@/shared/constants/texts";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageIntro,
  AdminPagination,
  AdminSection,
  AdminSelect,
  AdminStatusPill,
  AdminTable,
  formatDateTime,
  formatNumber,
  formatRelativeTime,
} from "@/features/admin/components/AdminPrimitives";

function compactUserAgent(value) {
  if (!value) return "Thiết bị không rõ";
  const text = String(value);
  if (text.includes("Chrome")) return "Chrome";
  if (text.includes("Firefox")) return "Firefox";
  if (text.includes("Safari") && !text.includes("Chrome")) return "Safari";
  if (text.includes("Edg")) return "Microsoft Edge";
  return text.slice(0, 80);
}

function ActivityCard({ item }) {
  const usageCount = Number(item.recent_usage_count || 0);
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-[var(--premium-shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-bold text-[var(--foreground)]">{item.user?.full_name || "Người dùng"}</h3>
          <p className="truncate text-[12px] font-semibold text-[var(--muted)]">{item.user?.email}</p>
        </div>
        <AdminStatusPill tone={item.is_online ? "green" : "neutral"} icon="online_prediction">{item.is_online ? "Đang online" : "Không online"}</AdminStatusPill>
      </div>
      <div className="mt-3 grid gap-2 text-[11px] font-bold text-[var(--muted)]">
        <span className="truncate rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-2">{compactUserAgent(item.user_agent)}</span>
        <span className="truncate rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-2">{item.ip_address || "IP không rõ"}</span>
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-2">{formatDateTime(item.last_active)}</span>
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-2">
          {formatNumber(item.document_count)} tài liệu · {formatNumber(usageCount)} lượt dùng
        </span>
      </div>
    </article>
  );
}

function formatWindow(minutes) {
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} ngày`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} giờ`;
  return `${minutes} phút`;
}

const INITIAL_FILTERS = { page: 1, limit: 5, activeWithinMinutes: 30 };

/** Theo dõi phiên chat real-time — bảng hoạt động người dùng */
export default function AdminActivityPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [data, setData] = useState(() => readCachedAdminActivity(INITIAL_FILTERS));
  const [loading, setLoading] = useState(() => !readCachedAdminActivity(INITIAL_FILTERS));
  const [error, setError] = useState("");

  const [fetching, setFetching] = useState(false);
  const hasLoaded = useRef(!!readCachedAdminActivity(INITIAL_FILTERS));

  const load = useCallback(async () => {
    const cached = readCachedAdminActivity(filters);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else if (!hasLoaded.current) {
      setLoading(true);
    }
    if (!cached) setFetching(true);
    setError("");
    try {
      setData(await fetchAdminActivity(filters));
      hasLoaded.current = true;
    } catch (err) {
      if (!cached) setError(err.message);
      else console.error(err.message);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    const intervalId = window.setInterval(load, 30_000);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load]);

  useAdminRealtime(useCallback((message) => {
    if (!["presence_changed", "usage_recorded"].includes(message.event)) return;
    if (document.visibilityState !== "visible") return;
    load();
  }, [load]));


  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));

  // Dedupe by user ID — keep most recent session per user
  const uniqueItems = useMemo(() => {
    const map = new Map();
    for (const item of data?.items || []) {
      const uid = item.user?.id || item.id;
      const existing = map.get(uid);
      if (!existing || new Date(item.last_active) > new Date(existing.last_active)) {
        map.set(uid, item);
      }
    }
    return [...map.values()];
  }, [data?.items]);

  return (
    <div>
      <AdminPageIntro title={ADMIN_TEXTS.activity.title} subtitle={ADMIN_TEXTS.activity.subtitle} />
      <div className="space-y-5 p-4 sm:p-6">
        <AdminSection>
          <div className="p-4 sm:max-w-xs">
            <AdminSelect value={filters.activeWithinMinutes} onChange={(event) => setFilter("activeWithinMinutes", Number(event.target.value))}>
              {ADMIN_TEXTS.activity.windows.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </AdminSelect>
          </div>
        </AdminSection>

        {loading ? (
          <AdminLoading
            variant="table"
            columns={Object.values(ADMIN_TEXTS.activity.columns)}
            widths={["26%", "34%", "22%", "18%"]}
            cellTypes={["twoLine", "twoLine", "pillSub", "text"]}
          />
        ) : error ? (
          <AdminError message={error} onRetry={load} />
        ) : (
          <div style={fetching && !loading ? { opacity: 0.5, pointerEvents: 'none', transition: 'opacity 150ms ease' } : { transition: 'opacity 150ms ease' }}>
          <AdminSection title="Phiên hoạt động" subtitle={`${formatNumber(uniqueItems.length)} người dùng trong ${formatWindow(data?.activeWithinMinutes || filters.activeWithinMinutes)}`}>
            {uniqueItems.length ? (
              <>
                <AdminTable columns={Object.values(ADMIN_TEXTS.activity.columns)} minWidth="900px" widths={["26%", "34%", "22%", "18%"]} aligns={[null, "center", "center", "center"]}>
                  {uniqueItems.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                      <td className="px-4 py-4">
                        <div className="min-w-0 space-y-1.5">
                          <p className="max-w-64 truncate text-[13px] font-bold text-[var(--foreground)]">{item.user?.full_name || "Người dùng"}</p>
                          <p className="max-w-64 truncate text-[11px] font-semibold text-[var(--muted)]">{item.user?.email || "Chưa có email"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-0 space-y-1.5 text-center">
                          <span className="inline-flex max-w-56 items-center gap-1.5 rounded-[var(--radius-chip)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-bold text-[var(--foreground)]">
                            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">devices</span>
                            <span className="truncate">{compactUserAgent(item.user_agent)}</span>
                          </span>
                          <p className="truncate text-[11px] font-semibold text-[var(--muted)]">{item.ip_address || "IP không rõ"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-0 space-y-1.5 text-center">
                          <AdminStatusPill tone={item.is_online ? "green" : "neutral"}>{item.is_online ? "Đang hoạt động" : (formatRelativeTime(item.last_active) || "Không online")}</AdminStatusPill>
                          <p className="truncate text-[11px] font-semibold text-[var(--muted)]">{formatDateTime(item.last_active)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-center gap-2 text-[11px] font-bold">
                          <span className="rounded-[var(--radius-chip)] bg-[var(--surface)] px-2.5 py-1 text-[var(--foreground)]">{formatNumber(item.document_count)} tài liệu</span>
                          <AdminStatusPill tone={item.recent_usage_count > 0 ? "blue" : "neutral"}>{formatNumber(item.recent_usage_count)} lượt dùng</AdminStatusPill>
                        </div>
                      </td>
                    </tr>
                  ))}
                </AdminTable>
                <div className="space-y-3 p-3 md:hidden">
                  {uniqueItems.map((item) => <ActivityCard key={item.id} item={item} />)}
                </div>
                <AdminPagination pagination={data.pagination} onPageChange={(page) => setFilter("page", page)} onLimitChange={(limit) => setFilter("limit", limit)} />
              </>
            ) : (
              <AdminEmpty icon="night_sight_auto" title="Không có người dùng hoạt động" subtitle="Tăng khoảng thời gian lên 1 giờ hoặc 24 giờ để kiểm tra thêm" />
            )}
          </AdminSection>
          </div>
        )}
      </div>
    </div>
  );
}
