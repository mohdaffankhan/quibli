import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-hairline",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
        "before:animate-[shimmer_1.4s_infinite]",
        className,
      )}
      style={
        {
          ["--tw-gradient-via"]: "rgba(255,255,255,0.6)",
        } as React.CSSProperties
      }
    />
  );
}
