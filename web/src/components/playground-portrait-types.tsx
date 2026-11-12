"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import {
  playgroundPortraitContexts,
  togglePortraitContext,
  type PlaygroundPortraitContext,
} from "@/lib/playground-query";

export function PlaygroundPortraitTypes({ selected, onChange }: {
  selected: PlaygroundPortraitContext[];
  onChange: (selected: PlaygroundPortraitContext[]) => void;
}) {
  const t = useTranslations("Playground.PortraitTypes");
  const hintId = useId();

  return (
    <fieldset aria-describedby={hintId}>
      <legend className="mb-1.5 text-xs font-semibold text-[var(--persona-ink)]">
        {t("label")}
      </legend>
      <p id={hintId} className="mb-2 text-xs text-[var(--persona-copy)]">
        {t("hint")}
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {playgroundPortraitContexts.map((context) => (
          <label
            key={context}
            className={`flex min-h-10 cursor-pointer items-center gap-2 border px-3 py-2 text-xs transition-[border-color,background-color,color] duration-150 hover:border-primary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${selected.includes(context) ? "border-primary bg-primary/5 text-primary" : "border-[var(--persona-line)] text-[var(--persona-copy)]"}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(context)}
              onChange={() => onChange(togglePortraitContext(selected, context))}
              className="accent-primary"
            />
            {t(context)}
          </label>
        ))}
      </div>
      {selected.length === 0 && (
        <p role="status" className="mt-2 text-xs text-[var(--persona-copy)]">
          {t("empty")}
        </p>
      )}
    </fieldset>
  );
}
