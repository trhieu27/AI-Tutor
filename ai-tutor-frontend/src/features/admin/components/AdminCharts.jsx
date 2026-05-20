import { useMemo } from "react";
import { LineChart } from "@mui/x-charts/LineChart";
import { Gauge, gaugeClasses } from "@mui/x-charts/Gauge";
import { AdminEmpty } from "./AdminPrimitives";

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmtVnd(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

function fmtVndFull(v) {
  return new Intl.NumberFormat("vi-VN").format(v) + " ₫";
}

function cssVar(name, fallback = "") {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name)?.trim() || fallback;
}

/* ═════════════════════════════════════════════════════════════════════════
   1. RevenueAreaChart — Area chart with gradient fill
      Doanh thu là dòng chảy liên tục → area fill diễn tả tích lũy tốt hơn bar.
      Gradient mờ từ brand-green xuống transparent → premium feel.
   ═════════════════════════════════════════════════════════════════════════ */

export function RevenueAreaChart({ series = [], height = 340 }) {
  const hasData = series.length > 0 && series.some((d) => d.revenue > 0);

  const { xLabels, revenueData } = useMemo(() => ({
    xLabels: series.map((d) => d.date),
    revenueData: series.map((d) => d.revenue ?? 0),
  }), [series]);

  if (!hasData) {
    return <AdminEmpty icon="show_chart" subtitle="Chưa có dữ liệu doanh thu" />;
  }

  const brandPrimary = cssVar("--brand-primary", "#16a34a");
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
            valueFormatter: (v) => {
              // "2026-01-01" → detect grouping by label pattern
              const parts = v.split("-");
              if (parts.length === 2) return parts[0]; // year grouping: "2026"
              if (parts[2] === "01" && series.length <= 12) return `T${Number(parts[1])}`; // month: "T1"
              return `${parts[2]}/${parts[1]}`; // day: "23/05"
            },
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
          "& .MuiChartsAxis-line": { stroke: borderSubtle },
          "& .MuiChartsAxis-tick": { stroke: "transparent" },
          "& .MuiChartsGrid-line": { stroke: borderSubtle, strokeDasharray: "3 3" },
          "& .MuiAreaElement-root": { fillOpacity: 0.15 },
          "& .MuiLineElement-root": { strokeWidth: 2.5 },
        }}
      />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   2. ConversionGauge — half-circle gauge for Free→Pro conversion rate
   ═════════════════════════════════════════════════════════════════════════ */

export function ConversionGauge({ value = 0, label = "Chuyển đổi" }) {
  const brandPrimary = cssVar("--brand-primary", "#16a34a");
  const borderSubtle = cssVar("--border-subtle", "#e5e7eb");
  const foreground = cssVar("--foreground", "#1f2937");

  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <Gauge
        width={140}
        height={80}
        value={value}
        valueMin={0}
        valueMax={100}
        startAngle={-90}
        endAngle={90}
        innerRadius="72%"
        outerRadius="100%"
        cornerRadius={4}
        text={`${value}%`}
        sx={{
          [`& .${gaugeClasses.valueArc}`]: {
            fill: brandPrimary,
          },
          [`& .${gaugeClasses.referenceArc}`]: {
            fill: borderSubtle,
          },
          [`& .${gaugeClasses.valueText}`]: {
            fontSize: 18,
            fontWeight: 800,
            fontFamily: "Inter, system-ui, sans-serif",
            fill: foreground,
          },
        }}
      />
      <span className="text-[11px] font-bold text-[var(--muted)]">{label}</span>
    </div>
  );
}
