import { CopyCode } from "./copy-code";

function CodeText({ value, language }: { value: string; language: string }) {
  if (language !== "json" && language !== "bash" && language !== "http")
    return value;
  return value
    .split(
      /("(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|\bcurl\b|\bGET\b|\b\d+\b)/g,
    )
    .map((part, index) => {
      const color =
        part === "curl" || part === "GET"
          ? "text-[#58e2ad]"
          : part.startsWith('"') &&
              /"\s*$/.test(part) &&
              value.includes(`${part}:`)
            ? "text-[#a5bcff]"
            : part.startsWith('"')
              ? "text-[#8fdfc2]"
              : /^\d+$/.test(part)
                ? "text-[#eab17e]"
                : "";
      return color ? (
        <span key={index} className={color}>
          {part}
        </span>
      ) : (
        part
      );
    });
}

type Props = {
  value: string;
  language: string;
  label?: string;
  copyLabel: string;
  copiedLabel: string;
  announcement: string;
  maxHeight?: boolean;
  wrap?: boolean;
};

export function CodeBlock({
  value,
  language,
  label,
  copyLabel,
  copiedLabel,
  announcement,
  maxHeight = false,
  wrap = false,
}: Props) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md bg-[#1c2534] text-slate-100">
      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-white/10 pl-4 pr-2">
        <span className="text-[0.7rem] font-medium text-slate-400">
          {label ?? language.toUpperCase()}
        </span>
        <CopyCode
          value={value}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
          announcement={announcement}
        />
      </div>
      <pre
        tabIndex={0}
        className={`docs-code-scroll overflow-auto px-4 py-4 text-[0.76rem] leading-[1.75] sm:text-[0.8rem] ${maxHeight ? "max-h-[440px]" : ""} ${wrap ? "whitespace-pre-wrap break-words" : ""}`}
      >
        <code>
          <CodeText value={value} language={language} />
        </code>
      </pre>
    </div>
  );
}
