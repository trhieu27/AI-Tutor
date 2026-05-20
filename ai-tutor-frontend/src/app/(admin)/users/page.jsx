import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminUserDetail,
  fetchAdminUsers,
  updateAdminSubscription,
  updateAdminUser,
} from "@/services/admin.service";
import { ADMIN_TEXTS } from "@/constants/texts";
import Button from "@/components/ui/Button";
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
  formatAdminRole,
  formatAdminStatus,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@/components/admin/AdminPrimitives";

const ROLE_OPTIONS = [
  { value: "STUDENT", label: "Học viên" },
  { value: "ADMIN", label: "Quản trị" },
];
const STATUS_OPTIONS = [
  { value: "active", label: "Đang hoạt động" },
  { value: "blocked", label: "Đã khóa" },
  { value: "deleted", label: "Đã xóa" },
];
const PLAN_OPTIONS = [
  { id: "", label: "Tất cả gói" },
  { id: "free", label: "Miễn phí" },
  { id: "pro", label: "Pro" },
  { id: "pro_monthly", label: "Pro tháng" },
  { id: "pro_annual", label: "Pro năm" },
];

function roleTone(role) {
  return role === "ADMIN" ? "blue" : "neutral";
}

function statusTone(status) {
  if (status === "active") return "green";
  if (status === "blocked") return "rose";
  return "neutral";
}

function planLabel(user) {
  return user.plan?.display_name || user.subscription?.plan_name || (user.is_pro ? "Pro" : "Miễn phí");
}

function UserActions({ user, onDetail, onPatch }) {
  const blocked = user.status === "blocked";
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Button variant="ghost" size="sm" icon="visibility" onClick={() => onDetail(user.id)}>{ADMIN_TEXTS.users.actions.detail}</Button>
      <Button variant={blocked ? "secondary" : "ghost"} size="sm" icon={blocked ? "lock_open" : "block"} onClick={() => onPatch(user.id, { status: blocked ? "active" : "blocked" })}>
        {blocked ? ADMIN_TEXTS.users.actions.unblock : ADMIN_TEXTS.users.actions.block}
      </Button>
      <Button variant="ghost" size="sm" icon="admin_panel_settings" onClick={() => onPatch(user.id, { role: user.role === "ADMIN" ? "STUDENT" : "ADMIN" })}>
        {user.role === "ADMIN" ? ADMIN_TEXTS.users.actions.makeStudent : ADMIN_TEXTS.users.actions.makeAdmin}
      </Button>
    </div>
  );
}

function UserMobileCard({ user, onDetail, onPatch }) {
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-[var(--premium-shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-bold text-[var(--foreground)]">{user.full_name}</h3>
          <p className="truncate text-[12px] font-semibold text-[var(--muted)]">{user.email}</p>
          <p className="mt-1 truncate text-[11px] font-semibold text-[var(--muted)]">{user.student_id || "Chưa có MSSV"}</p>
        </div>
        <AdminStatusPill tone={statusTone(user.status)}>{formatAdminStatus(user.status)}</AdminStatusPill>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-bold">
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-2 text-[var(--muted)]">{planLabel(user)}</span>
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-2 text-[var(--muted)]">{formatNumber(user.document_count)} tài liệu</span>
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-2 text-[var(--muted)]">{formatNumber(user.ai_usage_today)} AI</span>
      </div>
      <div className="mt-3">
        <UserActions user={user} onDetail={onDetail} onPatch={onPatch} />
      </div>
    </article>
  );
}

function UserDetailPanel({ detail, onClose, onPatch, onAssignPlan, savingPlan }) {
  const [planId, setPlanId] = useState(detail?.subscription?.plan_id || "free");

  useEffect(() => {
    setPlanId(detail?.subscription?.plan_id || "free");
  }, [detail?.user?.id, detail?.subscription?.plan_id]);

  if (!detail) return null;
  const user = detail.user;

  return (
    <AdminSection
      title={ADMIN_TEXTS.users.detail.title}
      subtitle={user.email}
      action={<Button variant="ghost" size="sm" icon="close" onClick={onClose}>Đóng</Button>}
    >
      <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          <section>
            <p className="text-[12px] font-bold text-[var(--muted)]">{ADMIN_TEXTS.users.detail.profile}</p>
            <div className="mt-3 space-y-2 text-[13px] font-semibold">
              <p className="truncate text-[var(--foreground)]">{user.full_name}</p>
              <p className="truncate text-[var(--muted)]">{user.student_id || "Chưa có MSSV"}</p>
              <div className="flex flex-wrap gap-2">
                <AdminStatusPill tone={roleTone(user.role)}>{formatAdminRole(user.role)}</AdminStatusPill>
                <AdminStatusPill tone={statusTone(user.status)}>{formatAdminStatus(user.status)}</AdminStatusPill>
                <AdminStatusPill tone={user.is_pro ? "green" : "neutral"}>{detail.plan?.display_name || "Miễn phí"}</AdminStatusPill>
              </div>
            </div>
          </section>

          <section className="border-t border-[var(--border-subtle)] pt-4">
            <p className="text-[12px] font-bold text-[var(--muted)]">{ADMIN_TEXTS.users.detail.quota}</p>
            <div className="mt-3 grid gap-2 text-[12px] font-bold">
              <span className="flex justify-between rounded-[var(--radius-chip)] bg-[var(--surface)] px-3 py-2"><span>Tài liệu</span><span>{formatNumber(detail.quotaUsage.documents)}</span></span>
              <span className="flex justify-between rounded-[var(--radius-chip)] bg-[var(--surface)] px-3 py-2"><span>Hỏi AI</span><span>{formatNumber(detail.quotaUsage.chat_messages)}</span></span>
              <span className="flex justify-between rounded-[var(--radius-chip)] bg-[var(--surface)] px-3 py-2"><span>Tạo nội dung</span><span>{formatNumber(detail.quotaUsage.ai_generations)}</span></span>
            </div>
          </section>

          <section className="border-t border-[var(--border-subtle)] pt-4">
            <p className="text-[12px] font-bold text-[var(--muted)]">{ADMIN_TEXTS.users.detail.adminActions}</p>
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <AdminSelect value={planId} onChange={(event) => setPlanId(event.target.value)} className="min-w-0 flex-1">
                  <option value="free">Miễn phí</option>
                  <option value="pro_monthly">Pro tháng</option>
                  <option value="pro_annual">Pro năm</option>
                </AdminSelect>
                <Button loading={savingPlan} variant="primary" icon="workspace_premium" onClick={() => onAssignPlan(user.id, planId)}>
                  {ADMIN_TEXTS.users.actions.assignPlan}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <Button key={role.value} variant={user.role === role.value ? "secondary" : "ghost"} size="sm" onClick={() => onPatch(user.id, { role: role.value })}>{role.label}</Button>
                ))}
                {STATUS_OPTIONS.map((status) => (
                  <Button key={status.value} variant={user.status === status.value ? "secondary" : "ghost"} size="sm" onClick={() => onPatch(user.id, { status: status.value })}>{status.label}</Button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section>
            <p className="text-[12px] font-bold text-[var(--muted)]">{ADMIN_TEXTS.users.detail.documents}</p>
            <div className="mt-3 max-h-64 overflow-auto rounded-[var(--radius-panel)] border border-[var(--border-subtle)] custom-scrollbar">
              {(detail.documents || []).length ? detail.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-3 py-2 last:border-0">
                  <span className="min-w-0 truncate text-[12px] font-bold text-[var(--foreground)]">{doc.file_name}</span>
                  <AdminStatusPill tone={doc.status === "READY" ? "green" : doc.status === "FAILED" ? "rose" : "warm"}>{formatAdminStatus(doc.status)}</AdminStatusPill>
                </div>
              )) : <AdminEmpty icon="folder_open" title="Chưa có tài liệu" subtitle="" />}
            </div>
          </section>

          <section>
            <p className="text-[12px] font-bold text-[var(--muted)]">{ADMIN_TEXTS.users.detail.sessions}</p>
            <div className="mt-3 max-h-56 overflow-auto rounded-[var(--radius-panel)] border border-[var(--border-subtle)] custom-scrollbar">
              {(detail.sessions || []).length ? detail.sessions.map((session) => (
                <div key={session.id} className="border-b border-[var(--border-subtle)] px-3 py-2 last:border-0">
                  <p className="truncate text-[12px] font-bold text-[var(--foreground)]">{session.user_agent || "Thiết bị không rõ"}</p>
                  <p className="truncate text-[11px] font-semibold text-[var(--muted)]">{session.ip_address || "IP không rõ"} · {formatDateTime(session.last_active)}</p>
                </div>
              )) : <AdminEmpty icon="devices" title="Chưa có phiên đăng nhập" subtitle="" />}
            </div>
          </section>

          <section>
            <p className="text-[12px] font-bold text-[var(--muted)]">{ADMIN_TEXTS.users.detail.usage}</p>
            <div className="mt-3 max-h-44 overflow-auto rounded-[var(--radius-panel)] border border-[var(--border-subtle)] custom-scrollbar">
              {(detail.usage_logs || []).length ? detail.usage_logs.slice(0, 12).map((log, index) => (
                <div key={`${log.feature}-${log.created_at}-${index}`} className="flex justify-between gap-3 border-b border-[var(--border-subtle)] px-3 py-2 text-[12px] font-bold last:border-0">
                  <span className="truncate text-[var(--foreground)]">{log.feature}</span>
                  <span className="shrink-0 text-[var(--muted)]">{formatDate(log.created_at)}</span>
                </div>
              )) : <AdminEmpty icon="history" title="Chưa có lượt dùng" subtitle="" />}
            </div>
          </section>
        </div>
      </div>
    </AdminSection>
  );
}

export default function AdminUsersPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, search: "", role: "", status: "", plan: "", active: "" });
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchAdminUsers(filters));
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

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      setDetail(await fetchAdminUserDetail(id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const patchUser = async (id, patch) => {
    try {
      await updateAdminUser(id, patch);
      await load();
      if (detail?.user?.id === id) await openDetail(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const assignPlan = async (id, plan_id) => {
    setSavingPlan(true);
    try {
      await updateAdminSubscription(id, { plan_id });
      await load();
      await openDetail(id);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div>
      <AdminPageIntro title={ADMIN_TEXTS.users.title} subtitle="Theo dõi quota, tài liệu, hỏi AI và trạng thái truy cập của từng người học" />

      <div className="space-y-5 p-4 sm:p-6">
        <AdminSection>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.7fr]">
            <AdminInput icon="search" placeholder={ADMIN_TEXTS.users.searchPlaceholder} value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
            <AdminSelect value={filters.role} onChange={(event) => setFilter("role", event.target.value)}>
              <option value="">Tất cả vai trò</option>
              {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </AdminSelect>
            <AdminSelect value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </AdminSelect>
            <AdminSelect value={filters.plan} onChange={(event) => setFilter("plan", event.target.value)}>
              {PLAN_OPTIONS.map((plan) => <option key={plan.id} value={plan.id}>{plan.label}</option>)}
            </AdminSelect>
            <AdminSelect value={filters.active} onChange={(event) => setFilter("active", event.target.value)}>
              <option value="">Tất cả hoạt động</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Không online</option>
            </AdminSelect>
          </div>
        </AdminSection>

        {detailLoading && <AdminLoading variant="detail" />}
        {detail && !detailLoading && (
          <UserDetailPanel
            detail={detail}
            savingPlan={savingPlan}
            onClose={() => setDetail(null)}
            onPatch={patchUser}
            onAssignPlan={assignPlan}
          />
        )}

        {loading ? (
          <AdminLoading variant="table" />
        ) : error ? (
          <AdminError message={error} onRetry={load} />
        ) : (
          <AdminSection title="Danh sách người dùng" subtitle={`${formatNumber(data?.pagination?.total || 0)} tài khoản phù hợp`}>
            {(data?.items || []).length ? (
              <>
                <AdminTable columns={Object.values(ADMIN_TEXTS.users.columns)} minWidth="1120px">
                  {data.items.map((user) => (
                    <tr key={user.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                      <td className="px-4 py-3">
                        <p className="max-w-48 truncate text-[13px] font-bold text-[var(--foreground)]">{user.full_name}</p>
                        <p className="max-w-48 truncate text-[11px] font-semibold text-[var(--muted)]">{user.id}</p>
                      </td>
                      <td className="px-4 py-3"><p className="max-w-56 truncate text-[12px] font-semibold text-[var(--muted)]">{user.email}</p></td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[var(--foreground)]">{user.student_id || "—"}</td>
                      <td className="px-4 py-3"><AdminStatusPill tone={roleTone(user.role)}>{formatAdminRole(user.role)}</AdminStatusPill></td>
                      <td className="px-4 py-3"><AdminStatusPill tone={statusTone(user.status)}>{formatAdminStatus(user.status)}</AdminStatusPill></td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[var(--foreground)]">{planLabel(user)}</td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[var(--foreground)]">{formatNumber(user.document_count)}</td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[var(--foreground)]">{formatNumber(user.ai_usage_today)}</td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-[var(--muted)]">{formatDateTime(user.last_active)}</td>
                      <td className="px-4 py-3 text-right"><UserActions user={user} onDetail={openDetail} onPatch={patchUser} /></td>
                    </tr>
                  ))}
                </AdminTable>
                <div className="space-y-3 p-3 md:hidden">
                  {data.items.map((user) => <UserMobileCard key={user.id} user={user} onDetail={openDetail} onPatch={patchUser} />)}
                </div>
                <AdminPagination pagination={data.pagination} onPageChange={(page) => setFilter("page", page)} />
              </>
            ) : (
              <AdminEmpty icon="group_off" title="Không tìm thấy người dùng" subtitle="Thử đổi bộ lọc hoặc tìm theo email, họ tên, MSSV" />
            )}
          </AdminSection>
        )}
      </div>
    </div>
  );
}
