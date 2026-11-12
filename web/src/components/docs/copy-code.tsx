"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export function CopyCode({ value, copyLabel, copiedLabel, announcement, theme = "dark" }: {
  value: string;
  copyLabel: string;
  copiedLabel: string;
  announcement: string;
  theme?: "dark" | "light";
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 ${theme === "light" ? "text-[var(--persona-strong-muted)] hover:bg-[var(--persona-hover)] hover:text-primary focus-visible:outline-primary" : "text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-white"}`}
        aria-label={copied ? copiedLabel : copyLabel}
      >
        {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
        {copied ? copiedLabel : copyLabel}
      </button>
      <span className="sr-only" role="status">{copied ? announcement : ""}</span>
    </>
  );
}
