import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shell/TopBar";
import { Brand } from "@/components/shell/Brand";

function Wordmark() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 group"
      aria-label="Quibli home"
    >
      <Brand />
    </Link>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-fg relative overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-radial-emerald opacity-60"
      />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-4">
          <Wordmark />
          <nav className="hidden md:flex items-center gap-1 ml-6">
            <a
              href="#features"
              className="h-9 px-3 inline-flex items-center text-[13.5px] font-medium text-muted hover:text-fg rounded-[8px]"
            >
              Features
            </a>
            <a
              href="#how"
              className="h-9 px-3 inline-flex items-center text-[13.5px] font-medium text-muted hover:text-fg rounded-[8px]"
            >
              How it works
            </a>
            <a
              href="#cta"
              className="h-9 px-3 inline-flex items-center text-[13.5px] font-medium text-muted hover:text-fg rounded-[8px]"
            >
              Get started
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login" className="hidden sm:inline-flex">
              <Button size="sm" variant="secondary">
                Sign in
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">{children}</main>

      <footer className="relative z-10 border-t border-border/60 bg-bg/60 mt-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid gap-4 md:grid-cols-3 items-center">
          <div className="flex items-center gap-2">
            <Brand size="sm" />
            <span className="text-[12px] text-muted ml-2">
              © {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center justify-center gap-5 text-[12px] text-muted">
            <a href="#" className="hover:text-fg transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-fg transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-fg transition-colors">
              Support
            </a>
          </div>
          <div className="text-[12px] text-muted md:text-right">
            Real-time polling for product, ops & people teams.
          </div>
        </div>
      </footer>
    </div>
  );
}
