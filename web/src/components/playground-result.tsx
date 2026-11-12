"use client";

import {
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { countryDisplayName } from "@/lib/country-display-name";
import { portraitImageForSize } from "@/lib/portrait-image";
import { CodeBlock } from "@/components/docs/code-block";
import type {
  PlaygroundFailure,
  PlaygroundPerson,
  PlaygroundResponse,
} from "@/lib/playground-response";

type Props = {
  response: PlaygroundResponse | null;
  loading: boolean;
  error: PlaygroundFailure | null;
  onRetry: () => void;
};

function Portrait({
  person,
  className,
  eager = false,
  size = "card",
}: {
  person: PlaygroundPerson;
  className: string;
  eager?: boolean;
  size?: "card" | "thumbnail";
}) {
  const [failed, setFailed] = useState(false);
  const photo = portraitImageForSize(person.picture, size);
  const initials = (
    person.name?.full ??
    `${person.name?.first ?? ""} ${person.name?.last ?? ""}`
  )
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return (
    <div className={`relative overflow-hidden bg-[var(--persona-soft-surface)] ${className}`}>
      {photo && !failed ? (
        <Image
          src={photo}
          alt=""
          fill
          sizes={size === "thumbnail" ? "34px" : "(max-width: 640px) calc(100vw - 64px), (max-width: 1024px) 36vw, 240px"}
          loading={eager ? "eager" : "lazy"}
          unoptimized
          className="object-cover object-top"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary/40">
          {initials || "P"}
        </span>
      )}
    </div>
  );
}

function Profile({ person }: { person: PlaygroundPerson }) {
  const t = useTranslations("Playground");
  const locale = useLocale();
  const countryCode = person.location?.country?.code;
  const country = countryCode
    ? countryDisplayName(countryCode, locale, person.location?.country?.name)
    : person.location?.country?.name;
  const nationality = person.nationality
    ? countryDisplayName(person.nationality, locale)
    : null;
  const residence =
    [person.location?.city, country].filter(Boolean).join(", ") ||
    person.location?.formatted;
  const name =
    person.name?.full ||
    [person.name?.first, person.name?.last].filter(Boolean).join(" ") ||
    t("unnamed");
  const formattedPhone = person.phone
    ? (parsePhoneNumberFromString(person.phone)?.formatInternational() ??
      person.phone)
    : null;

  return (
    <article className="grid min-h-48 bg-[var(--persona-surface)] sm:grid-cols-[minmax(150px,36%)_1fr]">
      <Portrait
        person={person}
        eager
        className="aspect-[1.25] sm:aspect-auto sm:h-full"
      />
      <div className="min-w-0 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <h3
            className="truncate text-lg font-semibold tracking-tight"
            title={name}
          >
            {name}
          </h3>
          {person.id && (
            <span
              className="max-w-28 truncate pt-1 text-[0.65rem] text-[var(--persona-quiet)]"
              title={person.id}
            >
              ID {person.id}
            </span>
          )}
        </div>
        {(person.dob?.age !== undefined || person.gender) && (
          <p className="mt-0.5 text-xs text-[var(--persona-quiet)]">
            {person.dob?.age !== undefined &&
              `${person.dob.age} ${t("ageUnit")}`}
            {person.dob?.age !== undefined && person.gender && " · "}
            {person.gender &&
              t(
                person.gender === "female"
                  ? "female"
                  : person.gender === "male"
                    ? "male"
                    : "other",
              )}
          </p>
        )}
        {nationality && (
          <p className="mt-4 flex items-center gap-2 text-xs text-[var(--persona-strong-muted)]">
            {person.nationality?.length === 2 && (
              <span
                className={`fi fi-${person.nationality.toLowerCase()} text-base`}
                aria-hidden="true"
              />
            )}
            <span>{nationality}</span>
          </p>
        )}
        {residence && (
          <p className="mt-3 flex items-start gap-2 text-xs text-[var(--persona-strong-muted)]">
            <MapPin
              className="mt-0.5 size-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>{residence}</span>
          </p>
        )}
        {person.email && (
          <p className="mt-4 flex items-start gap-2 break-all text-xs text-[var(--persona-strong-muted)]">
            <Mail
              className="mt-0.5 size-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            {person.email}
          </p>
        )}
        {formattedPhone && (
          <p className="mt-2 flex items-start gap-2 text-xs text-[var(--persona-strong-muted)]">
            <Phone
              className="mt-0.5 size-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            {formattedPhone}
          </p>
        )}
      </div>
    </article>
  );
}

export function PlaygroundResult({ response, loading, error, onRetry }: Props) {
  const t = useTranslations("Playground");
  const [active, setActive] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const people = response?.results ?? [];
  const index = Math.min(active, Math.max(people.length - 1, 0));
  const current = people[index];
  const json = response ? JSON.stringify(response, null, 2) : "";
  const thumbnailStart = Math.min(
    Math.max(index - 2, 0),
    Math.max(people.length - 5, 0),
  );
  const visible = people.slice(thumbnailStart, thumbnailStart + 5);

  return (
    <section
      className="min-w-0 border border-[var(--persona-line)] bg-[var(--persona-surface)] p-4 sm:p-5"
      aria-label={t("result")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {t("result")}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--persona-copy)]">
            {response
              ? t("resultCount", { count: people.length })
              : t("resultHint")}
          </p>
        </div>
        {people.length > 0 && (
          <div className="flex items-center gap-3 text-xs tabular-nums text-[var(--persona-ink)]">
            <button
              type="button"
              aria-label={t("previousPerson")}
              disabled={index === 0}
              onClick={() => setActive(index - 1)}
              className="border border-[var(--persona-line)] p-1.5 text-primary transition-[background-color,transform] duration-200 hover:-translate-x-0.5 hover:bg-[var(--persona-hover)] active:scale-[.96] disabled:opacity-35 disabled:hover:translate-x-0"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span>
              {index + 1} {t("of")} {people.length}
            </span>
            <button
              type="button"
              aria-label={t("nextPerson")}
              disabled={index === people.length - 1}
              onClick={() => setActive(index + 1)}
              className="border border-[var(--persona-line)] p-1.5 text-primary transition-[background-color,transform] duration-200 hover:translate-x-0.5 hover:bg-[var(--persona-hover)] active:scale-[.96] disabled:opacity-35 disabled:hover:translate-x-0"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div
          className="mt-5 animate-pulse space-y-4"
          role="status"
          aria-label={t("loading")}
        >
          <div className="flex justify-end gap-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="size-10 bg-[var(--persona-skeleton)]" />
            ))}
          </div>
          <div className="grid min-h-48 border border-[var(--persona-line)] sm:grid-cols-[36%_1fr]">
            <div className="h-44 bg-[var(--persona-skeleton)] sm:h-auto" />
            <div className="space-y-4 p-5">
              {[70, 42, 55, 85, 60].map((width) => (
                <div
                  key={width}
                  className="h-3 bg-[var(--persona-skeleton)]"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          </div>
          <div className="h-52 bg-[var(--persona-soft-surface)]" />
        </div>
      ) : error ? (
        <div
          className="mt-5 border border-[var(--persona-red-line)] bg-[var(--persona-red-bg)] px-5 py-8 text-center"
          role="alert"
        >
          <p className="font-semibold text-[var(--persona-red-ink)]">{t(error.titleKey)}</p>
          <p className="mt-2 text-sm text-[var(--persona-copy)]">
            {error.guidanceKey === "errorRateLimitGuidance"
              ? t(error.guidanceKey, { seconds: error.retryAfter || "?" })
              : t(error.guidanceKey)}
          </p>
          {error.rawPayload !== null && error.rawPayload !== undefined && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs font-medium text-[var(--persona-strong-muted)]">
                {t("developerDetails")}
              </summary>
              <pre className="mt-2 max-h-56 overflow-auto border border-[var(--persona-red-line)] bg-[var(--persona-surface)] p-3 text-left text-[0.68rem] text-[var(--persona-strong-muted)]">
                {JSON.stringify(error.rawPayload, null, 2)}
              </pre>
            </details>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 border border-[var(--persona-red-line)] px-4 py-2 text-xs font-semibold text-[var(--persona-red-ink)]"
          >
            {t("retry")}
          </button>
        </div>
      ) : !response ? (
        <div className="mt-5 flex min-h-48 items-center justify-center border border-dashed border-[var(--persona-line)] bg-[var(--persona-soft-surface)] px-5 text-center text-sm text-[var(--persona-copy)]">
          {t("runToSeeResults")}
        </div>
      ) : people.length === 0 ? (
        <div className="mt-5 flex min-h-48 items-center justify-center border border-dashed border-[var(--persona-line)] bg-[var(--persona-soft-surface)] px-5 text-center text-sm text-[var(--persona-copy)]">
          {t("noResults")}
        </div>
      ) : (
        <>
          <div className="mt-4 flex min-h-11 flex-wrap items-center justify-end gap-2">
            {visible.map((person, offset) => {
              const personIndex = thumbnailStart + offset;
              return (
                <button
                  key={`${person.id ?? "person"}-${personIndex}`}
                  type="button"
                  onClick={() => setActive(personIndex)}
                  aria-label={t("selectPerson", { number: personIndex + 1 })}
                  aria-current={personIndex === index ? "true" : undefined}
                  className={`size-10 border p-0.5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm active:scale-[.96] ${personIndex === index ? "border-primary" : "border-[var(--persona-line)] hover:border-primary/60"}`}
                >
                  <Portrait person={person} size="thumbnail" className="h-full w-full" />
                </button>
              );
            })}
            {people.length > 5 && (
              <button
                type="button"
                onClick={() => setPickerOpen(!pickerOpen)}
                aria-expanded={pickerOpen}
                className="h-10 border border-[var(--persona-line)] px-2 text-xs text-primary transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-[var(--persona-hover)] active:scale-[.96]"
              >
                {t("allPeople", { count: people.length })}
              </button>
            )}
          </div>
          <div
            aria-hidden={!pickerOpen}
            inert={!pickerOpen}
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${pickerOpen ? "max-h-[7.5rem] opacity-100" : "max-h-0 opacity-0"}`}
          >
            <div className="persona-scroll max-h-[7.5rem] overflow-y-auto py-2 pr-1.5 [scrollbar-gutter:stable]">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
                {people.map((person, personIndex) => (
                  <button
                    type="button"
                    key={`${person.id ?? "person"}-picker-${personIndex}`}
                    onClick={() => {
                      setActive(personIndex);
                      setPickerOpen(false);
                    }}
                    aria-label={t("selectPerson", { number: personIndex + 1 })}
                    aria-current={personIndex === index ? "true" : undefined}
                    title={person.name?.full || [person.name?.first, person.name?.last].filter(Boolean).join(" ") || t("unnamed")}
                    className={`aspect-square min-w-0 border p-0.5 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-primary active:scale-[.96] ${personIndex === index ? "border-primary" : "border-[var(--persona-line)] hover:border-primary/60"}`}
                  >
                    <Portrait person={person} size="thumbnail" className="h-full w-full" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div key={current.id ?? index} className="playground-swap mt-4">
            <Profile person={current} />
          </div>
          <div className="mt-5">
            <CodeBlock value={json} language="json" copyLabel={t("copyJson")} copiedLabel={t("copied")} announcement={t("copied")} maxHeight />
          </div>
        </>
      )}
    </section>
  );
}
