import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { routing } from "@/i18n/routing";
import { requireLocale } from "@/lib/locale";
import { siteOrigin } from "@/lib/site";
import "../globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { metadataBase: new URL(siteOrigin), title: t("title"), description: t("description"), applicationName: "Persona" };
}

export default async function LocaleLayout({ children, params }: Props) {
  const locale = requireLocale((await params).locale);
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning className={`${poppins.variable} ${poppins.className} antialiased`}>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
            <Analytics />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
