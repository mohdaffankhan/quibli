import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}

export function Dropdown({
  trigger,
  children,
  align = "end",
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("mousedown", onDoc);
      window.addEventListener("keydown", onEsc);
      return () => {
        window.removeEventListener("mousedown", onDoc);
        window.removeEventListener("keydown", onEsc);
      };
    }
    return;
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-[10px]"
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute z-40 mt-1 min-w-[180px] rounded-[12px] bg-surface shadow-lg border border-border p-1 anim-in",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          <DropdownContext.Provider value={{ close: () => setOpen(false) }}>
            {children}
          </DropdownContext.Provider>
        </div>
      ) : null}
    </div>
  );
}

import { createContext, useContext } from "react";
const DropdownContext = createContext<{ close: () => void }>({
  close: () => {},
});

interface ItemProps {
  onSelect?: () => void;
  children: ReactNode;
  destructive?: boolean;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function DropdownItem({
  onSelect,
  children,
  destructive,
  icon,
  className,
  disabled,
}: ItemProps) {
  const { close } = useContext(DropdownContext);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        onSelect?.();
        close();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-left",
        "transition-colors duration-100",
        "hover:bg-hairline outline-none focus-visible:bg-hairline",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        destructive && "text-danger hover:bg-danger-subtle",
        className,
      )}
    >
      {icon ? <span className="text-muted">{icon}</span> : null}
      <span className="flex-1">{children}</span>
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-hairline" />;
}
