import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAdminOverview } from "@/features/admin/services/admin.service";
import { useAdminRealtime } from "@/features/admin/hooks/useAdminRealtime";
import { ADMIN_TEXTS } from "@/shared/constants/texts";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminMetric,
  AdminPageIntro,
  AdminSection,
  formatDateTime,
  formatNumber,
  formatVnd,
} from "@/features/admin/components/AdminPrimitives";
import { RevenueAreaChart } from "@/features/admin/components/AdminCharts";

const DASHBOARD_PREVIEW_LIMIT = 3;

function UserLine({ user, meta }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0 transition-colors duration-150 hover:bg-[var(--surface)]">
      <div className="min-w-0">
        <p className="break-words text-[13px] font-bold text-[var(--foreground)]">{user?.full_name || "Người dùng"}</p>
        <p className="break-all text-[11px] font-semibold text-[var(--muted)]">{user?.email || "Chưa có email"}</p>
      </div>
      <span className="text-[12px] font-bold text-[var(--foreground)]">{meta}</span>
    </div>
  );
}


export default function AdminOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dataRef = useRef(null);

  const load = useCallback(async () => {
    if (!dataRef.current) {
      setLoading(true);
    }
    setError("");
    try {
      const result = await fetchAdminOverview();
      setData(result);
      dataRef.current = result;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    const intervalId = window.setInterval(load, 60_000);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load]);

  const throttleTimer = useRef(null);
  const lastLoadTime = useRef(0);

  const throttledLoad = useCallback(() => {
    const now = Date.now();
    const THROTTLE_MS = 3000;
    if (throttleTimer.current) return;

    const timeSinceLast = now - lastLoadTime.current;
    if (timeSinceLast >= THROTTLE_MS) {
      load();
      lastLoadTime.current = now;
    } else {
      throttleTimer.current = setTimeout(() => {
        load();
        lastLoadTime.current = Date.now();
        throttleTimer.current = null;
      }, THROTTLE_MS - timeSinceLast);
    }
  }, [load]);

  useEffect(() => {
    return () => {
      if (throttleTimer.current) clearTimeout(throttleTimer.current);
    };
  }, []);

  useAdminRealtime(useCallback((message) => {
    if (message.event === "presence_changed") {
      const { user_id, is_online, user } = message.data || {};
      setData((prev) => {
        if (!prev) return prev;
        let activeUsersList = prev.activeUsersList || [];
        const exists = activeUsersList.some((item) => item.user?.id === user_id);

        if (is_online) {
          if (exists) return prev; // Already tracked — skip duplicate
          if (user) activeUsersList = [...activeUsersList, { user, document_count: 0 }];
        } else {
          if (!exists) return prev; // Not in list — skip
          activeUsersList = activeUsersList.filter((item) => item.user?.id !== user_id);
        }

        const activeUsers = Math.max(0, (prev.activeUsers || 0) + (is_online ? 1 : -1));
        return { ...prev, activeUsers, activeUsersList };
      });
      return;
    }
    if (!["document_status_changed", "subscription_updated", "revenue_updated"].includes(message.event)) return;
    if (document.visibilityState !== "visible") return;
    throttledLoad();
  }, [throttledLoad]));



  return (
    <div>
      <AdminPageIntro title={ADMIN_TEXTS.dashboard.title} subtitle={ADMIN_TEXTS.dashboard.subtitle} />

      <div className="space-y-4 p-4 sm:p-6">
        {loading ? (
          <AdminLoading variant="dashboard" />
        ) : error ? (
          <AdminError message={error} onRetry={load} />
        ) : (
          <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <AdminMetric icon="payments" label={ADMIN_TEXTS.dashboard.metrics.revenueMonth} value={formatVnd(data.monthlyRevenue)} helper={`Hôm nay ${formatVnd(data.revenueToday)}`} tone="green" />
          <AdminMetric icon="online_prediction" label={ADMIN_TEXTS.dashboard.metrics.activeUsers} value={formatNumber(data.activeUsers)} helper={`${formatNumber(data.totalUsers)} tài khoản`} tone="blue" />
          <AdminMetric icon="person_add" label={ADMIN_TEXTS.dashboard.metrics.newUsers} value={formatNumber(data.newUsersThisMonth)} helper={`Hôm nay ${formatNumber(data.newUsersToday)}`} />
        </div>


        <AdminSection title={ADMIN_TEXTS.dashboard.sections.revenue}>
          <RevenueAreaChart series={data.revenueSeries || []} height={320} />
        </AdminSection>

        <div className="grid gap-5 xl:grid-cols-3">
          <AdminSection title={ADMIN_TEXTS.dashboard.sections.activeUsers}>
            {(data.activeUsersList || []).length ? (
              <div className="divide-y divide-[var(--border-subtle)]">
              {data.activeUsersList.slice(0, DASHBOARD_PREVIEW_LIMIT).map((item) => (
                  <UserLine key={item.user?.id} user={item.user} meta={`${item.document_count || 0} tài liệu`} />
                ))}
              </div>
            ) : (
              <AdminEmpty icon="bedtime" title="Chưa có người học online" subtitle="Phiên hoạt động sẽ xuất hiện khi người học thao tác trên hệ thống" />
            )}
          </AdminSection>

          <AdminSection title={ADMIN_TEXTS.dashboard.sections.heavyUsers}>
            {(data.heavyAiUsers || []).length ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.heavyAiUsers.slice(0, DASHBOARD_PREVIEW_LIMIT).map((item) => (
                  <UserLine key={item.user?.id || item.chat_messages} user={item.user} meta={`${formatNumber(item.chat_messages)} hỏi AI`} />
                ))}
              </div>
            ) : (
              <AdminEmpty icon="forum" title="Chưa có lượt hỏi AI hôm nay" subtitle="Danh sách này giúp phát hiện người dùng dùng AI dày đặc" />
            )}
          </AdminSection>

          <AdminSection title={ADMIN_TEXTS.dashboard.sections.recentSubscriptions}>
            {(data.recentSubscriptions || []).length ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.recentSubscriptions.slice(0, DASHBOARD_PREVIEW_LIMIT).map((sub) => (
                  <UserLine key={sub.id} user={sub.user} meta={sub.plan?.display_name || sub.plan_name} />
                ))}
              </div>
            ) : (
              <AdminEmpty icon="workspace_premium" title="Chưa có nâng cấp gần đây" subtitle="Người dùng Pro mới sẽ xuất hiện tại đây" />
            )}
          </AdminSection>
        </div>

          </>
        )}
      </div>
    </div>
  );
}
