import type { ReactNode } from "react";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      <TopBar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-12 flex items-center justify-between text-[12px] text-muted">
          <span>Quibli — single-choice questions, shared instantly.</span>
          <span className="mono text-subtle">v0.1</span>
        </div>
      </footer>
    </div>
  );
}
