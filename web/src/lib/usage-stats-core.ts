export type UsagePoint = {
  period: string;
  profiles: number;
};

export type UsageSummary = {
  points: UsagePoint[];
  total: number;
  today: number;
  activeDays: number;
  firstDay: string | null;
};

export function usageWindow(now: Date) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - 29);
  const to = new Date(today);
  to.setUTCDate(to.getUTCDate() + 1);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    today: today.toISOString().slice(0, 10),
  };
}

export function fillUsageWindow(points: UsagePoint[], from: string, today: string): UsagePoint[] {
  const counts = new Map(points.map((point) => [point.period, point.profiles]));
  const day = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${today}T00:00:00Z`);
  const series: UsagePoint[] = [];

  while (day <= last) {
    const period = day.toISOString().slice(0, 10);
    series.push({ period, profiles: counts.get(period) ?? 0 });
    day.setUTCDate(day.getUTCDate() + 1);
  }

  return series;
}

export function summarizeUsage(value: unknown, today: string): UsageSummary {
  if (!value || typeof value !== "object" || !("points" in value) || !Array.isArray(value.points)) {
    throw new Error("Invalid analytics response");
  }

  const points = value.points.map((point: unknown) => {
    if (!point || typeof point !== "object" || !("period" in point) || !("profiles" in point)
      || typeof point.period !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(point.period)
      || typeof point.profiles !== "number" || !Number.isSafeInteger(point.profiles) || point.profiles < 0) {
      throw new Error("Invalid analytics point");
    }
    return { period: point.period, profiles: point.profiles };
  }).sort((a, b) => a.period.localeCompare(b.period));

  if (new Set(points.map((point) => point.period)).size !== points.length) {
    throw new Error("Duplicate analytics period");
  }

  return {
    points,
    total: points.reduce((sum, point) => sum + point.profiles, 0),
    today: points.find((point) => point.period === today)?.profiles ?? 0,
    activeDays: points.filter((point) => point.profiles > 0).length,
    firstDay: points[0]?.period ?? null,
  };
}
