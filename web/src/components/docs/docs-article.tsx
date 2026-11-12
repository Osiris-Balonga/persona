import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { docHref, docs, type DocLocale, type DocSlug } from "@/lib/docs-content";
import { config } from "@/lib/config";
import { CodeBlock } from "./code-block";
import { CopyCode } from "./copy-code";
import { AiUsagePrompt } from "./ai-usage-prompt";

function InlineText({ value }: { value: string }) {
  return value.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={index} className="rounded-[3px] bg-[var(--persona-soft-surface)] px-1.5 py-0.5 font-mono text-[0.88em] text-[var(--persona-strong-muted)]">{part.slice(1, -1)}</code>
    ) : part,
  );
}

export function DocsArticle({ locale, slug, visitorCountry }: { locale: DocLocale; slug: DocSlug; visitorCountry?: string }) {
  const dictionary = docs[locale];
  const page = dictionary.pages[slug];

  const navigation = (
    <nav aria-label={dictionary.label} className="space-y-7">
      {dictionary.navigation.map((group) => (
        <div key={group.title}>
          <p className="flex items-center gap-2 px-3 text-[0.84rem] font-semibold text-[var(--persona-ink)]">
            {group.title}
            {group.items.some((item) => item.slug === "ai-usage") && (
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary" />
            )}
          </p>
          <div className="mt-2 space-y-0.5">
            {group.items.map((item) => (
              <Link
                key={item.slug}
                href={docHref(item.slug)}
                aria-current={item.slug === slug ? "page" : undefined}
                className="block rounded-md px-3 py-2 text-[0.83rem] leading-snug text-[var(--persona-copy)] transition-[background-color,color,transform] duration-200 hover:translate-x-0.5 hover:bg-[var(--persona-hover)] hover:text-primary focus-visible:outline-2 focus-visible:outline-primary aria-[current=page]:bg-[var(--persona-hover)] aria-[current=page]:font-semibold aria-[current=page]:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="w-full bg-[var(--persona-surface)]">
    <div className="docs-shell mx-auto grid w-full max-w-7xl grid-cols-1 gap-0 px-5 md:grid-cols-[216px_minmax(0,1fr)] md:px-8 xl:grid-cols-[232px_minmax(0,1fr)_204px]">
      <aside className="hidden pb-20 pt-9 md:block">
        <div className="docs-nav-scroll sticky top-7 max-h-[calc(100vh-3.5rem)] overflow-y-auto pr-5">{navigation}</div>
      </aside>

      <main className="min-w-0 pb-20 pt-8 md:px-10 md:pt-12 lg:px-14 xl:pl-28 xl:pr-12">
        <details className="docs-mobile-nav mb-10 rounded-md border border-[var(--persona-line)] bg-[var(--persona-surface)] p-3 md:hidden">
          <summary className="cursor-pointer list-none text-sm font-semibold text-primary">{dictionary.label} <span aria-hidden="true" className="float-right">⌄</span></summary>
          <div className="pt-5">{navigation}</div>
        </details>

        <article className="docs-enter mx-auto max-w-[770px]">
          <p className="mb-2 text-[0.8rem] font-semibold text-primary">{dictionary.label}</p>
          <h1 className="text-[2rem] font-bold leading-[1.15] tracking-[-0.035em] text-[var(--persona-ink)] sm:text-[2.5rem]">{page.title}</h1>
          <p className="mt-4 max-w-[65ch] text-[0.95rem] leading-7 text-[var(--persona-copy)]">{page.description}</p>

          {slug === "quickstart" && (
            <div className="mt-8 flex min-w-0 items-center justify-between gap-3 rounded-md bg-[var(--persona-soft-surface)] px-4 py-3 font-mono text-[0.8rem] text-primary sm:text-sm">
              <span className="min-w-0 break-all sm:whitespace-nowrap">{config.peopleUrl}</span>
              <CopyCode theme="light" value={config.peopleUrl} copyLabel={dictionary.copy} copiedLabel={dictionary.copied} announcement={dictionary.copiedDescription} />
            </div>
          )}

          <div className="mt-9 space-y-11">
            {page.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-8">
                <h2 className="text-[1.3rem] font-semibold leading-snug tracking-[-0.025em] text-[var(--persona-ink)]">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-[0.88rem] leading-[1.8] text-[var(--persona-copy)]"><InlineText value={paragraph} /></p>
                ))}
                {section.code && (
                  <div className="mt-4"><CodeBlock value={section.code.value} language={section.code.language} copyLabel={dictionary.copy} copiedLabel={dictionary.copied} announcement={dictionary.copiedDescription} /></div>
                )}
                {section.prompt && <AiUsagePrompt locale={locale} country={visitorCountry ?? "CG"} kind={section.prompt} copyLabel={dictionary.copy} copiedLabel={dictionary.copied} announcement={dictionary.copiedDescription} />}
                {section.bullets && (
                  <ul className="mt-4 space-y-2.5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-[0.86rem] leading-7 text-[var(--persona-copy)]">
                        <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[#2ee6a6]" />
                        <span><InlineText value={bullet} /></span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.table && (
                  <div className="mt-4 overflow-x-auto rounded-md border border-[var(--persona-line)]">
                    <table className="w-full min-w-[520px] border-collapse text-left text-[0.79rem]">
                      <thead className="bg-[var(--persona-soft-surface)] text-[var(--persona-ink)]"><tr>{section.table.headers.map((header) => <th key={header} scope="col" className="border-b border-[var(--persona-line)] px-3 py-2.5 font-semibold">{header}</th>)}</tr></thead>
                      <tbody>{section.table.rows.map((row) => <tr key={row[0]} className="border-b border-[var(--persona-line)] last:border-0">{row.map((cell, index) => <td key={index} className={`px-3 py-2.5 align-top leading-5 text-[var(--persona-copy)] ${index === 0 ? "font-mono text-[0.75rem] font-medium text-[var(--persona-ink)]" : ""}`}><InlineText value={cell} /></td>)}</tr>)}</tbody>
                    </table>
                  </div>
                )}
                {section.note && <p className="mt-4 rounded-md bg-[var(--persona-soft-surface)] px-4 py-3 text-[0.82rem] leading-6 text-[var(--persona-strong-muted)]"><InlineText value={section.note} /></p>}
                {slug === "coverage" && section.id === "open" && (
                  <Link href="/coverage" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-[gap] duration-200 hover:gap-3">{locale === "fr" ? "Voir la couverture" : "View coverage"}<ArrowRight className="size-4" aria-hidden="true" /></Link>
                )}
              </section>
            ))}
          </div>

          <div className="mt-14 border-t border-[var(--persona-line)] pt-6">
            <Link href="/playground" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-[gap] duration-200 hover:gap-3">{dictionary.openPlayground}<ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
        </article>
      </main>

      <aside className="hidden pb-20 pt-12 xl:block">
        <nav aria-label={dictionary.onThisPage} className="sticky top-7 pl-6">
          <p className="text-[0.83rem] font-semibold text-[var(--persona-ink)]">{dictionary.onThisPage}</p>
          <ul className="mt-3 space-y-3">
            {page.sections.map((section) => <li key={section.id}><a href={`#${section.id}`} className="text-[0.8rem] leading-5 text-[var(--persona-quiet)] transition-colors duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">{section.title}</a></li>)}
          </ul>
        </nav>
      </aside>
    </div>
    </div>
  );
}
