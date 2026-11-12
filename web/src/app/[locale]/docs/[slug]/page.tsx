import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DocsArticle } from "@/components/docs/docs-article";
import { docSlugs, docs, isDocSlug } from "@/lib/docs-content";
import { requireLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/site";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return [...docSlugs.filter((slug) => slug !== "ai-usage"), "quickstart"].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: value, slug } = await params;
  if (!isDocSlug(slug)) notFound();
  const locale = requireLocale(value);
  const page = docs[locale].pages[slug];
  return localizedMetadata(locale, slug === "quickstart" ? "/docs" : `/docs/${slug}`, page.title, page.description);
}

export default async function DocPage({ params }: Props) {
  const { locale: value, slug } = await params;
  if (!isDocSlug(slug)) notFound();
  const locale = requireLocale(value);
  setRequestLocale(locale);
  if (slug === "quickstart") redirect(`/${locale}/docs`);
  return <DocsArticle locale={locale} slug={slug} />;
}
