import { useId, useMemo } from "react";
import { LineChart } from "@mui/x-charts/LineChart";
import { AdminEmpty } from "./AdminPrimitives";

// Formatting helpers

function fmtVnd(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

function fmtVndFull(v) {
  return new Intl.NumberFormat("vi-VN").format(v) + " ₫";
}

function fmtNumber(v) {
  return new Intl.NumberFormat("vi-VN").format(Number(v || 0));
}

function fmtPercent(v) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(Number(v || 0))}%`;
}

function cssVar(name, fallback = "") {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name)?.trim() || fallback;
}

function formatPeriodLabel(value) {
  const parts = String(value || "").split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  if (parts.length === 2) return `T${Number(parts[1])}/${parts[0].slice(2)}`;
  return String(value || "");
}

/** Biểu đồ doanh thu dạng area — gradient stroke với vùng tô mờ */
export function RevenueAreaChart({ series = [], height = 340 }) {
  const rawId = useId();
  const gradientKey = rawId.replace(/:/g, "");
  const lineGradientId = `admin-revenue-stroke-${gradientKey}`;
  const areaGradientId = `admin-revenue-area-${gradientKey}`;
  const hasData = series.length > 0 && series.some((d) => d.revenue > 0);

  const { xLabels, revenueData } = useMemo(() => {
    let items = series;
    // Nếu chỉ có 1 điểm, thêm điểm 0 phía trước để line chart vẽ được đường
    if (items.length === 1) {
      items = [{ date: "", revenue: 0 }, ...items];
    }
    return {
      xLabels: items.map((d) => d.date),
      revenueData: items.map((d) => d.revenue ?? 0),
    };
  }, [series]);

  if (!hasData) {
    return <AdminEmpty icon="show_chart" subtitle="Chưa có dữ liệu doanh thu" />;
  }

  const brandPrimary = cssVar("--brand-primary", "#16a34a");
  const brandSecondary = cssVar("--brand-secondary-strong", "#2563eb");
  const brandWarm = cssVar("--brand-warm", "#f59e0b");
  const muted = cssVar("--muted", "#6b7280");
  const borderSubtle = cssVar("--border-subtle", "#e5e7eb");

  return (
    <div className="px-1 pt-2 pb-1">
      <LineChart
        height={height}
        series={[
          {
            data: revenueData,
            label: "Doanh thu",
            color: brandPrimary,
            area: true,
            curve: "monotoneX",
            showMark: false,
            valueFormatter: fmtVndFull,
          },
        ]}
        xAxis={[
          {
            data: xLabels,
            scaleType: "point",
            valueFormatter: formatPeriodLabel,
            tickLabelStyle: {
              fontSize: 11,
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 600,
              fill: muted,
            },
            tickLabelInterval: (_, i) => {
              if (xLabels.length <= 8) return true;
              const step = Math.ceil(xLabels.length / 7);
              return i % step === 0;
            },
          },
        ]}
        yAxis={[
          {
            min: 0,
            valueFormatter: fmtVnd,
            tickLabelStyle: {
              fontSize: 10,
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 600,
              fill: muted,
            },
          },
        ]}
        grid={{ horizontal: true }}
        slotProps={{
          legend: { hidden: true },
        }}
        sx={{
          "& svg": { overflow: "visible" },
          "& .MuiChartsAxis-line": { stroke: borderSubtle },
          "& .MuiChartsAxis-tick": { stroke: "transparent" },
          "& .MuiChartsGrid-line": { stroke: borderSubtle, strokeDasharray: "3 3" },
          "& .MuiLineChart-area": {
            fill: `url(#${areaGradientId}) !important`,
            fillOpacity: 1,
            pointerEvents: "none",
          },
          "& .MuiLineChart-line": {
            stroke: `url(#${lineGradientId}) !important`,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 3,
            filter: "drop-shadow(0 8px 12px color-mix(in oklch, var(--brand-primary) 18%, transparent))",
          },
        }}
      >
        <defs>
          <linearGradient id={lineGradientId} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={brandWarm} />
            <stop offset="46%" stopColor={brandPrimary} />
            <stop offset="100%" stopColor={brandSecondary} />
          </linearGradient>
          <linearGradient id={areaGradientId} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={brandPrimary} stopOpacity="0.3" />
            <stop offset="38%" stopColor={brandSecondary} stopOpacity="0.14" />
            <stop offset="72%" stopColor={brandPrimary} stopOpacity="0.045" />
            <stop offset="100%" stopColor={brandPrimary} stopOpacity="0" />
          </linearGradient>
        </defs>
      </LineChart>
    </div>
  );
}

/** Đồng hồ tỷ lệ chuyển đổi Free → Pro */
export function ConversionGauge({ value = 0, label = "Tỷ lệ người dùng Pro", proUsers = 0, freeUsers = 0 }) {
  const rate = Math.min(Math.max(Number(value || 0), 0), 100);
  const pro = Number(proUsers || 0);
  const free = Number(freeUsers || 0);
  return (
    <div className="admin-pro-meter" aria-label={`${label}: ${fmtPercent(rate)}`}>
      <div className="admin-pro-meter-head">
        <span>{label}</span>
        <strong>{fmtPercent(rate)}</strong>
      </div>
      <div className="admin-pro-meter-track" aria-hidden="true">
        <span className="admin-pro-meter-fill" style={{ width: `${rate}%` }} />
      </div>
      <div className="admin-pro-meter-foot">
        <span><strong>{fmtNumber(pro)}</strong> Pro</span>
        <span><strong>{fmtNumber(free)}</strong> Free</span>
      </div>
    </div>
  );
}
