import { cn } from "@/lib/utils";

interface BrandProps {
  size?: "sm" | "md";
  className?: string;
  /** Hide the wordmark, render the mark only. */
  iconOnly?: boolean;
}

const SIZES = {
  sm: { box: "h-6 w-6", text: "text-[13px]" },
  md: { box: "h-7 w-7", text: "text-[15px]" },
} as const;

/**
 * Quibli logo lockup: the bar-chart speech-bubble mark plus the wordmark.
 * Presentational only — callers wrap it in their own <Link>.
 */
export function Brand({ size = "md", className, iconOnly }: BrandProps) {
  const s = SIZES[size];
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <img
        src="/quibli-mark.png"
        alt="Quibli"
        width={28}
        height={28}
        loading="eager"
        decoding="async"
        className={cn(s.box, "object-contain")}
      />
      {iconOnly ? null : (
        <span className={cn(s.text, "font-semibold tracking-tight")}>
          Quibli<span className="text-accent">.</span>
        </span>
      )}
    </span>
  );
}
