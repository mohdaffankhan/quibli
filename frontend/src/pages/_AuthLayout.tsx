import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shell/Brand";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Which side the brand panel sits on (form takes the other side). */
  side?: "left" | "right";
}

export function AuthLayout({
  title,
  subtitle,
  children,
  side = "left",
}: AuthLayoutProps) {
  const panelLeft = side === "left";
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[1.05fr_1fr] bg-bg">
      <aside
        className={cn(
          "relative hidden md:flex flex-col justify-between p-10 overflow-hidden text-white",
          "bg-[#06231a] bg-gradient-to-br from-[#0a3a2a] via-[#06231a] to-[#04160f]",
          panelLeft ? "md:order-1" : "md:order-2",
        )}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-grid opacity-[0.10] pointer-events-none"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-accent/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-accent/15 blur-3xl"
        />

        <Link to="/" className="relative z-10 w-fit" aria-label="Quibli home">
          <Brand />
        </Link>

        <div className="relative z-10 max-w-md">
          <h1 className="text-[34px] font-semibold tracking-tight leading-[1.05] text-balance">
            Ask one question.{" "}
            <span className="text-accent">Get the answer in real-time.</span>
          </h1>
          <p className="mt-4 text-[14px] text-white/65 leading-relaxed max-w-sm">
            Build single-choice polls, share a link, watch responses arrive
            live, then publish the results — all in the same place.
          </p>
        </div>

        <ul className="relative z-10 space-y-3 text-[13px] text-white/75">
          {[
            "Anonymous or authenticated responses",
            "Live counts via WebSockets",
            "Publish results when you're ready",
          ].map((line) => (
            <li key={line} className="flex items-center gap-2.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
              {line}
            </li>
          ))}
        </ul>
      </aside>

      <section
        className={cn(
          "relative flex flex-col items-center justify-center p-6 sm:p-10 min-h-dvh md:min-h-0",
          panelLeft ? "md:order-2" : "md:order-1",
        )}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-dot opacity-50 pointer-events-none"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-radial-emerald opacity-60"
        />
        <div className="relative z-10 w-full max-w-sm">
          <Link
            to="/"
            className="md:hidden mb-8 inline-flex w-fit"
            aria-label="Quibli home"
          >
            <Brand />
          </Link>
          <h2 className="text-[26px] font-semibold tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="mt-1.5 text-[14px] text-muted">{subtitle}</p>
          ) : null}
          <div className="mt-7">{children}</div>
        </div>
      </section>
    </div>
  );
}

export function SentinelButton() {
  return (
    <>
      <div className="flex items-center gap-3 my-4">
        <div className="h-px flex-1 bg-hairline" />
        <span className="text-[11.5px] tracking-wide text-subtle uppercase">
          or
        </span>
        <div className="h-px flex-1 bg-hairline" />
      </div>
      <a href="/auth/sentinel/login" className="block">
        <Button variant="secondary" size="lg" className="w-full" type="button">
          <SentinelLogo />
          Continue with Sentinel
        </Button>
      </a>
    </>
  );
}

function SentinelLogo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 2L4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2.2 2.2L15 10.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
