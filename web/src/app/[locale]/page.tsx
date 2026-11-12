import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PersonaSlider, PersonaSliderSkeleton } from "@/components/persona-slider";
import { getFeaturedPeople, type FeaturedPerson } from "@/lib/featured-personas";
import { getCoverageData } from "@/lib/coverage-loader";
import { requireLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Home" });
  return localizedMetadata(locale, "", t("title"), t("description"));
}

const benefits = [
  { key: "keyless", imagePosition: "0%" },
  { key: "seed", imagePosition: "33.333%" },
  { key: "coverage", imagePosition: "66.667%" },
  { key: "portraits", imagePosition: "100%" },
] as const;

async function FeaturedSlider({ locale, label, ageLabel, error }: { locale: string; label: string; ageLabel: string; error: string }) {
  const country = (await headers()).get("x-vercel-ip-country");
  let people: FeaturedPerson[] = [];
  try {
    people = await getFeaturedPeople(country);
  } catch { /* The slider renders a recoverable error without failing the page. */ }
  return <PersonaSlider people={people} locale={locale} label={label} ageLabel={ageLabel} error={error} />;
}

export default async function Home({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const coverage = await getCoverageData();
  const liveCoverage = coverage.source.kind === "live" ? coverage : null;
  const countryCount = liveCoverage ? String(liveCoverage.rows.length.toLocaleString(locale)) : "—";
  const availableCountries = liveCoverage ? String(liveCoverage.rows.filter((row) => row.status === "available").length.toLocaleString(locale)) : "—";
  const pendingCountries = liveCoverage ? String(liveCoverage.rows.filter((row) => row.status === "pending-name-review").length.toLocaleString(locale)) : "—";
  const portraitCount = liveCoverage ? String(liveCoverage.portraits?.total.toLocaleString(locale) ?? "—") : "—";
  const portraitContexts = liveCoverage ? String(liveCoverage.portraits?.contexts.length ?? "—") : "—";

  return (
    <main className="bg-[var(--persona-surface)] dark:bg-background">
      <section className="mx-auto grid w-full max-w-7xl items-center gap-7 px-5 pb-9 pt-8 md:min-h-[min(760px,calc(100svh-76px))] md:grid-cols-[1fr_1fr] md:px-8 md:pb-7 md:pt-7 lg:gap-10">
        <div className="order-2 mx-auto max-w-[570px] text-center md:order-1 md:mx-0 md:text-left">
          <p className="persona-reveal mb-5 text-[0.64rem] font-medium uppercase tracking-[0.28em] text-[var(--persona-strong-muted)]">{t("eyebrow")}</p>
          <h1 className="persona-reveal persona-reveal-delay-1 max-w-[620px] text-[clamp(2.65rem,4.4vw,4rem)] font-bold leading-[1.08] tracking-[-0.035em] text-foreground">
            {t("titleStart")}{" "}<span className="text-primary">{t("titleBlue")}</span>{" "}{t("titleAnd")}{" "}<span className="text-[#19c991]">{t("titleGreen")}</span>
          </h1>
          <p className="persona-reveal persona-reveal-delay-2 mx-auto mt-4 max-w-[490px] text-[0.96rem] leading-[1.55] text-[var(--persona-copy)] md:mx-0">{t("description")}</p>
          <div className="persona-reveal persona-reveal-delay-3 mt-5 flex flex-wrap justify-center gap-3 md:justify-start">
            <Button asChild className="h-10 min-w-35 rounded-none px-5 text-xs">
              <Link href="/docs">{t("readDocs")} <ArrowRight aria-hidden="true" /></Link>
            </Button>
            <Button asChild variant="outline" className="h-10 min-w-35 rounded-none border-[#323745] px-5 text-xs">
              <Link href="/playground">{t("tryApi")} <ArrowRight aria-hidden="true" /></Link>
            </Button>
          </div>
          <p className="persona-reveal persona-reveal-delay-3 mt-3 text-[0.68rem] text-[var(--persona-quiet)]">{t("note")}</p>
        </div>
        <div className="order-1 w-full min-w-0 md:order-2">
          <Suspense fallback={<PersonaSliderSkeleton label={t("sliderLabel")} loading={t("sliderLoading")} />}>
            <FeaturedSlider locale={locale} label={t("sliderLabel")} ageLabel={t("ageLabel")} error={t("sliderError")} />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-9 pt-5 md:px-8" aria-label={t("benefitsLabel")}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
          {benefits.map(({ key, imagePosition }) => (
              <div key={key} className="persona-benefit persona-reveal persona-reveal-delay-3 flex min-w-0 items-center gap-3">
              <div aria-hidden="true" className="persona-benefit-image h-28 w-[42%] shrink-0 bg-no-repeat sm:h-32 lg:h-28" style={{ backgroundSize: "400% auto", backgroundPosition: `${imagePosition} center` }} />
              <div className="persona-benefit-copy min-w-0">
                <h2 className="text-[0.79rem] font-semibold leading-5 text-[var(--persona-ink)]">{key === "coverage" ? t("coverageTitle", { count: countryCount }) : key === "portraits" ? t("portraitsTitle", { count: portraitCount }) : t(`${key}Title`)}</h2>
                <p className="mt-1 text-[0.7rem] leading-[1.5] text-[var(--persona-copy)]">{key === "coverage" ? liveCoverage ? t("coverageDescription", { available: availableCountries, pending: pendingCountries }) : t("countsUnavailable") : key === "portraits" ? liveCoverage ? t("portraitsDescription", { contexts: portraitContexts }) : t("countsUnavailable") : t(`${key}Description`)}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[0.68rem] text-[var(--persona-quiet)]" role="note">
          {liveCoverage ? t("countsSource", { version: liveCoverage.meta?.dataVersion ?? "—" }) : t("countsUnavailable")}
        </p>
      </section>
    </main>
  );
}
