import { createContext, useContext, useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const TabsCtx = createContext<{
  value: string;
  onChange: (v: string) => void;
  group: string;
} | null>(null);

interface TabsProps {
  value: string;
  onValueChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const id = useId();
  return (
    <TabsCtx.Provider value={{ value, onChange: onValueChange, group: id }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 border-b border-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const ctx = useContext(TabsCtx);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.onChange(value)}
      className={cn(
        "relative h-10 px-4 text-[13.5px] font-medium transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-t-md",
        active ? "text-fg" : "text-muted hover:text-fg",
      )}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          "absolute bottom-[-1px] left-3 right-3 h-[2px] rounded-full transition-colors",
          active ? "bg-fg" : "bg-transparent",
        )}
      />
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsCtx);
  if (!ctx) return null;
  if (ctx.value !== value) return null;
  return (
    <div className={cn("anim-in", className)} role="tabpanel">
      {children}
    </div>
  );
}
