"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { SearchableCombobox } from "@/components/searchable-combobox";
import { countryDisplayName } from "@/lib/country-display-name";
import type { CoverageRow, CoverageStatus, PhoneStatus } from "@/lib/coverage-data";
import type { CoverageData } from "@/lib/coverage-loader";

const pageSize = 12;
const continents = ["002", "019", "142", "150", "009"];
const regionNames: Record<string, { en: string; fr: string }> = {
  "002": { en: "Africa", fr: "Afrique" },
  "005": { en: "South America", fr: "Amérique du Sud" },
  "009": { en: "Oceania", fr: "Océanie" },
  "011": { en: "Western Africa", fr: "Afrique de l'Ouest" },
  "013": { en: "Central America", fr: "Amérique centrale" },
  "014": { en: "Eastern Africa", fr: "Afrique de l'Est" },
  "015": { en: "Northern Africa", fr: "Afrique du Nord" },
  "017": { en: "Middle Africa", fr: "Afrique centrale" },
  "018": { en: "Southern Africa", fr: "Afrique australe" },
  "019": { en: "Americas", fr: "Amériques" },
  "021": { en: "Northern America", fr: "Amérique du Nord" },
  "029": { en: "Caribbean", fr: "Caraïbes" },
  "030": { en: "Eastern Asia", fr: "Asie de l'Est" },
  "034": { en: "Southern Asia", fr: "Asie du Sud" },
  "035": { en: "South-eastern Asia", fr: "Asie du Sud-Est" },
  "039": { en: "Southern Europe", fr: "Europe du Sud" },
  "053": {
    en: "Australia and New Zealand",
    fr: "Australie et Nouvelle-Zélande",
  },
  "054": { en: "Melanesia", fr: "Mélanésie" },
  "057": { en: "Micronesia", fr: "Micronésie" },
  "061": { en: "Polynesia", fr: "Polynésie" },
  "142": { en: "Asia", fr: "Asie" },
  "143": { en: "Central Asia", fr: "Asie centrale" },
  "145": { en: "Western Asia", fr: "Asie de l'Ouest" },
  "150": { en: "Europe", fr: "Europe" },
  "151": { en: "Eastern Europe", fr: "Europe de l'Est" },
  "154": { en: "Northern Europe", fr: "Europe du Nord" },
  "155": { en: "Western Europe", fr: "Europe de l'Ouest" },
};

function regionName(code: string | null, locale: string, fallback: string) {
  return (
    (code && regionNames[code]?.[locale === "fr" ? "fr" : "en"]) || fallback
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

function StatusDot({ color }: { color: "mint" | "amber" | "gray" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2 shrink-0 rounded-full ${color === "mint" ? "bg-[#2ee6a6]" : color === "amber" ? "bg-[#f5a623]" : "bg-[#9ba3b2]"}`}
    />
  );
}

function RowStatus({ status }: { status: CoverageStatus }) {
  const t = useTranslations("Coverage");
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <StatusDot
        color={
          status === "available"
            ? "mint"
            : status === "pending-name-review"
              ? "amber"
              : "gray"
        }
      />
      {t(
        status === "available"
          ? "statusAvailable"
          : status === "pending-name-review"
            ? "statusPending"
            : "statusUnavailable",
      )}
    </span>
  );
}

function PhoneSource({ status }: { status: PhoneStatus }) {
  const t = useTranslations("Coverage");
  const key =
    status === "reserved-range"
      ? "phoneReserved"
      : status === "format-valid"
        ? "phoneFormat"
        : "notAvailable";
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <StatusDot
        color={
          status === "reserved-range"
            ? "mint"
            : status === "format-valid"
              ? "amber"
              : "gray"
        }
      />
      {t(key)}
    </span>
  );
}

function CountryCell({ row, locale }: { row: CoverageRow; locale: string }) {
  const name = countryDisplayName(row.code, locale, row.name);
  return (
    <span className="flex w-full min-w-0 items-center gap-2.5">
      <span
        className={`fi fi-${row.code.toLowerCase()} inline-block shrink-0 text-[1.35rem] leading-none`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 break-words whitespace-normal" title={name}>
        {name}
      </span>
    </span>
  );
}

function noteKey(row: CoverageRow) {
  if (row.status === "pending-name-review") return "notePending";
  if (row.status === "unavailable") return "noteUnavailable";
  return row.postcodeCities > 0 ? "noteSomePostcodes" : "noteNoPostcodes";
}

function PageButtons({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  const t = useTranslations("Coverage");
  const numbers = [
    ...new Set(
      [1, 2, 3, page - 1, page, page + 1, pages].filter(
        (number) => number >= 1 && number <= pages,
      ),
    ),
  ].sort((a, b) => a - b);
  return (
    <nav aria-label={t("pagination")} className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label={t("previous")}
        className="flex size-8 items-center justify-center border border-[var(--persona-line)] text-[var(--persona-copy)] disabled:opacity-40"
      >
        <ChevronLeft className="size-4" />
      </button>
      {numbers.map((number, index) => (
        <span key={number} className="inline-flex items-center gap-1.5">
          {index > 0 && number - numbers[index - 1] > 1 && (
            <span className="px-1 text-[var(--persona-copy)]" aria-hidden="true">
              …
            </span>
          )}
          <button
            type="button"
            onClick={() => onPage(number)}
            aria-label={t("pageNumber", { page: number })}
            aria-current={page === number ? "page" : undefined}
            className={`flex size-8 items-center justify-center border text-xs ${page === number ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-[var(--persona-line)] text-[var(--persona-ink)] hover:border-primary hover:text-primary"}`}
          >
            {number}
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page === pages}
        aria-label={t("next")}
        className="flex size-8 items-center justify-center border border-[var(--persona-line)] text-primary disabled:opacity-40"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

function SkeletonBar({ className = "w-20" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-2.5 rounded-full bg-[var(--persona-skeleton)] motion-safe:animate-pulse ${className}`}
    />
  );
}

function CoverageSkeletonRows() {
  return Array.from({ length: pageSize }, (_, index) => (
    <tr
      key={index}
      className="border-b border-[var(--persona-line)] last:border-b-0"
      aria-hidden="true"
    >
      {Array.from({ length: 7 }, (_, cell) => (
        <td
          key={cell}
          className="h-10 border-r border-[var(--persona-line)] px-3 last:border-r-0"
        >
          <div className="flex items-center gap-2">
            {cell === 0 && (
              <span className="size-5 shrink-0 rounded-full bg-[var(--persona-skeleton)] motion-safe:animate-pulse" />
            )}
            <SkeletonBar
              className={
                cell === 6
                  ? "w-28 max-w-full"
                  : cell === 0
                    ? "w-24 max-w-full"
                    : "w-16 max-w-full"
              }
            />
          </div>
        </td>
      ))}
    </tr>
  ));
}

function CoverageSkeletonCards() {
  return Array.from({ length: 4 }, (_, index) => (
    <div
      key={index}
      aria-hidden="true"
      className="space-y-4 border border-[var(--persona-line)] p-4"
    >
      <SkeletonBar className="w-36" />
      {Array.from({ length: 5 }, (_, row) => (
        <div key={row} className="flex justify-between gap-6">
          <SkeletonBar className="w-20" />
          <SkeletonBar className="w-28" />
        </div>
      ))}
    </div>
  ));
}

function EmptyCoverage({ onReset }: { onReset: () => void }) {
  const t = useTranslations("Coverage");
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-5 py-10 text-center">
      <Image
        src="/coverage-empty.webp"
        alt=""
        width={291}
        height={240}
        className="h-auto w-36 dark:hidden"
      />
      <Image src="/coverage-empty-dark.webp" alt="" width={291} height={240} className="hidden h-auto w-36 dark:block" />
      <h2 className="mt-1 text-lg font-semibold text-[var(--persona-ink)]">
        {t("emptyTitle")}
      </h2>
      <p className="mt-1 text-sm text-[var(--persona-copy)]">{t("emptyDescription")}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 border border-primary px-5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {t("clearFilters")}
      </button>
    </div>
  );
}

export function CoverageExplorer({ data }: { data: CoverageData }) {
  const t = useTranslations("Coverage");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const totalCountries = data.rows.length;

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 220);
    return () => window.clearTimeout(timer);
  }, []);

  function resetFilters() {
    setSearch("");
    setRegion("all");
    setStatus("all");
    setPage(1);
  }

  const subregions = useMemo(
    () =>
      [
        ...new Set(
          data.rows
            .map((row) => row.subregion)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((a, b) =>
        regionName(a, locale, "").localeCompare(
          regionName(b, locale, ""),
          locale,
        ),
      ),
    [data.rows, locale],
  );
  const regionOptions = [
    ...continents.map((code) => ({
      value: `continent:${code}`,
      label: regionName(code, locale, code),
    })),
    ...subregions.map((code) => ({
      value: `subregion:${code}`,
      label: regionName(code, locale, code),
    })),
  ];
  const filtered = useMemo(
    () =>
      data.rows
        .filter((row) => {
          const name = countryDisplayName(row.code, locale, row.name);
          const query = normalize(search.trim());
          const matchesSearch =
            !query ||
            normalize(`${name} ${row.name} ${row.code}`).includes(query);
          const matchesRegion =
            region === "all" ||
            (region.startsWith("continent:")
              ? row.continent === region.slice(10)
              : row.subregion === region.slice(10));
          return (
            matchesSearch &&
            matchesRegion &&
            (status === "all" || row.status === status)
          );
        })
        .sort((a, b) =>
          countryDisplayName(a.code, locale, a.name).localeCompare(
            countryDisplayName(b.code, locale, b.name),
            locale,
          ),
        ),
    [data.rows, locale, region, search, status],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const first = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const last = Math.min(currentPage * pageSize, filtered.length);
  const sourceLabel = data.source.kind === "live"
    ? t("sourceLive", { version: data.source.version })
    : data.source.kind === "snapshot"
      ? t("sourceSnapshot", { date: data.source.date })
      : t("sourceUnavailable");

  return (
    <>
      <p className="mt-3 text-xs text-[var(--persona-quiet)]" role="note">{sourceLabel}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-[minmax(230px,1fr)_repeat(2,minmax(150px,190px))] lg:grid-cols-[minmax(280px,1fr)_170px_170px_auto] lg:items-center">
        <label className="relative block">
          <span className="sr-only">{t("searchLabel")}</span>
          <Search
            aria-hidden="true"
            className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--persona-quiet)]"
          />
          <input
            type="search"
            disabled={loading}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full border border-[var(--persona-line)] bg-[var(--persona-surface)] pl-11 pr-3 text-sm text-foreground outline-none placeholder:text-[var(--persona-copy)] focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <SearchableCombobox
          label={t("regionLabel")}
          visuallyHiddenLabel
          triggerClassName="h-10 text-sm"
          disabled={loading}
          value={region === "all" ? "" : region}
          options={regionOptions}
          placeholder={t("allRegions")}
          searchPlaceholder={t("searchRegion")}
          emptyMessage={t("noSearchResults")}
          onChange={(value) => {
            setRegion(value || "all");
            setPage(1);
          }}
        />
        <SearchableCombobox
          label={t("availabilityLabel")}
          visuallyHiddenLabel
          triggerClassName="h-10 text-sm"
          disabled={loading}
          value={status === "all" ? "" : status}
          options={[
            { value: "available", label: t("statusAvailable") },
            { value: "pending-name-review", label: t("statusPending") },
            { value: "unavailable", label: t("statusUnavailable") },
          ]}
          placeholder={t("allAvailability")}
          searchPlaceholder={t("searchAvailability")}
          emptyMessage={t("noSearchResults")}
          onChange={(value) => {
            setStatus(value || "all");
            setPage(1);
          }}
        />
        <p
          role="status"
          aria-live="polite"
          className="text-sm font-semibold text-[var(--persona-ink)] sm:col-span-3 lg:col-span-1 lg:justify-self-end"
        >
          {loading
            ? t("loading")
            : t("filteredCount", {
                count: filtered.length,
                total: totalCountries,
              })}
        </p>
      </div>

      <div
        className="mt-6 hidden overflow-x-auto border border-[var(--persona-line)] lg:block"
        aria-busy={loading}
      >
        <table className="w-full min-w-[950px] border-collapse text-left text-[0.75rem]">
          <thead className="bg-[var(--persona-soft-surface)] text-[var(--persona-ink)]">
            <tr>
              {[
                "columnCountry",
                "columnRegion",
                "columnProfiles",
                "columnPostcodes",
                "columnPhone",
                "columnAddresses",
                "columnNotes",
              ].map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="border-b border-r border-[var(--persona-line)] px-3 py-3 font-semibold last:border-r-0"
                >
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <CoverageSkeletonRows />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyCoverage onReset={resetFilters} />
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={row.code}
                  className="border-b border-[var(--persona-line)] text-[var(--persona-ink)] last:border-b-0 hover:bg-[var(--persona-hover)]"
                >
                  <td className="max-w-[195px] border-r border-[var(--persona-line)] px-3 py-2">
                    <CountryCell row={row} locale={locale} />
                  </td>
                  <td className="border-r border-[var(--persona-line)] px-3 py-2 whitespace-nowrap">
                    {regionName(
                      row.subregion ?? row.continent,
                      locale,
                      t("otherRegion"),
                    )}
                  </td>
                  <td className="border-r border-[var(--persona-line)] px-3 py-2">
                    <RowStatus status={row.status} />
                  </td>
                  <td className="border-r border-[var(--persona-line)] px-3 py-2 whitespace-nowrap">
                    {row.sampledCities ? (
                      <span className="inline-flex items-center gap-2">
                        <StatusDot
                          color={row.postcodeCities ? "mint" : "gray"}
                        />
                        {row.postcodeCities}/{row.sampledCities}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border-r border-[var(--persona-line)] px-3 py-2">
                    <PhoneSource status={row.phone} />
                  </td>
                  <td className="border-r border-[var(--persona-line)] px-3 py-2 whitespace-nowrap">
                    {row.status === "available" ? (
                      <span className="inline-flex items-center gap-2">
                        <StatusDot color="mint" />
                        {t("addressIllustrative")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <StatusDot color="gray" />
                        {t("notAvailable")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{t(noteKey(row))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-3 lg:hidden" aria-busy={loading}>
        {loading ? (
          <CoverageSkeletonCards />
        ) : filtered.length === 0 ? (
          <div className="border border-[var(--persona-line)]">
            <EmptyCoverage onReset={resetFilters} />
          </div>
        ) : (
          visible.map((row) => (
            <article
              key={row.code}
              className="border border-[var(--persona-line)] bg-[var(--persona-surface)] p-4 text-sm text-[var(--persona-ink)]"
            >
              <h2 className="mb-3 font-semibold text-[var(--persona-ink)]">
                <CountryCell row={row} locale={locale} />
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                <dt className="text-[var(--persona-copy)]">{t("columnRegion")}</dt>
                <dd>
                  {regionName(
                    row.subregion ?? row.continent,
                    locale,
                    t("otherRegion"),
                  )}
                </dd>
                <dt className="text-[var(--persona-copy)]">{t("columnProfiles")}</dt>
                <dd>
                  <RowStatus status={row.status} />
                </dd>
                <dt className="text-[var(--persona-copy)]">{t("columnPostcodes")}</dt>
                <dd>
                  {row.sampledCities
                    ? `${row.postcodeCities}/${row.sampledCities}`
                    : "—"}
                </dd>
                <dt className="text-[var(--persona-copy)]">{t("columnPhone")}</dt>
                <dd>
                  <PhoneSource status={row.phone} />
                </dd>
                <dt className="text-[var(--persona-copy)]">{t("columnAddresses")}</dt>
                <dd>
                  {row.status === "available"
                    ? t("addressIllustrative")
                    : t("notAvailable")}
                </dd>
              </dl>
              <p className="mt-3 border-t border-[var(--persona-line)] pt-3 text-xs text-[var(--persona-copy)]">
                {t(noteKey(row))}
              </p>
            </article>
          ))
        )}
      </div>

      {!loading && (
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--persona-copy)]">
          <p>
            {filtered.length === 0
              ? t("filteredCount", { count: 0, total: totalCountries })
              : t("showing", { first, last, count: filtered.length })}
          </p>
          {filtered.length > pageSize && (
            <PageButtons page={currentPage} pages={pages} onPage={setPage} />
          )}
        </div>
      )}
    </>
  );
}
