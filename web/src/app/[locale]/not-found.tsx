import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFoundPage() {
  const t = await getTranslations("NotFound");
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-20 md:px-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-primary">404</p>
      <h1 className="mt-4 text-4xl font-bold">{t("title")}</h1>
      <p className="mt-4 text-muted-foreground">{t("description")}</p>
      <Link href="/" className="mt-8 inline-block font-medium text-primary underline-offset-4 hover:underline">{t("home")} →</Link>
    </main>
  );
}
