import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAdminAudit, readCachedAdminAudit } from "@/features/admin/services/admin.service";
import { ADMIN_TEXTS } from "@/shared/constants/texts";
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
  formatVnd,
} from "@/features/admin/components/AdminPrimitives";

function targetTone(type) {
  if (type === "document") return "warm";
  if (type === "plan") return "blue";
  if (type === "user") return "green";
  return "neutral";
}

function formatAuditMetadata(log, full = false) {
  const meta = log.metadata;
  if (!meta || typeof meta !== "object" || Object.keys(meta).length === 0) return "—";

  const formatRole = (role) => {
    return {
      ADMIN: "Quản trị viên",
      STUDENT: "Học viên",
    }[role] || role;
  };

  const formatStatus = (status) => {
    return {
      active: "Mở",
      blocked: "Khóa",
    }[status] || status;
  };

  const parts = [];

  // 1. Role Change
  if (meta.role && typeof meta.role === "object") {
    parts.push(`Vai trò: ${formatRole(meta.role.from)} → ${formatRole(meta.role.to)}`);
  }

  // 2. Status Change
  if (meta.status && typeof meta.status === "object") {
    parts.push(`Trạng thái: ${formatStatus(meta.status.from)} → ${formatStatus(meta.status.to)}`);
  }

  // 3. Subscription Change
  if (meta.plan_id) {
    const planName = {
      free: "Miễn phí",
      pro_monthly: "Pro Tháng",
      pro_annual: "Pro Năm",
      pro_yearly: "Pro Năm",
    }[meta.plan_id] || meta.plan_id;
    let subStr = `Gói: ${planName}`;
    if (meta.expires_at) {
      subStr += ` (Hết hạn: ${new Date(meta.expires_at).toLocaleDateString("vi-VN")})`;
    }
    parts.push(subStr);
  }

  // 4. Document actions
  if (meta.file_name) {
    parts.push(`Tên file: ${meta.file_name}`);
  }

  // 5. Generic changes / plan updates
  if (parts.length === 0) {
    const keys = Object.keys(meta).filter(
      (k) => !["updated_at", "id", "_id", "updatedAt", "createdAt"].includes(k)
    );
    if (log.action === "PLAN_UPDATED") {
      const planFields = keys.map((k) => {
        const cleanKey = k.replace("quota.", "");
        const label = {
          display_name: "Tên hiển thị",
          price_vnd: "Giá gốc",
          discount_percent: "Khuyến mãi",
          discounted_price_vnd: "Giá sau giảm",
          is_active: "Hoạt động",
          is_popular: "Nổi bật",
          sort_order: "Thứ tự hiển thị",
          chat_per_day: "Lượt chat/ngày",
          ai_generations_per_day: "Lượt AI/ngày",
          max_documents: "Tài liệu tối đa",
          max_file_size_mb: "Dung lượng file tối đa (MB)",
          document_limit: "Hạn mức tài liệu",
          ai_query_limit_daily: "Lượt hỏi AI hàng ngày",
        }[cleanKey] || cleanKey;

        let val = meta[k];
        if (typeof val === "boolean") {
          val = val ? "Có" : "Không";
        } else if (typeof val === "number") {
          if (cleanKey.includes("price")) {
            val = formatVnd(val);
          } else if (cleanKey === "discount_percent") {
            val = `${val}%`;
          } else if (val === -1) {
            val = "Không giới hạn";
          } else {
            val = formatNumber(val);
          }
        }

        if (typeof val === "object" && val !== null) {
          return `${label}: ${JSON.stringify(val)}`;
        }
        return `${label}: ${val}`;
      });
      if (!full) {
        const nameVal = meta.display_name || meta.name;
        if (nameVal) {
          return nameVal;
        }
        if (planFields.length > 3) {
          return `${planFields.slice(0, 3).join(" · ")} · ... (+${planFields.length - 3})`;
        }
      }
      return planFields.join(" · ");
    }

    const generic = keys
      .filter((k) => typeof meta[k] !== "object")
      .map((k) => `${k}: ${meta[k]}`);
    if (generic.length > 0) {
      if (!full && generic.length > 3) {
        return `${generic.slice(0, 3).join(" · ")} · ... (+${generic.length - 3})`;
      }
      return generic.join(" · ");
    }
    return JSON.stringify(meta);
  }

  return parts.join(" | ");
}

const INITIAL_FILTERS = { page: 1, limit: 5, admin_id: "", action: "", target_type: "", from: "", to: "" };

/** Nhật ký admin — ghi lại mọi thao tác quản trị */
export default function AdminAuditPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [data, setData] = useState(() => readCachedAdminAudit(INITIAL_FILTERS));
  const [loading, setLoading] = useState(() => !readCachedAdminAudit(INITIAL_FILTERS));
  const [error, setError] = useState("");

  const [fetching, setFetching] = useState(false);
  const hasLoaded = useRef(!!readCachedAdminAudit(INITIAL_FILTERS));

  const load = useCallback(async () => {
    const cached = readCachedAdminAudit(filters);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else if (!hasLoaded.current) {
      setLoading(true);
    }
    if (!cached) setFetching(true);
    setError("");
    try {
      setData(await fetchAdminAudit(filters));
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

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));

  return (
    <div>
      <AdminPageIntro title={ADMIN_TEXTS.audit.title} subtitle={ADMIN_TEXTS.audit.subtitle} />
      <div className="space-y-5 p-4 sm:p-6">
        <AdminSection>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
              Quản trị viên
              <AdminInput icon="admin_panel_settings" placeholder={ADMIN_TEXTS.audit.filters.admin} value={filters.admin_id} onChange={(event) => setFilter("admin_id", event.target.value)} />
            </label>
            <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
              Hành động
              <AdminSelect value={filters.action} onChange={(event) => setFilter("action", event.target.value)}>
                <option value="">Tất cả hành động</option>
                {ADMIN_TEXTS.audit.actions.map((action) => {
                  const value = typeof action === "object" ? action.value : action;
                  if (!value) return null;
                  return <option key={value} value={value}>{formatAuditAction(action)}</option>;
                })}
              </AdminSelect>
            </label>
            <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
              Đối tượng
              <AdminSelect value={filters.target_type} onChange={(event) => setFilter("target_type", event.target.value)}>
                <option value="">Tất cả đối tượng</option>
                <option value="user">{formatAuditTarget("user")}</option>
                <option value="document">{formatAuditTarget("document")}</option>
                <option value="plan">{formatAuditTarget("plan")}</option>
              </AdminSelect>
            </label>
            <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
              Từ ngày
              <AdminInput type="date" value={filters.from} onChange={(event) => setFilter("from", event.target.value)} aria-label={ADMIN_TEXTS.audit.filters.from} />
            </label>
            <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
              Đến ngày
              <AdminInput type="date" value={filters.to} onChange={(event) => setFilter("to", event.target.value)} aria-label={ADMIN_TEXTS.audit.filters.to} />
            </label>
          </div>
        </AdminSection>

        {loading ? (
          <AdminLoading
            variant="table"
            columns={["Thời gian", "Quản trị", "Hành động", "Đối tượng", "Dữ liệu"]}
            widths={["14%", "22%", "16%", "16%", "32%"]}
            cellTypes={["text", "twoLine", "pill", "pillSub", "longText"]}
          />
        ) : error ? (
          <AdminError message={error} onRetry={load} />
        ) : (
          <div style={fetching && !loading ? { opacity: 0.5, pointerEvents: 'none', transition: 'opacity 150ms ease' } : { transition: 'opacity 150ms ease' }}>
          <AdminSection title="Dòng thao tác" subtitle={`${formatNumber(data?.pagination?.total || 0)} bản ghi`}>
            {(data?.items || []).length ? (
              <>
                <AdminTable columns={["Thời gian", "Quản trị", "Hành động", "Đối tượng", "Dữ liệu"]} minWidth="1040px" widths={["14%", "22%", "16%", "16%", "32%"]}>
                  {data.items.map((log) => (
                    <tr key={log.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                      <td className="px-4 py-3 text-[12px] font-semibold text-[var(--muted)]">{formatDateTime(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <p className="max-w-52 truncate text-[13px] font-bold text-[var(--foreground)]">{log.admin?.full_name || log.admin_id}</p>
                        <p className="max-w-52 truncate text-[11px] font-semibold text-[var(--muted)]">{log.admin?.email}</p>
                      </td>
                      <td className="px-4 py-3"><AdminStatusPill tone="blue">{formatAuditAction(log.action)}</AdminStatusPill></td>
                      <td className="px-4 py-3">
                        <div className="min-w-0 space-y-1.5">
                          <AdminStatusPill tone={targetTone(log.target_type)}>{formatAuditTarget(log.target_type)}</AdminStatusPill>
                          {log.target_type === "user" && log.target_user && (
                            <div className="min-w-0 space-y-0.5">
                              <p className="max-w-[150px] truncate text-[12px] font-bold text-[var(--foreground)]" title={log.target_user.full_name}>
                                {log.target_user.full_name || "Người dùng"}
                              </p>
                              <p className="max-w-[150px] truncate text-[10px] font-semibold text-[var(--muted)]" title={log.target_user.email}>
                                {log.target_user.email}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[340px] truncate text-[12px] font-medium text-[var(--foreground)]" title={formatAuditMetadata(log, true)}>
                          {formatAuditMetadata(log, false)}
                        </div>
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
                      {log.target_type === "user" && log.target_user && (
                        <p className="mt-2 text-[12px] font-semibold text-[var(--foreground)]">
                          Đối tượng: <span className="font-bold text-[var(--brand-secondary)]">{log.target_user.full_name || "Người dùng"}</span> ({log.target_user.email})
                        </p>
                      )}
                      <p className="mt-3 truncate text-[13px] font-bold text-[var(--foreground)]">{log.admin?.full_name || log.admin_id}</p>
                      <p className="truncate text-[11px] font-semibold text-[var(--muted)]">{formatDateTime(log.created_at)}</p>
                    </article>
                  ))}
                </div>
                <AdminPagination pagination={data.pagination} onPageChange={(page) => setFilter("page", page)} onLimitChange={(limit) => setFilter("limit", limit)} />
              </>
            ) : (
              <AdminEmpty icon="receipt_long" title="Chưa có thao tác admin" subtitle="Các hành động nguy hiểm sẽ được lưu lại tại đây" />
            )}
          </AdminSection>
          </div>
        )}
      </div>
    </div>
  );
}
