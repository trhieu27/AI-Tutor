import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  fetchAdminUserDetail,
  fetchAdminUsers,
  readCachedAdminUsers,
  updateAdminSubscription,
  updateAdminUser,
} from "@/features/admin/services/admin.service";
import { useAdminRealtime } from "@/features/admin/hooks/useAdminRealtime";
import { ADMIN_TEXTS } from "@/shared/constants/texts";
import Button from "@/shared/ui/Button";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import { Skeleton } from "@/shared/ui/States";
import {
  AdminActionButton,
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
} from "@/features/admin/components/AdminPrimitives";

const ROLE_OPTIONS = [
  { value: "STUDENT", label: "Học viên" },
  { value: "ADMIN", label: "Quản trị" },
];
const STATUS_OPTIONS = [
  { value: "active", label: "Tài khoản mở" },
  { value: "blocked", label: "Đã khóa" },
  { value: "deleted", label: "Đã xóa" },
];
const PLAN_OPTIONS = [
  { id: "", label: "Tất cả gói" },
  { id: "free", label: "Miễn phí" },
  { id: "pro_monthly", label: "Pro tháng" },
  { id: "pro_annual", label: "Pro năm" },
];
const INITIAL_FILTERS = { page: 1, limit: 5, search: "", status: "", plan: "", active: "" };

function parseUserAgent(ua) {
  if (!ua) return "Thiết bị không rõ";
  let browser = "Trình duyệt";
  if (/Edg/i.test(ua)) browser = "Edge";
  else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  let os = "";
  if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/iPad/i.test(ua)) os = "iPad";
  else if (/Mac OS/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";
  return os ? `${browser} · ${os}` : browser;
}

function buildOnlinePinFilters(filters) {
  return {
    ...filters,
    page: 1,
    limit: 100,
    active: "true",
  };
}

function roleTone(role) {
  return role === "ADMIN" ? "blue" : "neutral";
}

function statusTone(status) {
  if (status === "active") return "green";
  if (status === "blocked") return "rose";
  return "neutral";
}

function isUserOnline(user) {
  return Boolean(user?._online) && user?.status !== "blocked" && user?.status !== "deleted";
}

function activityTone(user) {
  if (user?.status === "blocked") return "rose";
  if (user?.status === "deleted") return "neutral";
  return isUserOnline(user) ? "green" : "neutral";
}

function formatUserActivityStatus(user) {
  if (user?.status === "blocked" || user?.status === "deleted") return formatAdminStatus(user.status);
  return isUserOnline(user) ? "Đang online" : "Không online";
}

function isUserPro(user) {
  return user?.plan && user.plan.id !== 'free';
}

function planLabel(user) {
  if (!isUserPro(user)) return "Miễn phí";
  return user.plan?.display_name || "Pro";
}

function UserActions({ user, onDetail, onPatch }) {
  const blocked = user.status === "blocked";
  return (
    <div className="admin-action-group" aria-label="Thao tác người dùng">
      <AdminActionButton icon="info" onClick={() => onDetail(user.id)}>{ADMIN_TEXTS.users.actions.detail}</AdminActionButton>
      <AdminActionButton icon={blocked ? "lock_open" : "lock"} tone={blocked ? "green" : "rose"} onClick={() => onPatch(user.id, { status: blocked ? "active" : "blocked" })}>
        {blocked ? ADMIN_TEXTS.users.actions.unblock : ADMIN_TEXTS.users.actions.block}
      </AdminActionButton>
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
        <AdminStatusPill tone={activityTone(user)}>{formatUserActivityStatus(user)}</AdminStatusPill>
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

function UserDetailSkeleton() {
  return (
    <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[0.78fr_1.22fr]">
      <div className="space-y-5">
        <section className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-[var(--radius-chip)]" />
            <Skeleton className="h-7 w-24 rounded-[var(--radius-chip)]" />
          </div>
        </section>
        <section className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-chip)]" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-chip)]" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-chip)]" />
        </section>
      </div>
      <div className="space-y-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-panel)]" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-44 w-full rounded-[var(--radius-panel)]" />
      </div>
    </div>
  );
}

function UserDetailDialog({ detail, loading, onClose, onPatch, onAssignPlan, savingPlan }) {
  const [planId, setPlanId] = useState(detail?.subscription?.plan_id || "free");
  const [patching, setPatching] = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { actionKey, title, message, variant, patch }

  useEffect(() => {
    setPlanId(detail?.subscription?.plan_id || "free");
  }, [detail?.user?.id, detail?.subscription?.plan_id]);

  const handleConfirmAction = (actionKey, confirmConfig, patch) => {
    if (!confirmConfig) {
      // No confirm needed (e.g. already in that state), execute directly
      executePatch(actionKey, patch);
      return;
    }
    setConfirmState({ actionKey, ...confirmConfig, patch });
  };

  const executePatch = async (actionKey, patch) => {
    setConfirmState(null);
    setPatching(actionKey);
    try {
      await onPatch(detail?.user?.id, patch);
    } finally {
      setPatching(null);
    }
  };

  useEffect(() => {
    if (!detail && !loading) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [detail, loading, onClose]);

  if (!detail && !loading) return null;
  const user = detail?.user;

  return createPortal((
    <div className="admin-dialog-root fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5" role="presentation">
      <button type="button" className="admin-dialog-backdrop absolute inset-0" aria-label="Đóng chi tiết người dùng" onClick={onClose} />
      <section
        className="admin-user-dialog relative flex w-full max-w-6xl flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--premium-shadow-md)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-detail-title"
      >
        <header className="admin-user-dialog-header flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="admin-section-title-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-panel)]">
              <span className="material-symbols-outlined icon-strong text-[19px]" aria-hidden="true">manage_accounts</span>
            </span>
            <div className="min-w-0">
              <h2 id="admin-user-detail-title" className="truncate text-[16px] font-[780] leading-5 text-[var(--foreground)]">
                {ADMIN_TEXTS.users.detail.title}
              </h2>
              {loading ? (
                <Skeleton className="mt-1 h-3 w-40" />
              ) : (
                <p className="mt-1 truncate text-[12px] font-semibold text-[var(--muted)]">{user?.email}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            aria-label="Đóng chi tiết người dùng"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[21px]" aria-hidden="true">close</span>
          </button>
        </header>


        <div className="admin-user-dialog-body min-h-0 flex-1 overflow-hidden">
          {loading ? <div className="overflow-y-auto custom-scrollbar p-4 sm:p-5"><UserDetailSkeleton /></div> : (
      <div className="flex h-full flex-col overflow-y-auto custom-scrollbar xl:flex-row xl:overflow-hidden">
        <div className="min-w-0 shrink-0 space-y-5 p-4 sm:p-5 xl:w-[38%] xl:overflow-y-auto xl:custom-scrollbar">
          <section>
            <p className="text-[12px] font-bold text-[var(--muted)]">{ADMIN_TEXTS.users.detail.profile}</p>
            <div className="mt-3 space-y-2 text-[13px] font-semibold">
              <p className="truncate text-[var(--foreground)]">{user.full_name}</p>
              <p className="truncate text-[var(--muted)]">{user.student_id || "Chưa có MSSV"}</p>
              <div className="flex flex-wrap gap-2">
                <AdminStatusPill tone={roleTone(user.role)}>{formatAdminRole(user.role)}</AdminStatusPill>
                <AdminStatusPill tone={statusTone(user.status)}>{formatAdminStatus(user.status)}</AdminStatusPill>
                {user.status === "active" && (
                  <AdminStatusPill tone={activityTone(user)}>{formatUserActivityStatus(user)}</AdminStatusPill>
                )}
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
                  <Button
                    key={role.value}
                    variant={user.role === role.value ? "secondary" : "ghost"}
                    size="sm"
                    loading={patching === `role_${role.value}`}
                    onClick={() => handleConfirmAction(
                      `role_${role.value}`,
                      user.role === role.value ? null : { title: "Đổi vai trò", message: `Đổi vai trò thành "${role.label}"?`, variant: "warning" },
                      { role: role.value }
                    )}
                  >{role.label}</Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-2">
                <Button
                  variant={user.status === "blocked" ? "secondary" : "ghost"}
                  size="sm"
                  icon="lock"
                  loading={patching === "status_blocked"}
                  onClick={() => handleConfirmAction(
                    "status_blocked",
                    user.status === "blocked" ? null : { title: "Khóa tài khoản", message: `Khóa tài khoản "${user.full_name}"? Người dùng sẽ không thể đăng nhập.`, variant: "warning" },
                    { status: user.status === "blocked" ? "active" : "blocked" }
                  )}
                >
                  {user.status === "blocked" ? "Đã khóa" : "Khóa tài khoản"}
                </Button>
                <Button
                  variant={user.status === "deleted" ? "secondary" : "ghost"}
                  size="sm"
                  icon="delete"
                  loading={patching === "status_deleted"}
                  className={user.status !== "deleted" ? "!text-[var(--brand-rose)] hover:!bg-[var(--danger-soft)]" : ""}
                  onClick={() => handleConfirmAction(
                    "status_deleted",
                    user.status === "deleted" ? null : { title: "Xóa tài khoản", message: `Xóa tài khoản "${user.full_name}"? Hành động này không thể hoàn tác.`, variant: "danger" },
                    { status: user.status === "deleted" ? "active" : "deleted" }
                  )}
                >
                  {user.status === "deleted" ? "Đã xóa" : "Xóa tài khoản"}
                </Button>
              </div>
            </div>
          </section>
        </div>

        <div className="min-w-0 flex-1 space-y-5 border-t border-[var(--border-subtle)] p-4 sm:p-5 xl:border-l xl:border-t-0 xl:overflow-y-auto xl:custom-scrollbar">
          <section>
            <p className="text-[12px] font-bold text-[var(--muted)]">{ADMIN_TEXTS.users.detail.documents}</p>
            <div className="mt-3 overflow-auto rounded-[var(--radius-panel)] border border-[var(--border-subtle)] custom-scrollbar">
              {(detail.documents || []).length ? detail.documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-3 py-2 last:border-0">
                  <span className="min-w-0 truncate text-[12px] font-bold text-[var(--foreground)]">{doc.file_name}</span>
                  <AdminStatusPill tone={doc.status === "READY" ? "green" : doc.status === "FAILED" ? "rose" : "warm"}>{formatAdminStatus(doc.status)}</AdminStatusPill>
                </div>
              )) : <AdminEmpty icon="folder_open" title="Chưa có tài liệu" subtitle="" />}
            </div>
          </section>

          <section>
            <p className="text-[12px] font-bold text-[var(--muted)]">{ADMIN_TEXTS.users.detail.sessions}</p>
            <div className="mt-3 overflow-auto rounded-[var(--radius-panel)] border border-[var(--border-subtle)] custom-scrollbar">
              {(detail.sessions || []).length ? detail.sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="border-b border-[var(--border-subtle)] px-3 py-2 last:border-0">
                  <p className="truncate text-[12px] font-bold text-[var(--foreground)]">{parseUserAgent(session.user_agent)}</p>
                  <p className="truncate text-[11px] font-semibold text-[var(--muted)]">{session.ip_address || "IP không rõ"} · {formatDateTime(session.last_active)}</p>
                </div>
              )) : <AdminEmpty icon="devices" title="Chưa có phiên đăng nhập" subtitle="" />}
            </div>
          </section>

          <section>
            <p className="text-[12px] font-bold text-[var(--muted)]">{ADMIN_TEXTS.users.detail.usage}</p>
            <div className="mt-3 overflow-auto rounded-[var(--radius-panel)] border border-[var(--border-subtle)] custom-scrollbar">
              {(detail.usage_logs || []).length ? detail.usage_logs.slice(0, 5).map((log, index) => (
                <div key={`${log.feature}-${log.created_at}-${index}`} className="flex justify-between gap-3 border-b border-[var(--border-subtle)] px-3 py-2 text-[12px] font-bold last:border-0">
                  <span className="truncate text-[var(--foreground)]">{log.feature}</span>
                  <span className="shrink-0 text-[var(--muted)]">{formatDate(log.created_at)}</span>
                </div>
              )) : <AdminEmpty icon="history" title="Chưa có lượt dùng" subtitle="" />}
            </div>
          </section>
        </div>
      </div>
          )}
        </div>

        <ConfirmDialog
          open={!!confirmState}
          title={confirmState?.title || ""}
          message={confirmState?.message || ""}
          variant={confirmState?.variant || "warning"}
          confirmLabel="Xác nhận"
          cancelLabel="Hủy"
          onConfirm={() => confirmState && executePatch(confirmState.actionKey, confirmState.patch)}
          onCancel={() => setConfirmState(null)}
        />
      </section>
    </div>
  ), document.body);
}

/** Quản lý người dùng — danh sách, chi tiết, khoá/mở và thay đổi gói */
export default function AdminUsersPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [data, setData] = useState(() => readCachedAdminUsers(INITIAL_FILTERS));
  const [onlinePins, setOnlinePins] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(() => !readCachedAdminUsers(INITIAL_FILTERS));
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [error, setError] = useState("");

  const [fetching, setFetching] = useState(false);
  const hasLoaded = useRef(!!readCachedAdminUsers(INITIAL_FILTERS));
  const activeQueryRef = useRef("");

  const load = useCallback(async () => {
    const queryStr = JSON.stringify(filters);
    activeQueryRef.current = queryStr;

    const cached = readCachedAdminUsers(filters);
    const shouldFetchOnlinePins = filters.active !== "false";
    const onlinePinFilters = buildOnlinePinFilters(filters);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else if (!hasLoaded.current) {
      setLoading(true);
    }
    if (!cached) setFetching(true);
    setError("");
    try {
      const [nextData, nextOnlinePins] = await Promise.all([
        fetchAdminUsers(filters),
        shouldFetchOnlinePins ? fetchAdminUsers(onlinePinFilters) : Promise.resolve({ items: [] }),
      ]);
      
      if (activeQueryRef.current !== queryStr) return;

      setData(nextData);
      setOnlinePins(nextOnlinePins?.items || []);
      hasLoaded.current = true;
    } catch (err) {
      if (activeQueryRef.current !== queryStr) return;
      if (!cached) setError(err.message);
      else console.error(err.message);
    } finally {
      if (activeQueryRef.current === queryStr) {
        setLoading(false);
        setFetching(false);
      }
    }
  }, [filters]);

  const refreshUsers = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const queryStr = JSON.stringify(filters);
    const shouldFetchOnlinePins = filters.active !== "false";
    const onlinePinFilters = buildOnlinePinFilters(filters);
    try {
      const [nextData, nextOnlinePins] = await Promise.all([
        fetchAdminUsers(filters),
        shouldFetchOnlinePins ? fetchAdminUsers(onlinePinFilters) : Promise.resolve({ items: [] }),
      ]);
      
      if (activeQueryRef.current !== queryStr) return;

      setData(nextData);
      setOnlinePins(nextOnlinePins?.items || []);
      setError("");
    } catch (err) {
      console.error(err.message);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshUsers();
    };
    const intervalId = window.setInterval(refreshUsers, 60_000);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshUsers]);

  const detailUserId = detail?.user?.id;
  useAdminRealtime(useCallback((message) => {
    if (message.event === "presence_changed") {
      const { user_id, is_online, last_active, online_until } = message.data || {};
      if (!user_id) return;
      // Optimistic: update user online status in-place, no refetch
      const patchPresence = (items) =>
        items?.map((user) =>
          user.id === user_id ? { ...user, is_online, last_active: last_active || user.last_active, online_until: online_until || user.online_until } : user
        );
      setData((prev) => prev ? { ...prev, items: patchPresence(prev.items) } : prev);
      setOnlinePins((prev) => {
        if (is_online) {
          // Add to pins if not already there
          const exists = prev.some((user) => user.id === user_id);
          if (!exists) {
            // Refetch to get full user data for the pin
            refreshUsers();
            return prev;
          }
          return patchPresence(prev);
        }
        // Remove from pins when offline
        return prev.filter((user) => user.id !== user_id);
      });
      if (detailUserId === user_id) {
        fetchAdminUserDetail(user_id).then(setDetail).catch(console.error);
      }
      return;
    }
    if (!["usage_recorded", "chat_message_created", "user_updated", "subscription_updated"].includes(message.event)) return;
    refreshUsers();
    const updatedUserId = message.data?.user_id || message.data?.id;
    if (updatedUserId && detailUserId === updatedUserId) {
      fetchAdminUserDetail(updatedUserId).then(setDetail).catch(console.error);
    }
  }, [refreshUsers, detailUserId]));

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));

  const [searchInput, setSearchInput] = useState(filters.search);
  const searchTimer = useRef(null);
  const handleSearch = (value) => {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setFilter("search", value), 400);
  };
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const openDetail = async (id) => {
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await fetchAdminUserDetail(id));
    } catch (err) {
      console.error(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = useCallback(() => {
    setDetail(null);
    setDetailLoading(false);
  }, []);

  const patchUser = async (id, patch) => {
    // Optimistic: update UI immediately
    if (detail?.user?.id === id) {
      setDetail((prev) => prev ? { ...prev, user: { ...prev.user, ...patch } } : prev);
    }
    setData((prev) => {
      if (!prev?.items) return prev;
      return { ...prev, items: prev.items.map((user) => user.id === id ? { ...user, ...patch } : user) };
    });
    try {
      await updateAdminUser(id, patch);
      load(); // background refresh, no await
    } catch (err) {
      console.error(err.message);
      load(); // revert on error
    }
  };

  const assignPlan = async (id, plan_id) => {
    setSavingPlan(true);
    try {
      await updateAdminSubscription(id, { plan_id });
      await load();
      await openDetail(id);
    } catch (err) {
      console.error(err.message);
    } finally {
      setSavingPlan(false);
    }
  };

  const visibleUsers = useMemo(() => {
    const pageLimit = Number(data?.pagination?.limit || filters.limit || 20);
    const pinItems = filters.page === 1 && filters.active !== "false"
      ? onlinePins.map((user) => ({ ...user, _online: true }))
      : [];
    const onlineIds = new Set(pinItems.map((user) => user.id));
    const seen = new Set();
    return [...pinItems, ...(data?.items || []).map((user) => onlineIds.has(user.id) ? { ...user, _online: true } : user)]
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const onlineDelta = Number(isUserOnline(b.item)) - Number(isUserOnline(a.item));
        if (onlineDelta !== 0) return onlineDelta;
        return a.index - b.index;
      })
      .map(({ item }) => item)
      .slice(0, pageLimit);
  }, [data?.items, data?.pagination?.limit, filters.active, filters.limit, filters.page, onlinePins]);

  return (
    <div>
      <AdminPageIntro title={ADMIN_TEXTS.users.title} subtitle="Theo dõi hạn mức, tài liệu, lượt hỏi AI và trạng thái truy cập của từng người học" />

      <div className="space-y-5 p-4 sm:p-6">
        <AdminSection>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr]">
            <AdminInput icon="search" placeholder={ADMIN_TEXTS.users.searchPlaceholder} value={searchInput} onChange={(event) => handleSearch(event.target.value)} />
            <AdminSelect value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </AdminSelect>
            <AdminSelect value={filters.plan} onChange={(event) => setFilter("plan", event.target.value)}>
              {PLAN_OPTIONS.map((plan) => <option key={plan.id} value={plan.id}>{plan.label}</option>)}
            </AdminSelect>
            <AdminSelect value={filters.active} onChange={(event) => setFilter("active", event.target.value)}>
              <option value="">Tất cả hoạt động</option>
              <option value="true">Đang online</option>
              <option value="false">Không online</option>
            </AdminSelect>
          </div>
        </AdminSection>

        {(detailLoading || detail) && (
          <UserDetailDialog
            detail={detail}
            loading={detailLoading}
            savingPlan={savingPlan}
            onClose={closeDetail}
            onPatch={patchUser}
            onAssignPlan={assignPlan}
          />
        )}

        {loading ? (
          <AdminLoading
            variant="table"
            columns={Object.values(ADMIN_TEXTS.users.columns)}
            widths={["20%", "10%", "28%", "18%", "14%", "10%"]}
            cellTypes={["text", "text", "longText", "twoLine", "pillSub", "actions"]}
          />
        ) : error ? (
          <AdminError message={error} onRetry={load} />
        ) : (
          <div style={fetching && !loading ? { opacity: 0.5, pointerEvents: 'none', transition: 'opacity 150ms ease' } : { transition: 'opacity 150ms ease' }}>
          <AdminSection title="Danh sách người dùng" subtitle={`${formatNumber(data?.pagination?.total || 0)} tài khoản phù hợp`}>
            {visibleUsers.length ? (
              <>
                <AdminTable columns={Object.values(ADMIN_TEXTS.users.columns)} minWidth="980px" widths={["20%", "10%", "28%", "18%", "14%", "10%"]}>
                  {visibleUsers.map((user) => (
                    <tr key={user.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                      <td className="px-4 py-4">
                        <div className="min-w-0 space-y-2">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-[780] text-[var(--foreground)]">{user.full_name || "Người dùng"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[120px] truncate px-4 py-4 text-[12px] font-bold text-[var(--foreground)]">
                        {user.student_id || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <p className="truncate text-[12px] font-semibold text-[var(--muted)]">{user.email}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-[12px] font-[780] text-[var(--foreground)]">{planLabel(user)}</p>
                          <p className="truncate text-[11px] font-semibold text-[var(--muted)]">
                            {formatNumber(user.document_count)} tài liệu · {formatNumber(user.ai_usage_today)} AI
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                          <AdminStatusPill tone={activityTone(user)}>{formatUserActivityStatus(user)}</AdminStatusPill>
                      </td>
                      <td className="px-4 py-4 text-left">
                        <UserActions user={user} onDetail={openDetail} onPatch={patchUser} />
                      </td>
                    </tr>
                  ))}
                </AdminTable>
                <div className="space-y-3 p-3 md:hidden">
                  {visibleUsers.map((user) => <UserMobileCard key={user.id} user={user} onDetail={openDetail} onPatch={patchUser} />)}
                </div>
                <AdminPagination pagination={data.pagination} onPageChange={(page) => setFilter("page", page)} onLimitChange={(limit) => setFilter("limit", limit)} />
              </>
            ) : (
              <AdminEmpty icon="group_off" title="Không tìm thấy người dùng" subtitle="Thử đổi bộ lọc hoặc tìm theo email, họ tên, MSSV" />
            )}
          </AdminSection>
          </div>
        )}
      </div>
    </div>
  );
}