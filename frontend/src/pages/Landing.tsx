import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Clock,
  Lock,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { Button } from "@/components/ui/button";

function PreviewCard() {
  const options = [
    { label: "Market expansion", pct: 64 },
    { label: "Product innovation", pct: 28 },
    { label: "Customer retention", pct: 8 },
  ];
  return (
    <div className="relative rounded-[20px] bg-surface-2 border border-border emerald-shadow p-6">
      <div className="flex items-center justify-between mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle text-accent-active px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />
          Live preview
        </span>
        <span className="text-[11.5px] text-muted">412 responses</span>
      </div>

      <h3 className="text-[17px] font-semibold tracking-tight text-fg leading-snug">
        What should we prioritise next quarter?
      </h3>
      <p className="text-[12.5px] text-muted mt-1 mb-5">
        Real-time poll · closes in 2h 14m
      </p>

      <div className="space-y-4">
        {options.map((o, i) => (
          <div key={o.label}>
            <div className="flex items-center justify-between mb-1.5 text-[13px]">
              <span className="text-fg font-medium">{o.label}</span>
              <span className="text-muted tabular">{o.pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-hairline overflow-hidden">
              <div
                className="h-full bg-accent rounded-full anim-bar"
                style={{
                  width: `${o.pct}%`,
                  opacity: i === 0 ? 1 : 0.7 - i * 0.15,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-hairline pt-4">
        <div className="flex -space-x-2">
          {["#10b981", "#34c98c", "#6ee7b7", "#bfead6"].map((c, i) => (
            <span
              key={i}
              className="h-7 w-7 rounded-full ring-2 ring-surface-2"
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted">
          <Users className="h-3.5 w-3.5" />
          412 voters · anonymous
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <MarketingShell>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid md:grid-cols-12 gap-10 md:gap-12 items-center">
          <div className="md:col-span-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle text-accent-active px-3 py-1 text-[11px] font-semibold tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Live polling for serious teams
            </span>
            <h1 className="mt-5 text-[40px] md:text-[56px] leading-[1.05] font-bold tracking-[-0.02em] text-balance">
              Ask the room.{" "}
              <span className="text-accent">See answers form in real time.</span>
            </h1>
            <p className="mt-5 text-[16px] text-muted leading-relaxed max-w-xl text-pretty">
              Polls for product reviews, all-hands, classroom check-ins, and
              anything that needs a fast read. Anonymous or authenticated.
              Share with a link, watch the bars move.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg" className="emerald-shadow">
                  Create a poll
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="secondary">
                  See the features
                </Button>
              </a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md text-[12px] text-muted">
              <Stat label="Polls run" value="12.4k" />
              <Stat label="Responses" value="1.2M" />
              <Stat label="Live now" value="84" pulse />
            </div>
            <p className="mt-2 text-[11px] text-muted/80">
              Snapshot · for illustration
            </p>
          </div>
          <div className="md:col-span-5">
            <PreviewCard />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="mx-auto max-w-6xl px-4 sm:px-6 pb-20 md:pb-28"
      >
        <div className="grid md:grid-cols-12 gap-5">
          <Bento
            className="md:col-span-8"
            icon={<BarChart3 className="h-5 w-5" />}
            title="Live analytics that aren't decoration"
            body="Every response refreshes the chart for the creator and every viewer subscribed to the public link. No refresh button, no five-minute delay."
          />
          <Bento
            className="md:col-span-4"
            icon={<Lock className="h-5 w-5" />}
            title="Anonymous by default"
            body="Use a salted IP hash to deduplicate without ever storing who voted. Switch to authenticated mode for surveys with sign-in."
          />
          <Bento
            className="md:col-span-4"
            icon={<Clock className="h-5 w-5" />}
            title="Expire on schedule"
            body="Set a closing time when you create the poll. We stop accepting responses the moment it expires. No babysitting."
          />
          <Bento
            className="md:col-span-8"
            icon={<Zap className="h-5 w-5" />}
            title="Built for the boring last mile"
            body="Drafts auto-save. Closed polls become a shareable results page with one click. CSV export so you can take the numbers somewhere else."
          />
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-6xl px-4 sm:px-6 pb-20 md:pb-28">
        <h2 className="text-[26px] md:text-[32px] font-semibold tracking-tight">
          From draft to results in four steps
        </h2>
        <p className="mt-2 text-muted text-[15px] max-w-xl">
          The whole flow is built to take less time than writing the question.
        </p>
        <div className="mt-8 grid md:grid-cols-4 gap-4">
          {[
            ["Compose", "Title, description, one question, two options. That's it."],
            ["Activate", "Lock the poll and share the public link."],
            ["Collect", "Anonymous or authenticated, your call."],
            ["Publish", "Same link now serves the final results page."],
          ].map(([title, body], i) => (
            <div
              key={title}
              className="rounded-[14px] bg-surface card-hairline p-5 hover:emerald-glow transition-shadow"
            >
              <div className="h-8 w-8 rounded-[10px] bg-accent text-on-accent grid place-items-center font-semibold text-[13px]">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-4 font-semibold text-fg text-[15px]">{title}</h3>
              <p className="mt-1 text-[13px] text-muted leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="mx-auto max-w-4xl px-4 sm:px-6 pb-20 md:pb-28">
        <div className="rounded-[20px] glass-panel border border-accent/20 emerald-shadow p-10 md:p-14 text-center">
          <h2 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-balance">
            Start a poll. Watch the answers arrive.
          </h2>
          <p className="mt-3 text-muted max-w-xl mx-auto text-pretty">
            Free to try. No credit card. Shareable links by default.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button size="lg">Create your first poll</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

function Stat({
  label,
  value,
  pulse,
}: {
  label: string;
  value: string;
  pulse?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        {pulse ? (
          <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />
        ) : null}
        <div className="text-[20px] font-semibold tabular tracking-tight text-fg">
          {value}
        </div>
      </div>
      <div className="text-[11px] uppercase tracking-wider text-muted mt-0.5">
        {label}
      </div>
    </div>
  );
}

function Bento({
  className,
  icon,
  title,
  body,
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      className={`rounded-[18px] bg-surface card-hairline p-6 hover:emerald-glow transition-shadow group ${className ?? ""}`}
    >
      <div className="h-10 w-10 rounded-[10px] bg-accent-subtle text-accent grid place-items-center">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-fg text-[17px] tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 text-[13.5px] text-muted leading-relaxed">{body}</p>
    </div>
  );
}
