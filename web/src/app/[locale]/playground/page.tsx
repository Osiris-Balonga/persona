import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Playground } from "@/components/playground";
import { requireLocale } from "@/lib/locale";
import { getCoverageData } from "@/lib/coverage-loader";
import { localizedMetadata } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Playground" });
  return localizedMetadata(locale, "/playground", t("title"), t("description"));
}

export default async function PlaygroundPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Playground");
  const coverageT = await getTranslations("Coverage");
  const coverage = await getCoverageData();
  const coverageSourceLabel = coverage.source.kind === "live"
    ? coverageT("sourceLive", { version: coverage.source.version })
    : coverage.source.kind === "snapshot"
      ? coverageT("sourceSnapshot", { date: coverage.source.date })
      : coverageT("sourceUnavailable");
  return (
    <main
      data-playground
      className="mx-auto w-full max-w-7xl px-5 pb-14 pt-8 md:px-8 md:pt-10"
    >
      <div className="playground-enter mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--persona-strong-muted)]">
            {t("eyebrow")}
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-[var(--persona-copy)]">{t("description")}</p>
          <p className="mt-1 text-xs text-[var(--persona-quiet)]" role="note">{coverageSourceLabel}</p>
        </div>
        <p className="hidden border-l border-[var(--persona-line)] pl-5 text-xs leading-5 text-[var(--persona-copy)] xl:block">
          {t("aside")}
        </p>
      </div>
      <Suspense
        fallback={
          <div className="grid min-h-[36rem] gap-5 lg:grid-cols-2">
            <div className="animate-pulse bg-[var(--persona-soft-surface)]" />
            <div className="animate-pulse bg-[var(--persona-soft-surface)]" />
          </div>
        }
      >
        <Playground coverageRows={coverage.rows} />
      </Suspense>
    </main>
  );
}
