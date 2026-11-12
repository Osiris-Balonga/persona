import type { Metadata } from "next";
import { headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { DocsArticle } from "@/components/docs/docs-article";
import { docs } from "@/lib/docs-content";
import { featuredCountries } from "@/lib/featured-geography";
import { requireLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const page = docs[locale].pages["ai-usage"];
  return localizedMetadata(
    locale,
    "/docs/ai-usage",
    page.title,
    page.description,
  );
}

export default async function AiUsagePage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  const detected = (await headers()).get("x-vercel-ip-country");
  const country = featuredCountries(
    /^[a-z]{2}$/i.test(detected ?? "") ? detected : null,
  )[1];
  return (
    <DocsArticle locale={locale} slug="ai-usage" visitorCountry={country} />
  );
}
