import { useCallback, useEffect, useState } from "react";
import { fetchAdminActivity } from "@/services/admin.service";
import { ADMIN_TEXTS } from "@/constants/texts";
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
} from "@/components/admin/AdminPrimitives";

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
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-[var(--premium-shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-bold text-[var(--foreground)]">{item.user?.full_name || "Người dùng"}</h3>
          <p className="truncate text-[12px] font-semibold text-[var(--muted)]">{item.user?.email}</p>
        </div>
        <AdminStatusPill tone="green" icon="online_prediction">Đang online</AdminStatusPill>
      </div>
      <div className="mt-3 grid gap-2 text-[11px] font-bold text-[var(--muted)]">
        <span className="truncate rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-2">{compactUserAgent(item.user_agent)}</span>
        <span className="truncate rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-2">{item.ip_address || "IP không rõ"}</span>
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-2">{formatDateTime(item.last_active)}</span>
      </div>
    </article>
  );
}

export default function AdminActivityPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, activeWithinMinutes: 15 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchAdminActivity(filters));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));

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
          <AdminLoading variant="table" />
        ) : error ? (
          <AdminError message={error} onRetry={load} />
        ) : (
          <AdminSection title="Phiên hoạt động" subtitle={`${formatNumber(data?.pagination?.total || 0)} phiên trong ${data?.activeWithinMinutes || filters.activeWithinMinutes} phút`}>
            {(data?.items || []).length ? (
              <>
                <AdminTable columns={Object.values(ADMIN_TEXTS.activity.columns)} minWidth="980px">
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                      <td className="px-4 py-3">
                        <p className="max-w-52 truncate text-[13px] font-bold text-[var(--foreground)]">{item.user?.full_name || "Người dùng"}</p>
                        <p className="max-w-52 truncate text-[11px] font-semibold text-[var(--muted)]">{item.user?.email}</p>
                      </td>
                      <td className="px-4 py-3"><p className="max-w-72 truncate text-[12px] font-semibold text-[var(--muted)]">{compactUserAgent(item.user_agent)}</p></td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[var(--foreground)]">{item.ip_address || "—"}</td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-[var(--muted)]">{formatDateTime(item.last_active)}</td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[var(--foreground)]">{formatNumber(item.document_count)}</td>
                      <td className="px-4 py-3"><AdminStatusPill tone={item.recent_usage_count > 0 ? "blue" : "neutral"}>{formatNumber(item.recent_usage_count)}</AdminStatusPill></td>
                    </tr>
                  ))}
                </AdminTable>
                <div className="space-y-3 p-3 md:hidden">
                  {data.items.map((item) => <ActivityCard key={item.id} item={item} />)}
                </div>
                <AdminPagination pagination={data.pagination} onPageChange={(page) => setFilter("page", page)} />
              </>
            ) : (
              <AdminEmpty icon="night_sight_auto" title="Không có người dùng hoạt động" subtitle="Tăng khoảng thời gian lên 1 giờ hoặc 24 giờ để kiểm tra thêm" />
            )}
          </AdminSection>
        )}
      </div>
    </div>
  );
}
