"use client";

import { Check, ChevronDown, Copy, Play, Square } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useSyncExternalStore, type FormEvent } from "react";
import { SearchableCombobox } from "@/components/searchable-combobox";
import { PlaygroundPortraitTypes } from "@/components/playground-portrait-types";
import { PlaygroundSkinTone } from "@/components/playground-skin-tone";
import { config } from "@/lib/config";
import cityData from "@/content/playground-cities.json";
import { countryDisplayName } from "@/lib/country-display-name";
import type { CoverageRow } from "@/lib/coverage-data";
import {
  continentCodes,
  eligiblePlaygroundAgeGroups,
  playgroundAgeGroups,
  playgroundFields,
  type PlaygroundOptions,
  type QueryProblem,
  trimPlaygroundAgeGroups,
} from "@/lib/playground-query";

const continents = ["africa", "americas", "asia", "europe", "oceania"] as const;
const noSubscription = () => () => {};

type Props = {
  options: PlaygroundOptions;
  onChange: (options: PlaygroundOptions) => void;
  requestUrl: string;
  problem: QueryProblem | null;
  loading: boolean;
  onRun: () => void;
  onCancel: () => void;
  coverageRows: CoverageRow[];
};

export function PlaygroundForm({
  options,
  onChange,
  requestUrl,
  problem,
  loading,
  onRun,
  onCancel,
  coverageRows,
}: Props) {
  const t = useTranslations("Playground");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [ageLastSelected, setAgeLastSelected] = useState(false);
  const fieldsId = useId();
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const countries = coverageRows
    .filter((row) => row.status !== "unavailable")
    .map((row) => ({
      ...row,
      label: hydrated
        ? countryDisplayName(row.code, locale, row.name)
        : row.name,
    }))
    .sort((a, b) => a.code.localeCompare(b.code, "en"));
  const countryOptions = countries.map((row) => ({
    value: row.code,
    label: row.label,
    flag: row.code,
  }));
  const cityCountry = options.residenceCountry || options.nationality;
  const pendingResidence = coverageRows.some(
    (row) => row.code === options.residenceCountry && row.status === "pending-name-review",
  );
  const nationalityOptions = countries
    .filter(
      (row) =>
        row.status === "available" &&
        (!options.continent ||
          row.continent === continentCodes[options.continent]),
    )
    .map((row) => ({ value: row.code, label: row.label, flag: row.code }));
  const cityOptions = (
    (cityData.countries as Record<string, string[]>)[cityCountry] ?? []
  ).map((name) => ({ value: name, label: name }));
  const eligibleAgeGroups = eligiblePlaygroundAgeGroups(options.portraitContexts);

  function update<Key extends keyof PlaygroundOptions>(
    key: Key,
    value: PlaygroundOptions[Key],
  ) {
    onChange({ ...options, [key]: value });
  }

  function changeContinent(continent: string) {
    const nationality = options.nationality;
    const incompatible =
      Boolean(continent && nationality) &&
      countries.find((row) => row.code === nationality)?.continent !==
        continentCodes[continent];
    onChange({
      ...options,
      continent,
      nationality: incompatible ? "" : nationality,
      city: incompatible && !options.residenceCountry ? "" : options.city,
    });
  }

  function changeCountry(
    key: "nationality" | "residenceCountry",
    value: string,
  ) {
    const next = { ...options, [key]: value };
    const nextCityCountry = next.residenceCountry || next.nationality;
    onChange({
      ...next,
      city: nextCityCountry === cityCountry ? options.city : "",
    });
  }

  function changeAgeGroup(group: (typeof playgroundAgeGroups)[number]) {
    if (!eligibleAgeGroups.includes(group)) return;
    const checked = options.ageGroups.includes(group);
    if (checked && options.ageGroups.length === 1) {
      setAgeLastSelected(true);
      return;
    }
    setAgeLastSelected(false);
    onChange({
      ...options,
      ageGroupsAdjustedByEligibility: false,
      ageGroups: checked
        ? options.ageGroups.filter((item) => item !== group)
        : [...options.ageGroups, group],
    });
  }

  function changePortraitContexts(selected: PlaygroundOptions["portraitContexts"]) {
    const trimmed = trimPlaygroundAgeGroups(options.ageGroups, selected);
    setAgeLastSelected(false);
    onChange({
      ...options,
      portraitContexts: selected,
      ageGroups: trimmed.ageGroups,
      ageGroupsAdjustedByEligibility: trimmed.removed.length > 0,
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) onCancel();
    else onRun();
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(requestUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const inputClass =
    "h-9 w-full min-w-0 rounded-none border border-[var(--persona-line)] bg-[var(--persona-surface)] px-3 text-xs text-[var(--persona-ink)] outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-[var(--persona-soft-surface)] disabled:text-[var(--persona-quiet)]";
  const labelClass = "mb-1.5 block text-xs font-semibold text-[var(--persona-ink)]";

  return (
    <form
      noValidate
      onSubmit={submit}
      className="border border-[var(--persona-line)] bg-[var(--persona-surface)] p-4 sm:p-5"
    >
      <h2 className="text-lg font-semibold tracking-tight">
        {t("configuration")}
      </h2>
      <p className="mt-0.5 text-xs text-[var(--persona-copy)]">{t("configurationHint")}</p>

      <div className="mt-5 grid gap-x-4 gap-y-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>{t("count")}</span>
          <input
            className={inputClass}
            type="number"
            min={1}
            max={100}
            value={options.count}
            onChange={(event) => update("count", Number(event.target.value))}
          />
          <span className="mt-1 block text-[0.68rem] text-[var(--persona-quiet)]">
            {t("countHint")}
          </span>
        </label>
        <label>
          <span className={labelClass}>{t("gender")}</span>
          <select
            className={inputClass}
            value={options.gender}
            onChange={(event) =>
              update(
                "gender",
                event.target.value as PlaygroundOptions["gender"],
              )
            }
          >
            <option value="">{t("any")}</option>
            <option value="female">{t("female")}</option>
            <option value="male">{t("male")}</option>
          </select>
        </label>

        {config.portraitContextsEnabled && (
          <div className="sm:col-span-2">
            <PlaygroundPortraitTypes
              selected={options.portraitContexts}
              onChange={changePortraitContexts}
            />
          </div>
        )}

        <fieldset className="sm:col-span-2">
          <legend className={labelClass}>{t("ageGroup")}</legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {playgroundAgeGroups.map((group) => (
              <label
                key={group}
                className={`flex cursor-pointer items-center gap-2 border px-3 py-2 text-xs ${!eligibleAgeGroups.includes(group) ? "cursor-not-allowed border-[var(--persona-line)] text-[var(--persona-quiet)] opacity-55" : options.ageGroups.includes(group) ? "border-primary bg-primary/5 text-primary" : "border-[var(--persona-line)] text-[var(--persona-copy)]"}`}
              >
                <input
                  type="checkbox"
                  checked={options.ageGroups.includes(group)}
                  disabled={!eligibleAgeGroups.includes(group)}
                  onChange={() => changeAgeGroup(group)}
                  className="accent-primary"
                />
                {t(group)}
              </label>
            ))}
          </div>
          {ageLastSelected && (
            <p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              {t("ageLastSelected")}
            </p>
          )}
        </fieldset>

        {config.portraitContextsEnabled && (
          <div className="sm:col-span-2">
            <PlaygroundSkinTone
              selected={options.skinTone}
              onChange={(selected) => update("skinTone", selected)}
              disabled={options.portraitContexts.length === 0}
            />
          </div>
        )}

        <SearchableCombobox
          label={t("continent")}
          value={options.continent}
          options={continents.map((continent) => ({
            value: continent,
            label: t(continent),
          }))}
          placeholder={t("allContinents")}
          searchPlaceholder={t("searchContinent")}
          emptyMessage={t("noSearchResults")}
          onChange={changeContinent}
          hint={t("continentHint")}
        />
        <SearchableCombobox
          label={t("nationality")}
          value={options.nationality}
          options={nationalityOptions}
          placeholder={t("anyNationality")}
          searchPlaceholder={t("searchCountry")}
          emptyMessage={t("noSearchResults")}
          onChange={(value) => changeCountry("nationality", value)}
          hint={t("nationalityHint")}
        />

        <SearchableCombobox
          label={t("residenceCountry")}
          value={options.residenceCountry}
          options={countryOptions}
          placeholder={t("anyResidence")}
          searchPlaceholder={t("searchCountry")}
          emptyMessage={t("noSearchResults")}
          onChange={(value) => changeCountry("residenceCountry", value)}
          hint={t(pendingResidence && !options.nationality && !options.continent ? "residenceHintPending" : "residenceHint")}
        />
        <SearchableCombobox
          label={t("city")}
          value={options.city}
          options={cityOptions}
          placeholder={t("cityPlaceholder")}
          searchPlaceholder={t("searchCity")}
          emptyMessage={t("noSearchResults")}
          onChange={(value) => update("city", value)}
          disabled={!cityCountry}
          hint={t(cityCountry ? "cityHintSelected" : "cityHint")}
        />

        <label>
          <span className={labelClass}>{t("emailDomain")}</span>
          <input
            className={inputClass}
            value={options.emailDomain}
            placeholder="example.test"
            onChange={(event) => update("emailDomain", event.target.value)}
          />
        </label>
        <label>
          <span className={labelClass}>{t("seed")}</span>
          <input
            className={inputClass}
            value={options.seed}
            maxLength={128}
            placeholder="demo"
            onChange={(event) => update("seed", event.target.value)}
          />
          <span className="mt-1 block text-[0.68rem] text-[var(--persona-quiet)]">
            {t("seedHint")}
          </span>
        </label>
        <label>
          <span className={labelClass}>{t("asOf")}</span>
          <input
            className={inputClass}
            type="date"
            min="0102-01-01"
            max="9999-12-31"
            value={options.asOf}
            onChange={(event) => update("asOf", event.target.value)}
          />
          <span className="mt-1 block text-[0.68rem] text-[var(--persona-quiet)]">
            {t("asOfHint")}
          </span>
        </label>

        <div className="sm:col-span-2">
          <button
            type="button"
            aria-expanded={fieldsOpen}
            aria-controls={fieldsId}
            onClick={() => setFieldsOpen((open) => !open)}
            className="flex min-h-10 w-full items-center justify-between border border-[var(--persona-line)] px-3 py-2 text-left text-xs font-medium text-[var(--persona-ink)] transition-[border-color,background-color] duration-200 hover:border-primary/60 hover:bg-[var(--persona-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span>
              {t("fields")} ·{" "}
              {options.fields.length
                ? t("selectedFields", { count: options.fields.length })
                : t("allFields")}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`size-4 shrink-0 transition-transform duration-300 ${fieldsOpen ? "rotate-180" : ""}`}
            />
          </button>
          <div
            id={fieldsId}
            aria-hidden={!fieldsOpen}
            inert={!fieldsOpen}
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${fieldsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="overflow-hidden">
              <div className="grid grid-cols-2 gap-2 border border-t-0 border-[var(--persona-line)] p-3 sm:grid-cols-5">
                {playgroundFields.map((field) => (
                  <label
                    key={field}
                    className="flex min-h-8 cursor-pointer items-center gap-1.5 text-xs text-[var(--persona-copy)] transition-colors duration-150 hover:text-primary"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={options.fields.includes(field)}
                      onChange={() =>
                        update(
                          "fields",
                          options.fields.includes(field)
                            ? options.fields.filter((item) => item !== field)
                            : [...options.fields, field],
                        )
                      }
                    />
                    {field}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {problem && (
        <p
          role="alert"
          className="mt-4 border border-[var(--persona-red-line)] bg-[var(--persona-red-bg)] px-3 py-2 text-xs text-[var(--persona-red-ink)]"
        >
          {t(`problem${problem[0].toUpperCase()}${problem.slice(1)}`)}
        </p>
      )}

      <div className="mt-5 bg-[var(--persona-soft-surface)] p-3 text-xs">
        <div className="mb-2 flex items-center justify-between">
          <strong className="font-semibold">{t("requestPreview")}</strong>
          <button
            type="button"
            onClick={copyUrl}
            aria-label={t("copyUrl")}
            className="text-primary hover:opacity-70"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>
        <div className="flex gap-3">
          <span className="font-semibold text-primary">GET</span>
          <code className="min-w-0 break-all text-[var(--persona-strong-muted)]">{requestUrl}</code>
        </div>
      </div>
      <button
        type="submit"
        className="mt-4 flex h-10 w-full items-center justify-center gap-2 bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {loading ? (
          <Square aria-hidden="true" className="size-3.5" />
        ) : (
          <Play aria-hidden="true" className="size-3.5 fill-current" />
        )}
        {loading ? t("cancelRequest") : t("runRequest")}
      </button>
    </form>
  );
}
