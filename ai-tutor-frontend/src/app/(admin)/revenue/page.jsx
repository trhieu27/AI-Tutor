import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminRevenue } from "@/services/admin.service";
import { ADMIN_TEXTS } from "@/constants/texts";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminMetric,
  AdminPageIntro,
  AdminSection,
  AdminSelect,
  AdminStatusPill,
  AdminTable,
  BarList,
  RevenueBars,
  formatDate,
  formatNumber,
  formatVnd,
} from "@/components/admin/AdminPrimitives";

function currentYearRange() {
  const now = new Date();
  return {
    from: `${now.getFullYear()}-01-01`,
    to: now.toISOString().slice(0, 10),
    groupBy: "month",
  };
}

export default function AdminRevenuePage() {
  const [filters, setFilters] = useState(currentYearRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchAdminRevenue(filters));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const breakdownItems = useMemo(() => (data?.planBreakdown || []).map((item) => ({
    id: item.plan_id,
    label: item.plan?.display_name || item.plan_id,
    count: item.revenue,
  })), [data]);

  return (
    <div>
      <AdminPageIntro title={ADMIN_TEXTS.revenue.title} subtitle={ADMIN_TEXTS.revenue.subtitle} />

      <div className="space-y-5 p-4 sm:p-6">
        <AdminSection>
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
              Từ ngày
              <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="premium-input h-10 px-3" />
            </label>
            <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
              Đến ngày
              <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="premium-input h-10 px-3" />
            </label>
            <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
              Nhóm theo
              <AdminSelect value={filters.groupBy} onChange={(event) => setFilters((current) => ({ ...current, groupBy: event.target.value }))}>
                <option value="day">Ngày</option>
                <option value="month">Tháng</option>
                <option value="year">Năm</option>
              </AdminSelect>
            </label>
          </div>
        </AdminSection>

        {loading ? (
          <AdminLoading variant="revenue" />
        ) : error ? (
          <AdminError message={error} onRetry={load} />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <AdminMetric icon="payments" label={ADMIN_TEXTS.revenue.total} value={formatVnd(data.totalRevenue)} helper="Trong khoảng đã chọn" tone="green" />
              <AdminMetric icon="calendar_month" label={ADMIN_TEXTS.revenue.month} value={formatVnd(data.monthlyRevenue)} helper="Tất cả gói" tone="blue" />
              <AdminMetric icon="event_available" label={ADMIN_TEXTS.revenue.year} value={formatVnd(data.yearlyRevenue)} helper="Tất cả gói" />
              <AdminMetric icon="repeat" label={ADMIN_TEXTS.revenue.monthlyPlan} value={formatVnd(data.monthlyPlanRevenue)} helper="Doanh thu gói tháng" tone="warm" />
              <AdminMetric icon="workspace_premium" label={ADMIN_TEXTS.revenue.annualPlan} value={formatVnd(data.annualPlanRevenue)} helper="Doanh thu gói năm" tone="green" />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
              <AdminSection title={ADMIN_TEXTS.revenue.chart}>
                <RevenueBars series={data.revenueSeries || []} />
              </AdminSection>
              <AdminSection title={ADMIN_TEXTS.revenue.breakdown} subtitle={`${formatNumber(data.conversionStats?.proUsers)} Pro hiện tại`}>
                <BarList items={breakdownItems} valueKey="count" />
                <div className="border-t border-[var(--border-subtle)] p-4">
                  <AdminStatusPill tone="green" icon="trending_up">
                    {ADMIN_TEXTS.revenue.conversion}: {data.conversionStats?.freeToProConversionRate || 0}%
                  </AdminStatusPill>
                </div>
              </AdminSection>
            </div>

            <AdminSection title={ADMIN_TEXTS.revenue.transactions}>
              {(data.transactions || []).length ? (
                <AdminTable columns={["Người dùng", "Gói", "Số tiền", "Nhà cung cấp", "Ngày thanh toán"]} minWidth="900px">
                  {data.transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                      <td className="px-4 py-3">
                        <p className="max-w-52 truncate text-[13px] font-bold text-[var(--foreground)]">{tx.user?.full_name || "Người dùng"}</p>
                        <p className="max-w-52 truncate text-[11px] font-semibold text-[var(--muted)]">{tx.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[var(--foreground)]">{tx.plan?.display_name || tx.plan_id}</td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[var(--foreground)]">{formatVnd(tx.amount_vnd)}</td>
                      <td className="px-4 py-3"><AdminStatusPill tone="blue">{tx.provider || "Không rõ"}</AdminStatusPill></td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-[var(--muted)]">{formatDate(tx.paid_at)}</td>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <AdminEmpty icon="payments" title="Chưa có giao dịch" subtitle="Thanh toán thành công sẽ xuất hiện tại đây" />
              )}
            </AdminSection>
          </>
        )}
      </div>
    </div>
  );
}
