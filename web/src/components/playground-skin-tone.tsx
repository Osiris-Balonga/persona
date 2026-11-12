"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { selectedSkinTones, skinToneSwatches, toggleAllSkinTones, toggleSkinTone, type SkinToneSelection } from "@/lib/skin-tone-swatches";

export function PlaygroundSkinTone({
  selected,
  onChange,
  disabled = false,
}: {
  selected: SkinToneSelection;
  onChange: (selected: SkinToneSelection) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Playground.PortraitTypes");
  const tones = selectedSkinTones(selected);

  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1.5 text-xs font-semibold text-[var(--persona-ink)]">
        {t("skinToneLabel")}
      </legend>
      <div className="grid grid-cols-[repeat(11,minmax(0,2.25rem))] items-center gap-0.5 sm:grid-cols-[auto_repeat(10,minmax(0,2.25rem))] sm:gap-1.5">
        <button
          type="button"
          aria-label={t("skinToneAll")}
          aria-pressed={tones.length === 10}
          disabled={disabled}
          onClick={() => onChange(toggleAllSkinTones(selected))}
          className={`grid aspect-square w-full min-w-0 place-items-center border bg-transparent px-0 text-[0.68rem] font-semibold sm:aspect-auto sm:h-9 sm:w-auto sm:px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45 ${tones.length === 10 ? "border-primary text-primary" : "border-[var(--persona-line)] text-[var(--persona-copy)] hover:border-primary/60"}`}
        >
          <span className="hidden sm:inline">{t("skinToneAll")}</span>
          {tones.length === 10 && <Check className="size-4 sm:hidden" aria-hidden="true" strokeWidth={2.5} />}
        </button>
        {skinToneSwatches.map(({ value, color }) => {
          const checked = tones.includes(value);
          return (
            <label
              key={value}
              className={`grid aspect-square w-full min-w-0 cursor-pointer place-items-center border text-xs font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${checked ? "border-primary outline-1 outline-primary" : "border-[var(--persona-line)]"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
              style={{ backgroundColor: color, color: value >= 7 ? "white" : "#111111" }}
            >
              <input
                type="checkbox"
                aria-label={t("skinToneOption", { number: value })}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(toggleSkinTone(selected, value))}
                className="sr-only"
              />
              {checked ? <Check className="size-4" aria-hidden="true" strokeWidth={2.5} /> : value}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
