import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAdminRevenue, fetchAdminTransactions, readCachedAdminRevenue, readCachedAdminTransactions } from "@/features/admin/services/admin.service";
import { useAdminRealtime } from "@/features/admin/hooks/useAdminRealtime";
import { ADMIN_TEXTS } from "@/shared/constants/texts";
import {
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminLoading,
  AdminMetric,
  AdminPageIntro,
  AdminSection,
  AdminSelect,
  AdminPagination,
  AdminTable,
  BarList,
  formatDate,
  formatNumber,
  formatVnd,
} from "@/features/admin/components/AdminPrimitives";
import { RevenueAreaChart, ConversionGauge } from "@/features/admin/components/AdminCharts";

function currentYearRange() {
  const now = new Date();
  return {
    from: `${now.getFullYear()}-01-01`,
    to: now.toISOString().slice(0, 10),
    groupBy: "month",
  };
}

const INITIAL_FILTERS = currentYearRange();

function TransactionsSection({ from, to }) {
  const [filters, setFilters] = useState({ page: 1, limit: 5, from, to });
  const [data, setData] = useState(() => readCachedAdminTransactions({ page: 1, limit: 5, from, to }));
  const [loading, setLoading] = useState(() => !readCachedAdminTransactions({ page: 1, limit: 5, from, to }));
  const [fetching, setFetching] = useState(false);
  const hasLoaded = useRef(!!data);

  useEffect(() => {
    setFilters((cur) => ({ ...cur, from, to, page: 1 }));
  }, [from, to]);

  const load = useCallback(async () => {
    const cached = readCachedAdminTransactions(filters);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else if (!hasLoaded.current) {
      setLoading(true);
    }
    setFetching(true);
    try {
      const result = await fetchAdminTransactions(filters);
      setData(result);
      hasLoaded.current = true;
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, value) => setFilters((cur) => ({ ...cur, [key]: value, page: key === "page" ? value : 1 }));

  if (loading) return (
    <AdminLoading
      variant="table"
      columns={["Người dùng", "Gói", "Số tiền", "Ngày thanh toán"]}
      widths={["30%", "25%", "20%", "25%"]}
      cellTypes={["twoLine", "text", "text", "text"]}
    />
  );

  const items = data?.items || [];
  const pagination = data?.pagination;

  return (
    <div style={fetching && !loading ? { opacity: 0.5, pointerEvents: 'none', transition: 'opacity 150ms ease' } : { transition: 'opacity 150ms ease' }}>
    <AdminSection title={ADMIN_TEXTS.revenue.transactions} subtitle={pagination ? `${formatNumber(pagination.total)} giao dịch` : undefined}>
      {items.length ? (
        <>
          <AdminTable columns={["Người dùng", "Gói", "Số tiền", "Ngày thanh toán"]} minWidth="800px">
            {items.map((tx) => (
              <tr key={tx.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                <td className="px-4 py-3">
                  <p className="max-w-52 truncate text-[13px] font-bold text-[var(--foreground)]">{tx.user?.full_name || "Người dùng"}</p>
                  <p className="max-w-52 truncate text-[11px] font-semibold text-[var(--muted)]">{tx.user?.email}</p>
                </td>
                <td className="px-4 py-3 text-[12px] font-bold text-[var(--foreground)]">{tx.plan?.display_name || tx.plan_id}</td>
                <td className="px-4 py-3 text-[12px] font-bold text-[var(--foreground)]">{formatVnd(tx.amount_vnd)}</td>
                <td className="px-4 py-3 text-[12px] font-semibold text-[var(--muted)]">{formatDate(tx.paid_at)}</td>
              </tr>
            ))}
          </AdminTable>
          <AdminPagination
            pagination={pagination}
            onPageChange={(p) => setFilter("page", p)}
            onLimitChange={(l) => setFilter("limit", l)}
          />
        </>
      ) : (
        <AdminEmpty icon="payments" title="Chưa có giao dịch" subtitle="Thanh toán thành công sẽ xuất hiện tại đây" />
      )}
    </AdminSection>
    </div>
  );
}

export default function AdminRevenuePage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [data, setData] = useState(() => readCachedAdminRevenue(INITIAL_FILTERS));
  const [loading, setLoading] = useState(() => !readCachedAdminRevenue(INITIAL_FILTERS));
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const cached = readCachedAdminRevenue(filters);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else if (!data) {
      setLoading(true);
    }
    setError("");
    try {
      setData(await fetchAdminRevenue(filters));
    } catch (err) {
      if (!cached) setError(err.message);
      else console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
    if (!["revenue_updated", "subscription_updated"].includes(message.event)) return;
    if (document.visibilityState !== "visible") return;
    throttledLoad();
  }, [throttledLoad]));

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
              <AdminInput type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
            </label>
            <label className="grid gap-1 text-[11px] font-bold text-[var(--muted)]">
              Đến ngày
              <AdminInput type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <AdminMetric icon="payments" label={ADMIN_TEXTS.revenue.total} value={formatVnd(data.totalRevenue)} helper="Trong khoảng đã chọn" tone="green" />
              <AdminMetric icon="calendar_month" label={ADMIN_TEXTS.revenue.month} value={formatVnd(data.monthlyRevenue)} helper="Tất cả gói" tone="blue" />
              <AdminMetric icon="event_available" label={ADMIN_TEXTS.revenue.year} value={formatVnd(data.yearlyRevenue)} helper="Tất cả gói" />
              <AdminMetric icon="repeat" label={ADMIN_TEXTS.revenue.monthlyPlan} value={formatVnd(data.monthlyPlanRevenue)} helper="Doanh thu gói tháng" tone="warm" />
              <AdminMetric icon="workspace_premium" label={ADMIN_TEXTS.revenue.annualPlan} value={formatVnd(data.annualPlanRevenue)} helper="Doanh thu gói năm" tone="green" />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
              <AdminSection title={ADMIN_TEXTS.revenue.chart}>
                <RevenueAreaChart series={data.revenueSeries || []} height={380} />
              </AdminSection>
              <AdminSection title={ADMIN_TEXTS.revenue.breakdown} subtitle={`${formatNumber(data.conversionStats?.proUsers)} Pro hiện tại`}>
                <BarList items={breakdownItems} valueKey="count" formatValue={formatVnd} />
                <div className="border-t border-[var(--border-subtle)] flex items-center justify-center py-2">
                  <ConversionGauge value={data.conversionStats?.freeToProConversionRate || 0} label={ADMIN_TEXTS.revenue.conversion} />
                </div>
              </AdminSection>
            </div>

            <TransactionsSection from={filters.from} to={filters.to} />
          </>
        )}
      </div>
    </div>
  );
}
