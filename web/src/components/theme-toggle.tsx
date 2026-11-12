"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const choices = [
  { value: "system", key: "system", Icon: Monitor },
  { value: "light", key: "light", Icon: Sun },
  { value: "dark", key: "dark", Icon: Moon },
] as const;

const subscribe = () => () => {};

export function ThemeToggle() {
  const t = useTranslations("Theme");
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("change")} className="size-9 rounded-none text-foreground hover:bg-muted">
          <Sun aria-hidden="true" className="size-4 dark:hidden" />
          <Moon aria-hidden="true" className="hidden size-4 dark:block" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-44 gap-0 rounded-md border border-border bg-popover p-1.5 shadow-sm ring-0">
        <div role="radiogroup" aria-label={t("change")}>
          {choices.map(({ value, key, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mounted && theme === value}
              onClick={() => { setTheme(value); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-xs text-popover-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Icon aria-hidden="true" className="size-4" />
              <span className="flex-1">{t(key)}</span>
              {mounted && theme === value && <Check aria-hidden="true" className="size-3.5 text-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
