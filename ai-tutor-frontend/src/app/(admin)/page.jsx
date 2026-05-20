import { useCallback, useEffect, useState } from "react";
import { fetchAdminOverview } from "@/services/admin.service";
import { ADMIN_TEXTS } from "@/constants/texts";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminMetric,
  AdminPageIntro,
  AdminSection,
  AdminStatusPill,
  BarList,
  RevenueBars,
  formatDateTime,
  formatNumber,
  formatVnd,
} from "@/components/admin/AdminPrimitives";

function UserLine({ user, meta }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0">
      <div className="min-w-0">
        <p className="break-words text-[13px] font-bold text-[var(--foreground)]">{user?.full_name || "Người dùng"}</p>
        <p className="break-all text-[11px] font-semibold text-[var(--muted)]">{user?.email || "Chưa có email"}</p>
      </div>
      <span className="text-[12px] font-bold text-[var(--foreground)]">{meta}</span>
    </div>
  );
}

function DocumentAttentionList({ items }) {
  if (!items?.length) {
    return <AdminEmpty icon="task_alt" title={ADMIN_TEXTS.dashboard.emptyAttention} subtitle="Các tài liệu lỗi sẽ được đưa lên đây để admin xử lý nhanh" />;
  }
  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {items.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-[var(--foreground)]">{doc.file_name}</p>
            <p className="truncate text-[11px] font-semibold text-[var(--muted)]">{doc.owner?.email || doc.owner_id}</p>
          </div>
          <AdminStatusPill tone={doc.status === "FAILED" ? "rose" : "warm"} icon={doc.status === "FAILED" ? "error" : "progress_activity"}>
            {doc.status === "FAILED" ? "Lỗi xử lý" : "Đang xử lý"}
          </AdminStatusPill>
        </div>
      ))}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchAdminOverview());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <AdminPageIntro title={ADMIN_TEXTS.dashboard.title} subtitle={ADMIN_TEXTS.dashboard.subtitle} />

      <div className="space-y-5 p-4 sm:p-6">
        {loading ? (
          <AdminLoading variant="dashboard" />
        ) : error ? (
          <AdminError message={error} onRetry={load} />
        ) : (
          <>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
          <AdminMetric icon="payments" label={ADMIN_TEXTS.dashboard.metrics.revenueMonth} value={formatVnd(data.monthlyRevenue)} helper={`Hôm nay ${formatVnd(data.revenueToday)}`} tone="green" />
          <AdminMetric icon="online_prediction" label={ADMIN_TEXTS.dashboard.metrics.activeUsers} value={formatNumber(data.activeUsers)} helper={`${formatNumber(data.totalUsers)} tài khoản`} tone="blue" />
          <AdminMetric icon="person_add" label={ADMIN_TEXTS.dashboard.metrics.newUsers} value={formatNumber(data.newUsersThisMonth)} helper={`Hôm nay ${formatNumber(data.newUsersToday)}`} />
          <AdminMetric icon="error" label={ADMIN_TEXTS.dashboard.metrics.failedDocs} value={formatNumber(data.failedDocuments)} helper={`${formatNumber(data.processingDocuments)} đang xử lý`} tone={data.failedDocuments > 0 ? "rose" : "neutral"} />
          <AdminMetric icon="forum" label={ADMIN_TEXTS.dashboard.metrics.chatToday} value={formatNumber(data.chatMessagesToday)} helper={`${formatNumber(data.totalChatSessions)} phiên chat`} tone="blue" />
          <AdminMetric icon="auto_awesome" label={ADMIN_TEXTS.dashboard.metrics.generationToday} value={formatNumber(data.aiGenerationsToday)} helper={data.topUsedFeature?.label || "Chưa có kỹ năng nổi bật"} tone="warm" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
          <AdminSection title={ADMIN_TEXTS.dashboard.sections.revenue}>
            <RevenueBars series={data.revenueSeries || []} />
          </AdminSection>
          <AdminSection title={ADMIN_TEXTS.dashboard.sections.featureUsage}>
            <BarList items={data.featureUsage || []} />
          </AdminSection>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <AdminSection title={ADMIN_TEXTS.dashboard.sections.activeUsers}>
            {(data.activeUsersList || []).length ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.activeUsersList.map((session) => (
                  <UserLine key={session.id} user={session.user} meta={formatDateTime(session.last_active)} />
                ))}
              </div>
            ) : (
              <AdminEmpty icon="bedtime" title="Chưa có người học online" subtitle="Phiên hoạt động sẽ xuất hiện khi người học thao tác trong app" />
            )}
          </AdminSection>

          <AdminSection title={ADMIN_TEXTS.dashboard.sections.heavyUsers}>
            {(data.heavyAiUsers || []).length ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.heavyAiUsers.map((item) => (
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
                {data.recentSubscriptions.map((sub) => (
                  <UserLine key={sub.id} user={sub.user} meta={sub.plan?.display_name || sub.plan_name} />
                ))}
              </div>
            ) : (
              <AdminEmpty icon="workspace_premium" title="Chưa có nâng cấp gần đây" subtitle="Người dùng Pro mới sẽ xuất hiện tại đây" />
            )}
          </AdminSection>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <AdminSection title={ADMIN_TEXTS.dashboard.sections.attentionDocs}>
            <DocumentAttentionList items={data.attentionDocuments || []} />
          </AdminSection>

          <AdminSection title={ADMIN_TEXTS.dashboard.sections.alerts}>
            {(data.alerts || []).length ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.alerts.map((alert) => (
                  <div key={alert.type} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-[var(--foreground)]">{alert.title}</p>
                      <p className="text-[11px] font-semibold text-[var(--muted)]">Cần kiểm tra trong khu vận hành</p>
                    </div>
                    <AdminStatusPill tone={alert.severity === "danger" ? "rose" : alert.severity === "warning" ? "warm" : "blue"}>
                      {formatNumber(alert.count)}
                    </AdminStatusPill>
                  </div>
                ))}
              </div>
            ) : (
              <AdminEmpty icon="verified" title="Không có cảnh báo" subtitle="Các luồng học tập chính đang ổn định" />
            )}
          </AdminSection>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
