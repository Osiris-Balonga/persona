import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-foreground">
      <Image src="/persona-mark.svg" alt="" width={32} height={27} priority className="h-7 w-auto dark:hidden" />
      <Image src="/persona-mark-dark.svg" alt="" width={32} height={27} priority className="hidden h-7 w-auto dark:block" />
      {!compact && <span className="text-[1.45rem] font-bold leading-none tracking-[-0.04em]">PERSONA</span>}
    </span>
  );
}
