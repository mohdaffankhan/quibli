import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Download,
  Sparkles,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/polls/StatusPill";
import { QuestionAnalyticsCard } from "@/components/polls/AnalyticsChart";
import { usePollLive } from "@/hooks/usePollLive";
import { shortDate } from "@/lib/utils";
import type {
  Analytics,
  AnalyticsTimeseries,
  PollDTO,
  TimeseriesWindow,
} from "@/lib/types";

export function PollAnalytics() {
  const { id } = useParams<{ id: string }>();

  const { data: poll, isLoading: pollLoading } = useQuery({
    queryKey: ["poll", id],
    queryFn: () => api.getPoll(id!),
    enabled: !!id,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics", id],
    queryFn: () => api.analytics(id!),
    enabled: !!id && !!poll && poll.status !== "draft",
    refetchInterval: poll?.status === "active" ? 30_000 : false,
  });

  const windowKey: TimeseriesWindow = "7d";
  const { data: timeseries } = useQuery({
    queryKey: ["analytics-timeseries", id, windowKey],
    queryFn: () =>
      api.analyticsTimeseries(id!, { granularity: "day", window: windowKey }),
    enabled: !!id && !!poll && poll.status !== "draft",
    refetchInterval: poll?.status === "active" ? 60_000 : false,
  });

  const { status: liveStatus } = usePollLive({
    slug: poll?.slug,
    pollId: poll?.id,
    admin: true,
  });

  if (pollLoading || !poll) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10 space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (poll.status === "draft") {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 text-center">
        <Sparkles className="h-8 w-8 text-accent mx-auto" />
        <h1 className="mt-4 text-[22px] font-semibold tracking-tight">
          Analytics aren't available yet
        </h1>
        <p className="mt-2 text-[14px] text-muted max-w-md mx-auto">
          Activate this poll to start collecting responses. As soon as data
          arrives, it'll show up here.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to={`/polls/${poll.id}`}>
            <Button>Go to poll</Button>
          </Link>
          <Link to={`/polls/${poll.id}/edit`}>
            <Button variant="secondary">Edit draft</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex items-center gap-3 text-[13px] text-muted mb-4">
        <Link
          to={`/polls/${poll.id}`}
          className="inline-flex items-center gap-1.5 hover:text-fg transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to poll
        </Link>
      </div>

      <header className="flex items-start justify-between gap-4 flex-wrap pb-6 border-b border-hairline">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill status={poll.status} />
            {liveStatus === "live" && poll.status === "active" ? (
              <Badge tone="success" dot>
                Live updates
              </Badge>
            ) : null}
            <span className="mono text-[11.5px] text-subtle">/{poll.slug}</span>
          </div>
          <h1 className="mt-2 text-[28px] sm:text-[32px] font-semibold tracking-tight text-balance">
            {poll.title}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            Analytics dashboard · created {shortDate(poll.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportCsv(poll, analytics)}
            disabled={!analytics}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </header>

      {analyticsLoading || !analytics ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <KpiGrid poll={poll} analytics={analytics} />
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 space-y-4">
              {analytics.perQuestion.map((q) => (
                <div
                  key={q.questionId}
                  className="rounded-[16px] emerald-glow"
                >
                  <QuestionAnalyticsCard question={q} />
                </div>
              ))}
            </div>
            <div className="lg:col-span-2 space-y-5">
              <VelocityChart timeseries={timeseries} />
              <InsightCard poll={poll} analytics={analytics} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiGrid({
  poll,
  analytics,
}: {
  poll: PollDTO;
  analytics: Analytics;
}) {
  const total = analytics.totalResponses;
  const completion = useMemo(() => {
    if (total === 0) return 0;
    const required = poll.questions.filter((q) => q.isRequired).length;
    if (required === 0) return 100;
    const answered = analytics.perQuestion.reduce(
      (acc, q) => acc + q.totalAnswers,
      0,
    );
    return Math.min(
      100,
      Math.round((answered / (required * total)) * 100),
    );
  }, [analytics, poll, total]);

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Kpi
        label="Total responses"
        value={total.toLocaleString()}
        icon={<Users className="h-5 w-5" />}
        trend={
          poll.status === "active" ? (
            <span className="flex items-center gap-1.5 text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />
              Live
            </span>
          ) : (
            <span className="text-muted">Final</span>
          )
        }
      />
      <Kpi
        label="Completion rate"
        value={`${completion}%`}
        icon={<TrendingUp className="h-5 w-5" />}
        trend={
          <span className="text-muted">
            {poll.questions.filter((q) => q.isRequired).length} required Q
          </span>
        }
        progress={completion}
      />
      <Kpi
        label="Unique respondents"
        value={
          poll.responseMode === "authenticated"
            ? analytics.uniqueAuthRespondents.toLocaleString()
            : total.toLocaleString()
        }
        icon={<Timer className="h-5 w-5" />}
        trend={
          <span className="text-muted">
            {poll.responseMode === "authenticated" ? "signed in" : "anonymous"}
          </span>
        }
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  trend,
  progress,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: React.ReactNode;
  progress?: number;
}) {
  return (
    <div className="rounded-[14px] bg-surface card-hairline p-5 group hover:emerald-glow transition-shadow">
      <div className="flex items-start justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
          {label}
        </span>
        <span className="h-9 w-9 grid place-items-center rounded-[10px] bg-accent-subtle text-accent group-hover:scale-105 transition-transform">
          {icon}
        </span>
      </div>
      <div className="mt-3 tabular text-[34px] font-semibold tracking-tight leading-none">
        {value}
      </div>
      {trend ? (
        <div className="mt-3 text-[12px] font-medium">{trend}</div>
      ) : null}
      {typeof progress === "number" ? (
        <div className="mt-2 h-1 rounded-full bg-hairline overflow-hidden">
          <div
            className="h-full bg-accent rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function VelocityChart({
  timeseries,
}: {
  timeseries: AnalyticsTimeseries | undefined;
}) {
  const buckets = timeseries?.buckets ?? [];
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((acc, b) => acc + b.count, 0);

  return (
    <div className="rounded-[14px] bg-surface card-hairline p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">
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

      <div className="mt-5 h-40 relative">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-accent/10 to-transparent rounded-[10px] pointer-events-none"
        />
        <div className="relative h-full flex items-end justify-between gap-1.5 px-1">
          {buckets.length === 0 ? (
            <div className="m-auto text-[12px] text-muted flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Waiting for responses
            </div>
          ) : (
            buckets.map((b, i) => (
              <div
                key={b.t}
                className="flex-1 min-w-0 flex flex-col items-center justify-end h-full"
                title={`${new Date(b.t).toLocaleString()}: ${b.count}`}
              >
                <span className="text-[10px] text-muted tabular mb-1 h-3.5">
                  {b.count > 0 ? b.count : ""}
                </span>
                <div
                  className="w-full rounded-t-[4px] bg-accent anim-bar"
                  style={{
                    height: `${Math.max(2, (b.count / max) * 88)}%`,
                    opacity: b.count === 0 ? 0.18 : 0.55 + (b.count / max) * 0.45,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[10.5px] text-subtle">
        {buckets.map((b) => (
          <span key={b.t} className="flex-1 text-center">
            {dayLabel(b.t)}
          </span>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-hairline flex items-center justify-between text-[12px]">
        <span className="text-muted">7-day total</span>
        <span className="tabular font-semibold text-fg">{total}</span>
      </div>
    </div>
  );
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short" });
}

function InsightCard({
  poll,
  analytics,
}: {
  poll: PollDTO;
  analytics: Analytics;
}) {
  const insight = useMemo(() => deriveInsight(poll, analytics), [poll, analytics]);
  return (
    <div className="rounded-[14px] bg-accent-subtle/50 border border-accent/20 p-5">
      <div className="flex items-center gap-2 text-accent">
        <Sparkles className="h-4 w-4" />
        <span className="text-[11px] uppercase tracking-wider font-semibold">
          Key insight
        </span>
      </div>
      <p className="mt-3 text-[14.5px] text-fg leading-snug">
        {insight}
      </p>
    </div>
  );
}

function deriveInsight(poll: PollDTO, a: Analytics): string {
  if (a.totalResponses === 0) {
    return "No responses yet. Share the public link to start collecting answers.";
  }
  const first = a.perQuestion[0];
  if (!first || first.options.length === 0) {
    return `Collected ${a.totalResponses} responses across ${poll.questions.length} question${poll.questions.length === 1 ? "" : "s"}.`;
  }
  const winner = [...first.options].sort((a, b) => b.count - a.count)[0];
  if (!winner || winner.count === 0) {
    return "Responses are coming in but no clear leader has emerged yet.";
  }
  return `"${winner.label}" leads "${first.prompt}" with ${winner.pct}% of ${first.totalAnswers} answer${first.totalAnswers === 1 ? "" : "s"}.`;
}

function exportCsv(poll: PollDTO, analytics?: Analytics) {
  if (!analytics) return;
  const lines: string[] = [];
  lines.push("question,option,count,percent");
  for (const q of analytics.perQuestion) {
    for (const o of q.options) {
      lines.push(
        [csvCell(q.prompt), csvCell(o.label), o.count, o.pct].join(","),
      );
    }
  }
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${poll.slug}-analytics.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvCell(s: string): string {
  const needs = /[",\n]/.test(s);
  const esc = s.replace(/"/g, '""');
  return needs ? `"${esc}"` : esc;
}
