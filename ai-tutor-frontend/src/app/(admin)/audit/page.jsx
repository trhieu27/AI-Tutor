import { useCallback, useEffect, useState } from "react";
import { fetchAdminAudit } from "@/services/admin.service";
import { ADMIN_TEXTS } from "@/constants/texts";
import {
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminLoading,
  AdminPageIntro,
  AdminPagination,
  AdminSection,
  AdminSelect,
  AdminStatusPill,
  AdminTable,
  formatAuditAction,
  formatAuditTarget,
  formatDateTime,
  formatNumber,
} from "@/components/admin/AdminPrimitives";

function targetTone(type) {
  if (type === "document") return "warm";
  if (type === "plan") return "blue";
  if (type === "user") return "green";
  return "neutral";
}

export default function AdminAuditPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, admin_id: "", action: "", target_type: "", from: "", to: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchAdminAudit(filters));
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
      <AdminPageIntro title={ADMIN_TEXTS.audit.title} subtitle={ADMIN_TEXTS.audit.subtitle} />
      <div className="space-y-5 p-4 sm:p-6">
        <AdminSection>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
            <AdminInput icon="admin_panel_settings" placeholder={ADMIN_TEXTS.audit.filters.admin} value={filters.admin_id} onChange={(event) => setFilter("admin_id", event.target.value)} />
            <AdminSelect value={filters.action} onChange={(event) => setFilter("action", event.target.value)}>
              <option value="">Tất cả hành động</option>
              {ADMIN_TEXTS.audit.actions.map((action) => <option key={action} value={action}>{formatAuditAction(action)}</option>)}
            </AdminSelect>
            <AdminSelect value={filters.target_type} onChange={(event) => setFilter("target_type", event.target.value)}>
              <option value="">Tất cả đối tượng</option>
              <option value="user">{formatAuditTarget("user")}</option>
              <option value="document">{formatAuditTarget("document")}</option>
              <option value="plan">{formatAuditTarget("plan")}</option>
            </AdminSelect>
            <input type="date" value={filters.from} onChange={(event) => setFilter("from", event.target.value)} className="premium-input h-10 px-3" aria-label={ADMIN_TEXTS.audit.filters.from} />
            <input type="date" value={filters.to} onChange={(event) => setFilter("to", event.target.value)} className="premium-input h-10 px-3" aria-label={ADMIN_TEXTS.audit.filters.to} />
          </div>
        </AdminSection>

        {loading ? (
          <AdminLoading variant="table" />
        ) : error ? (
          <AdminError message={error} onRetry={load} />
        ) : (
          <AdminSection title="Dòng thao tác" subtitle={`${formatNumber(data?.pagination?.total || 0)} bản ghi`}>
            {(data?.items || []).length ? (
              <>
                <AdminTable columns={["Thời gian", "Quản trị", "Hành động", "Đối tượng", "Dữ liệu"]} minWidth="1040px">
                  {data.items.map((log) => (
                    <tr key={log.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                      <td className="px-4 py-3 text-[12px] font-semibold text-[var(--muted)]">{formatDateTime(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <p className="max-w-52 truncate text-[13px] font-bold text-[var(--foreground)]">{log.admin?.full_name || log.admin_id}</p>
                        <p className="max-w-52 truncate text-[11px] font-semibold text-[var(--muted)]">{log.admin?.email}</p>
                      </td>
                      <td className="px-4 py-3"><AdminStatusPill tone="blue">{formatAuditAction(log.action)}</AdminStatusPill></td>
                      <td className="px-4 py-3">
                        <AdminStatusPill tone={targetTone(log.target_type)}>{formatAuditTarget(log.target_type)}</AdminStatusPill>
                        <p className="mt-1 max-w-48 truncate text-[11px] font-semibold text-[var(--muted)]">{log.target_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <pre className="max-w-md truncate rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold text-[var(--muted)]">
                          {JSON.stringify(log.metadata || {})}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </AdminTable>
                <div className="space-y-3 p-3 md:hidden">
                  {data.items.map((log) => (
                    <article key={log.id} className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-[var(--premium-shadow-sm)]">
                      <div className="flex flex-wrap gap-2">
                        <AdminStatusPill tone="blue">{formatAuditAction(log.action)}</AdminStatusPill>
                        <AdminStatusPill tone={targetTone(log.target_type)}>{formatAuditTarget(log.target_type)}</AdminStatusPill>
                      </div>
                      <p className="mt-3 truncate text-[13px] font-bold text-[var(--foreground)]">{log.admin?.full_name || log.admin_id}</p>
                      <p className="truncate text-[11px] font-semibold text-[var(--muted)]">{formatDateTime(log.created_at)} · {log.target_id}</p>
                    </article>
                  ))}
                </div>
                <AdminPagination pagination={data.pagination} onPageChange={(page) => setFilter("page", page)} />
              </>
            ) : (
              <AdminEmpty icon="receipt_long" title="Chưa có thao tác admin" subtitle="Các hành động nguy hiểm sẽ được lưu lại tại đây" />
            )}
          </AdminSection>
        )}
      </div>
    </div>
  );
}
