"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { config } from "@/lib/config";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { href: "/docs", label: "docs" },
  { href: "/coverage", label: "coverage" },
  { href: "/activity", label: "activity" },
] as const;

export function SiteHeader() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <header className="bg-[var(--persona-surface)] dark:bg-[#111a2a]">
      <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
        <Link href="/" aria-label={`Persona — ${t("home")}`} className="flex items-center">
          <Brand />
        </Link>

        <nav aria-label={t("menu")} className="hidden items-center gap-9 md:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href || (href === "/docs" && pathname.startsWith("/docs/")) ? "page" : undefined}
              className="relative text-[0.82rem] font-medium text-[var(--persona-ink)] transition-colors duration-200 after:absolute after:-bottom-3 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:text-primary hover:after:scale-x-100 aria-[current=page]:text-primary aria-[current=page]:after:scale-x-100 dark:text-[#c7d1e4]"
            >
              {t(label)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="h-9 rounded-none px-3.5 transition-colors duration-200 hover:bg-[var(--persona-hover)] dark:hover:bg-[#202f48]">
            <a href={config.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 leading-none">
              <Image src="/github.svg" alt="" width={16} height={16} className="block shrink-0 dark:invert" />
              <span className="block leading-none">{t("github")}</span>
            </a>
          </Button>
          <Button asChild size="sm" className="h-9 rounded-none px-4">
            <Link href="/playground">{t("playground")} <ArrowRight aria-hidden="true" /></Link>
          </Button>
        </div>

        <div className="ml-auto md:hidden"><ThemeToggle /></div>
        <Sheet>
          <SheetTrigger asChild>
            <Button aria-label={t("menu")} variant="ghost" size="icon" className="md:hidden">
              <Menu aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent showCloseButton={false} className="md:hidden">
            <SheetHeader className="flex-row items-center justify-between border-b border-border">
              <SheetTitle><Brand /></SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t("closeMenu")}><X aria-hidden="true" /></Button>
              </SheetClose>
            </SheetHeader>
            <nav aria-label={t("menu")} className="flex flex-col gap-2 px-4">
              {links.map(({ href, label }) => (
                <SheetClose asChild key={href}>
                  <Link href={href} className="rounded-md px-3 py-2 text-base font-medium hover:bg-muted">{t(label)}</Link>
                </SheetClose>
              ))}
            </nav>
            <SheetClose asChild><Link href="/playground" className="mx-4 mt-2 bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground">{t("playground")}</Link></SheetClose>
            <div className="mt-auto flex items-center justify-end border-t border-border p-4">
              <a className="text-sm font-medium text-primary" href={config.repositoryUrl} target="_blank" rel="noreferrer">{t("github")}</a>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
