import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/shell/TopBar";
import { Brand } from "@/components/shell/Brand";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg relative overflow-x-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-dot opacity-40 pointer-events-none"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-radial-emerald opacity-40"
      />
      <header className="relative z-10 border-b border-border/60 bg-bg/70 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-12 flex items-center">
          <Link
            to="/"
            className="flex items-center gap-2"
            aria-label="Quibli home"
          >
            <Brand size="sm" />
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[11.5px] text-muted hidden sm:inline">
              Powered by Quibli
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  );
}
