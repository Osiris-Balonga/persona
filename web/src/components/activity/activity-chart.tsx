"use client";

import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { UsagePoint } from "@/lib/usage-stats-core";
import styles from "./activity.module.css";

export function ActivityChart({ points, locale }: { points: UsagePoint[]; locale: string }) {
  const t = useTranslations("Activity");
  const dateFormatter = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric", month: "short", timeZone: "UTC",
  });
  const numberFormatter = new Intl.NumberFormat(locale);
  const dateLabel = (period: string) => dateFormatter.format(new Date(`${period}T12:00:00Z`));
  const config = { profiles: { label: t("chartLegend"), color: "#2ee6a6" } } satisfies ChartConfig;

  return (
    <div className={styles.chart} role="img" aria-label={t("chartAccessibility")}>
      <ChartContainer config={config} className={styles.chartContainer}>
        <AreaChart accessibilityLayer data={points} margin={{ top: 12, right: 5, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="activity-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-profiles)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-profiles)" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,.19)" />
          <XAxis
            dataKey="period"
            axisLine={false}
            tickLine={false}
            minTickGap={34}
            tickMargin={11}
            tick={{ fill: "#d0daff", fontSize: 11 }}
            tickFormatter={dateLabel}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={42}
            domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax / 500) * 500)]}
            tick={{ fill: "#d0daff", fontSize: 11 }}
            tickFormatter={(value: number) => numberFormatter.format(value)}
          />
          <ChartTooltip
            cursor={{ stroke: "#fff", strokeWidth: 1, strokeDasharray: "4 4" }}
            allowEscapeViewBox={{ x: false, y: false }}
            wrapperStyle={{ zIndex: 5, pointerEvents: "none" }}
            content={
              <ChartTooltipContent
                className={styles.chartTooltip}
                labelFormatter={(_, payload) => dateLabel(String(payload[0]?.payload?.period ?? ""))}
                formatter={(value) => (
                  <span className={styles.chartTooltipValue}>
                    <i aria-hidden="true" />
                    {t("chartLegend")}
                    <strong>{numberFormatter.format(Number(value))}</strong>
                  </span>
                )}
              />
            }
          />
          <Area
            type="linear"
            dataKey="profiles"
            stroke="var(--color-profiles)"
            strokeWidth={3}
            fill="url(#activity-area-fill)"
            dot={false}
            activeDot={{ r: 5, fill: "#2ee6a6", stroke: "#1b2c8a", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
      <ul className="sr-only">
        {points.map((point) => <li key={point.period}>{t("pointAccessibility", { date: dateLabel(point.period), count: point.profiles })}</li>)}
      </ul>
    </div>
  );
}
