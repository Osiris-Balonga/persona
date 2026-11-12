import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActivityChart } from "@/components/activity/activity-chart";
import styles from "@/components/activity/activity.module.css";
import { requireLocale } from "@/lib/locale";
import { activityBadgeKey, activityHistoryDisclosureKey } from "@/lib/activity-environment";
import { localizedMetadata } from "@/lib/site";
import { serverConfig } from "@/lib/server-config";
import { getUsageStats } from "@/lib/usage-stats";
import { fillUsageWindow } from "@/lib/usage-stats-core";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Activity" });
  return localizedMetadata(locale, "/activity", t("metadataTitle"), t("metadataDescription"));
}

export default async function ActivityPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Activity");
  const formatNumber = new Intl.NumberFormat(locale);
  const formatDate = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
  const historyDisclosureKey = activityHistoryDisclosureKey(serverConfig.analyticsEnvironment);
  let stats: Awaited<ReturnType<typeof getUsageStats>> | null = null;
  try {
    stats = await getUsageStats();
  } catch (error) {
    console.error("Persona activity statistics are unavailable", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className={styles.description}>{t("description")}</p>
          {historyDisclosureKey && <p className={styles.historyDisclosure}>{t(historyDisclosureKey)}</p>}
        </div>

        <section className={styles.panel} aria-label={t("period")}>
          <div className={styles.summary}>
            <div className={styles.badge}><span aria-hidden="true" />{t(activityBadgeKey(serverConfig.analyticsEnvironment))}</div>
            <div className={styles.total}>{stats ? formatNumber.format(stats.total) : "—"}<span aria-hidden="true">✳</span></div>
            <h2>{t("totalLabel")}</h2>
            <p className={styles.period}>{t("period")}</p>
            <div className={styles.summaryBottom}>
              <div><strong>{stats ? formatNumber.format(stats.today) : "—"}</strong><span>{t("today")}</span></div>
              <div><strong>{stats ? formatNumber.format(stats.activeDays) : "—"}</strong><span>{t("activeDays")}</span></div>
            </div>
          </div>

          <div className={styles.visual}>
            <div className={styles.chartHeading}>
              <div><h2>{t("chartTitle")}</h2><p>{t("chartSubtitle")}</p></div>
              <span>{t("period")}</span>
            </div>
            {stats === null ? (
              <div className={styles.chartState} role="status"><strong>{t("errorTitle")}</strong><p>{t("errorDescription")}</p></div>
            ) : (
              <ActivityChart points={fillUsageWindow(stats.points, stats.window.from, stats.window.today)} locale={locale} />
            )}
            <div className={styles.chartBottom}>
              <span><i aria-hidden="true" />{t("chartLegend")}</span>
              {stats?.firstDay && <span>{t("firstData", { date: formatDate.format(new Date(`${stats.firstDay}T12:00:00Z`)) })}</span>}
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
