import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Inbox,
  Lightbulb,
  MoreHorizontal,
  Plus,
  Radio,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { copy, formatDuration, publicShareUrl, shortDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/polls/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import type { PollSummaryDTO } from "@/lib/types";

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["polls"],
    queryFn: api.listMyPolls,
  });

  const polls = data ?? [];
  const totals = computeTotals(polls);
  const completion = totals.total > 0 ? Math.round((totals.published / totals.total) * 100) : 0;
  const activeDays = computeActiveDays(polls);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="mono text-[11.5px] tracking-wide text-subtle uppercase">
            Workspace
          </p>
          <h1 className="mt-1 text-[32px] md:text-[36px] font-semibold tracking-tight leading-none text-balance">
            Executive Dashboard
          </h1>
          <p className="mt-2 text-[14px] text-muted max-w-xl">
            Monitor real-time poll performance, response velocity, and key
            insights at a glance.
          </p>
        </div>
        <Link to="/polls/new">
          <Button className="emerald-shadow">
            <Plus className="h-4 w-4" />
            New poll
          </Button>
        </Link>
      </header>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-8 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total polls"
              value={totals.total}
              icon={<FileText className="h-5 w-5" />}
              loading={isLoading}
              trend={totals.total > 0 ? `${totals.active} active` : null}
            />
            <KpiCard
              label="Total responses"
              value={totals.responses}
              icon={<BarChart3 className="h-5 w-5" />}
              loading={isLoading}
              trend={totals.responses > 0 ? "live" : null}
              trendPulse
            />
            <KpiCard
              label="Completion rate"
              value={completion}
              suffix="%"
              icon={<CheckCircle2 className="h-5 w-5" />}
              loading={isLoading}
              trend={`${totals.published} published`}
            />
            <KpiCard
              label="Active days"
              value={activeDays}
              icon={<Clock className="h-5 w-5" />}
              loading={isLoading}
              trend={polls.length > 0 ? "since launch" : null}
            />
          </div>

          <div className="rounded-[16px] bg-surface card-hairline overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-hairline">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight">
                  Recent polls
                </h2>
                {polls.length ? (
                  <span className="inline-flex items-center text-[11.5px] text-muted bg-hairline rounded-full px-2 py-0.5">
                    {polls.length}
                  </span>
                ) : null}
              </div>
              <Link
                to="/polls/new"
                className="text-[12px] font-medium text-accent hover:underline"
              >
                Create poll →
              </Link>
            </div>

            {isLoading ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : polls.length === 0 ? (
              <EmptyState
                title="No polls yet"
                description="Quibli helps you collect a single answer from many people. Create your first to see it here."
                icon={<FileText className="h-6 w-6" />}
                action={
                  <Link to="/polls/new">
                    <Button>
                      <Plus className="h-4 w-4" />
                      Create your first poll
                    </Button>
                  </Link>
                }
              />
            ) : (
              <PollsTable polls={polls} />
            )}
          </div>
        </section>

        <aside className="xl:col-span-4 space-y-6 xl:sticky xl:top-20 self-start">
          <VelocityCard />
          <ProTipCard />
        </aside>
      </div>

      <Link
        to="/polls/new"
        aria-label="Create poll"
        className="fixed bottom-6 right-6 z-20 h-14 w-14 grid place-items-center rounded-full bg-accent text-on-accent emerald-shadow hover:bg-accent-hover active:scale-95 transition-all md:hidden"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}

function computeTotals(polls: PollSummaryDTO[]) {
  return polls.reduce(
    (acc, p) => {
      acc.total += 1;
      acc.responses += p.totalResponses;
      if (p.status === "active") acc.active += 1;
      if (p.status === "published") acc.published += 1;
      return acc;
    },
    { total: 0, active: 0, responses: 0, published: 0 },
  );
}

function computeActiveDays(polls: PollSummaryDTO[]): number {
  if (polls.length === 0) return 0;
  const oldest = polls.reduce(
    (min, p) => Math.min(min, new Date(p.createdAt).getTime()),
    Date.now(),
  );
  return Math.max(1, Math.round((Date.now() - oldest) / 86400000));
}

interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  trend?: string | null;
  trendPulse?: boolean;
  loading?: boolean;
}

function KpiCard({
  label,
  value,
  suffix,
  icon,
  trend,
  trendPulse,
  loading,
}: KpiCardProps) {
  return (
    <div className="rounded-[14px] bg-surface card-hairline p-5 hover:emerald-glow transition-shadow group">
      <div className="flex items-start justify-between">
        <span className="text-[11px] tracking-wider uppercase text-muted font-semibold">
          {label}
        </span>
        <span className="h-9 w-9 grid place-items-center rounded-[10px] bg-accent-subtle text-accent group-hover:scale-105 transition-transform">
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-9 w-20 mt-3" />
      ) : (
        <div className="mt-3 tabular text-[34px] font-semibold tracking-tight leading-none text-fg">
          {value.toLocaleString()}
          {suffix ? <span className="text-muted text-[20px]">{suffix}</span> : null}
        </div>
      )}
      {trend ? (
        <div className="mt-3 flex items-center gap-1.5 text-[12px] text-accent font-medium">
          {trendPulse ? (
            <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />
          ) : (
            <TrendingUp className="h-3.5 w-3.5" />
          )}
          {trend}
        </div>
      ) : (
        <div className="mt-3 text-[12px] text-subtle">—</div>
      )}
    </div>
  );
}

function PollsTable({ polls }: { polls: PollSummaryDTO[] }) {
  return (
    <ul role="list" className="divide-y divide-hairline">
      {polls.map((p, i) => (
        <li
          key={p.id}
          className="anim-in"
          style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
        >
          <PollRow poll={p} index={i} />
        </li>
      ))}
    </ul>
  );
}

const ICON_PALETTE = [
  "bg-accent-subtle text-accent",
  "bg-warning-subtle text-warning",
  "bg-success-subtle text-success",
  "bg-danger-subtle text-danger",
];

function PollRow({ poll, index }: { poll: PollSummaryDTO; index: number }) {
  const url = publicShareUrl(poll.slug);
  const iconCls = ICON_PALETTE[index % ICON_PALETTE.length];
  return (
    <div className="group relative flex items-center gap-4 px-5 py-4 hover:bg-bg/60 transition-colors">
      <div
        className={`h-11 w-11 rounded-[12px] grid place-items-center shrink-0 ${iconCls}`}
        aria-hidden
      >
        <Radio className="h-5 w-5" />
      </div>

      <Link
        to={`/polls/${poll.id}`}
        className="flex-1 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-md"
      >
        <div className="text-[14.5px] font-medium tracking-tight truncate group-hover:text-accent transition-colors">
          {poll.title}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
          <span className="mono text-subtle truncate">/{poll.slug}</span>
          <span className="text-subtle">·</span>
          <span>{shortDate(poll.createdAt)}</span>
          <span className="text-subtle">·</span>
          <span className="tabular">{poll.totalResponses} responses</span>
        </div>
      </Link>

      <div className="hidden md:flex flex-col items-end leading-tight shrink-0 min-w-[88px]">
        {poll.expiresAt ? (
          <ExpiryHint expiresAt={poll.expiresAt} />
        ) : (
          <span className="text-[11.5px] text-subtle">no expiry</span>
        )}
      </div>

      <div className="hidden sm:flex shrink-0">
        <StatusPill status={poll.status} />
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          aria-label="Copy public link"
          onClick={(e) => {
            e.stopPropagation();
            void copy(url).then(() => toast.success("Link copied"));
          }}
          className="h-9 w-9 inline-flex items-center justify-center rounded-[8px] text-muted hover:bg-hairline hover:text-fg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open public link"
          onClick={(e) => e.stopPropagation()}
          className="h-9 w-9 inline-flex items-center justify-center rounded-[8px] text-muted hover:bg-hairline hover:text-fg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <Link
          to={`/polls/${poll.id}`}
          aria-label="Open poll"
          className="h-9 w-9 inline-flex items-center justify-center rounded-[8px] text-muted hover:bg-hairline hover:text-fg transition-colors"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function ExpiryHint({ expiresAt }: { expiresAt: string }) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const expired = ms <= 0;
  return (
    <>
      <span
        className={`text-[12px] font-medium tabular ${
          expired ? "text-danger" : "text-fg"
        }`}
      >
        {expired ? "expired" : formatDuration(ms)}
      </span>
      <span className="text-[11px] text-subtle">
        {expired ? shortDate(expiresAt) : "remaining"}
      </span>
    </>
  );
}

function VelocityCard() {
  const bars = [40, 55, 72, 60, 85, 95, 82];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="rounded-[14px] bg-surface card-hairline p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-wider uppercase text-muted font-semibold">
            Response velocity
          </p>
          <p className="mt-1 text-[15px] font-semibold tracking-tight">
            Last 7 days
          </p>
        </div>
        <span className="h-9 w-9 grid place-items-center rounded-[10px] bg-accent-subtle text-accent">
          <BarChart3 className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5 h-32 rounded-[10px] bg-bg/50 p-3 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-accent/10 to-transparent pointer-events-none"
        />
        <div className="relative h-full flex items-end justify-between gap-2">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-[3px] bg-accent anim-bar"
              style={{
                height: `${h}%`,
                opacity: 0.45 + (h / 100) * 0.55,
                animationDelay: `${i * 60}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[10.5px] text-subtle">
        {labels.map((l) => (
          <span key={l} className="flex-1 text-center">
            {l}
          </span>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-hairline flex items-center justify-between text-[12px]">
        <span className="text-muted">Open a poll for live analytics</span>
        <Link to="#" className="text-accent font-medium hover:underline">
          View →
        </Link>
      </div>
    </div>
  );
}

function ProTipCard() {
  return (
    <div className="relative rounded-[14px] bg-accent-subtle/60 border border-accent/20 p-5 overflow-hidden">
      <Lightbulb
        className="absolute -right-3 -top-3 h-16 w-16 text-accent/15"
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-center gap-2 text-accent">
          <Lightbulb className="h-4 w-4" />
          <span className="text-[11px] tracking-wider uppercase font-semibold">
            Pro tip
          </span>
        </div>
        <p className="mt-3 text-[14px] text-fg leading-snug">
          Keep polls under 5 questions. Completion rate doubles when respondents
          can finish in under 60 seconds.
        </p>
        <Link
          to="/polls/new"
          className="mt-4 inline-flex items-center text-[12.5px] font-medium text-accent hover:underline"
        >
          Start a quick poll →
        </Link>
      </div>
      <Inbox className="hidden" />
    </div>
  );
}
