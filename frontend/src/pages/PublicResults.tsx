import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, Sparkles, Timer, Users } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { QuestionAnalyticsCard } from "@/components/polls/AnalyticsChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { Analytics, AnalyticsOption } from "@/lib/types";

export function PublicResults() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-results", slug],
    queryFn: () => api.getPublicResults(slug!),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    const e = error as ApiError | undefined;
    const pending =
      e?.code === "POLL_NOT_AVAILABLE" || e?.code === "RESULTS_NOT_PUBLISHED";
    return (
      <div className="mx-auto max-w-md px-4 sm:px-6 py-16 text-center anim-in">
        <p className="mono text-[11.5px] tracking-wide text-subtle uppercase">
          {pending ? "Pending" : "Unavailable"}
        </p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight">
          {pending ? "Results aren't published yet" : "Results unavailable"}
        </h1>
        <p className="mt-2 text-[14px] text-muted text-pretty">
          {e?.message ??
            (pending
              ? "The creator hasn't published results yet."
              : "We couldn't load this poll's results.")}
        </p>
      </div>
    );
  }

  if (!data) return null;
  const { poll, results } = data;
  const { perQuestion, totalResponses } = results;

  const winner = pickWinner(results);
  const questionCount = perQuestion.length;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 anim-in">
      <header className="pb-7">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="success" dot>
            Results published
          </Badge>
          <span className="text-[11.5px] mono text-subtle">/{poll.slug}</span>
        </div>
        <h1 className="mt-3 text-[28px] sm:text-[36px] font-semibold tracking-tight leading-tight text-balance">
          {poll.title}
        </h1>
        {poll.description ? (
          <p className="mt-2 text-[15px] text-muted text-pretty max-w-2xl leading-relaxed">
            {poll.description}
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiTile
          icon={<Users className="h-5 w-5" />}
          label="Total responses"
          value={totalResponses.toLocaleString()}
        />
        <KpiTile
          icon={<Award className="h-5 w-5" />}
          label="Top answer"
          value={winner?.pct != null ? `${winner.pct}%` : "—"}
          sublabel={winner?.label ?? "no responses yet"}
        />
        <KpiTile
          icon={<Timer className="h-5 w-5" />}
          label="Questions"
          value={questionCount.toString()}
          sublabel={
            poll.responseMode === "authenticated" ? "sign-in required" : "anonymous"
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-4">
          {perQuestion.map((q, i) => (
            <div
              key={q.questionId}
              className={i === 0 ? "rounded-[16px] emerald-glow" : ""}
            >
              <QuestionAnalyticsCard question={q} />
            </div>
          ))}
        </div>
        <aside className="lg:col-span-2 space-y-5">
          <div className="rounded-[16px] bg-accent-subtle/50 border border-accent/20 p-6">
            <div className="flex items-center gap-2 text-accent">
              <Sparkles className="h-4 w-4" />
              <span className="text-[11px] uppercase tracking-wider font-semibold">
                Key insight
              </span>
            </div>
            <p className="mt-3 text-[15px] text-fg leading-snug">
              {summary(results, totalResponses)}
            </p>
          </div>

          <div className="rounded-[16px] bg-surface card-hairline p-6">
            <h3 className="text-[15px] font-semibold tracking-tight">
              Executive summary
            </h3>
            <div
              aria-hidden
              className="mt-3 h-1 w-10 rounded-full bg-accent"
            />
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span>
                  {totalResponses.toLocaleString()} responses collected across{" "}
                  {questionCount} question{questionCount === 1 ? "" : "s"}.
                </span>
              </li>
              {winner ? (
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  <span>
                    "{winner.label}" leads with {winner.pct}% of responses.
                  </span>
                </li>
              ) : null}
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span>
                  {poll.responseMode === "authenticated"
                    ? "Each respondent was signed-in and counted once."
                    : "Responses were collected anonymously."}
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function pickWinner(a: Analytics): AnalyticsOption | null {
  let best: AnalyticsOption | null = null;
  for (const q of a.perQuestion) {
    for (const o of q.options) {
      if (!best || o.count > best.count) best = o;
    }
  }
  return best && best.count > 0 ? best : null;
}

function summary(a: Analytics, total: number): string {
  if (total === 0) {
    return "No responses were recorded before the poll was published.";
  }
  const first = a.perQuestion[0];
  if (!first) {
    return `Final tally: ${total} response${total === 1 ? "" : "s"}.`;
  }
  const sorted = [...first.options].sort((x, y) => y.count - x.count);
  const top = sorted[0];
  if (!top || top.count === 0) {
    return `${total} response${total === 1 ? "" : "s"} recorded with no clear leader.`;
  }
  return `${total.toLocaleString()} response${total === 1 ? "" : "s"}. "${top.label}" leads "${first.prompt}" with ${top.pct}%.`;
}

function KpiTile({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-[14px] bg-surface card-hairline p-5">
      <div className="flex items-start justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
          {label}
        </span>
        <span className="h-9 w-9 grid place-items-center rounded-[10px] bg-accent-subtle text-accent">
          {icon}
        </span>
      </div>
      <div className="mt-3 tabular text-[34px] font-semibold tracking-tight leading-none">
        {value}
      </div>
      {sublabel ? (
        <div className="mt-2 text-[12px] text-muted truncate">{sublabel}</div>
      ) : null}
    </div>
  );
}
