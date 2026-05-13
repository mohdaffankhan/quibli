import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, CheckCircle2, Lock } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { PollDTO } from "@/lib/types";

export function PublicRespond() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, ready } = useAuth();

  const { data: envelope, isLoading, error } = useQuery({
    queryKey: ["public-poll", slug],
    queryFn: () => api.getPublicPoll(slug!),
    enabled: !!slug,
    retry: false,
  });
  const poll = envelope?.poll;

  // If poll is published, jump to the results view
  useEffect(() => {
    if (envelope && envelope.status === "published") {
      navigate(`/p/${slug}/results`, { replace: true });
    }
  }, [envelope, slug, navigate]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = useMutation({
    mutationFn: async () => {
      if (!poll) return;
      const errors: Record<string, string> = {};
      for (const q of poll.questions) {
        if (q.isRequired && !answers[q.id]) {
          errors[q.id] = "This question is required.";
        }
      }
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) {
        const firstId = Object.keys(errors)[0];
        const el = formRef.current?.querySelector(
          `[data-question="${firstId}"]`,
        ) as HTMLElement | null;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus?.();
        throw new Error("Please answer the required questions.");
      }
      const payload = Object.entries(answers).map(([questionId, optionId]) => ({
        questionId,
        optionId,
      }));
      return api.respond(slug!, { answers: payload });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === "ALREADY_RESPONDED") {
          setSubmitted(true);
        }
      }
    },
  });

  const expiryInfo = useExpiryInfo(poll);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <div className="h-8 w-2/3 bg-hairline rounded-md" />
      </div>
    );
  }

  if (error) {
    const e = error as ApiError | undefined;
    return (
      <GoneState
        reason={e?.code}
        serverMessage={e?.message}
        slug={slug}
      />
    );
  }

  if (!poll) return null;
  // Published envelope has no `questions`; redirect-in-flight, render nothing.
  if (envelope && envelope.status === "published") return null;

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 anim-in">
        <Card>
          <CardBody className="px-6 py-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-success-subtle text-success flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-[20px] font-semibold tracking-tight">
              Thanks! Your response was recorded.
            </h2>
            <p className="mt-1.5 text-[13.5px] text-muted">
              You'll be able to view results here once the creator publishes
              them.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (poll.responseMode === "authenticated" && ready && !user) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-12 anim-in">
        <Card>
          <CardBody className="px-6 py-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-hairline text-muted flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-[20px] font-semibold tracking-tight">
              Sign-in required
            </h2>
            <p className="mt-1.5 text-[13.5px] text-muted">
              The creator of this poll requires respondents to be signed in.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button onClick={() => navigate("/login")}>Sign in</Button>
              <Button
                variant="secondary"
                onClick={() => navigate("/register")}
              >
                Create account
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14 anim-in">
      <header className="pb-7 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle text-accent-active px-3 py-1 text-[11px] font-semibold tracking-wider uppercase">
          <BadgeCheck className="h-3.5 w-3.5" />
          {poll.status === "active" ? "Active survey" : "Survey"}
        </span>
        <h1 className="mt-5 text-[28px] sm:text-[36px] font-semibold tracking-tight leading-tight text-balance">
          {poll.title}
        </h1>
        {poll.description ? (
          <p className="mt-3 text-[15px] text-muted text-pretty max-w-2xl mx-auto leading-relaxed">
            {poll.description}
          </p>
        ) : null}
        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
          <Badge tone="neutral">
            {poll.responseMode === "anonymous"
              ? "Anonymous response"
              : "Signed-in response"}
          </Badge>
          {expiryInfo ? (
            <Badge tone={expiryInfo.tone}>{expiryInfo.text}</Badge>
          ) : null}
        </div>
      </header>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
        className="mt-2 space-y-5"
      >
        {poll.questions.map((q, i) => (
          <fieldset
            key={q.id}
            data-question={q.id}
            tabIndex={-1}
            className="rounded-[16px] glass-card border border-border/60 outline-none transition-shadow hover:emerald-glow p-6"
          >
            <div className="flex items-start gap-4">
              <span
                aria-hidden
                className="h-10 w-10 shrink-0 rounded-[12px] bg-accent-subtle text-accent grid place-items-center font-semibold tabular text-[14px]"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <legend className="text-[18px] font-semibold tracking-tight text-fg text-pretty leading-snug">
                  {q.prompt}
                </legend>
                <div className="mt-1.5 flex items-center gap-2">
                  {q.isRequired ? (
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-accent">
                      Required
                    </span>
                  ) : (
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-subtle">
                      Optional
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {q.options.map((o) => {
                const selected = answers[q.id] === o.id;
                return (
                  <label
                    key={o.id}
                    className={cn(
                      "group flex items-center gap-3.5 rounded-[12px] border bg-surface/60 px-4 py-3.5 cursor-pointer transition-all duration-150",
                      "outline-none focus-within:ring-2 focus-within:ring-accent/40",
                      "active:scale-[0.997]",
                      selected
                        ? "border-accent bg-accent-subtle/60 emerald-glow"
                        : "border-border hover:border-accent/40 hover:bg-surface",
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={o.id}
                      checked={selected}
                      onChange={() =>
                        setAnswers((a) => ({ ...a, [q.id]: o.id }))
                      }
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "h-5 w-5 rounded-full border-[1.5px] shrink-0 transition-all grid place-items-center",
                        selected
                          ? "border-accent bg-accent"
                          : "border-border-strong group-hover:border-accent/60",
                      )}
                    >
                      {selected ? (
                        <span className="h-2 w-2 rounded-full bg-on-accent" />
                      ) : null}
                    </span>
                    <span className="text-[14.5px] text-fg flex-1">
                      {o.label}
                    </span>
                  </label>
                );
              })}

              {fieldErrors[q.id] ? (
                <p
                  role="alert"
                  className="text-[12.5px] text-danger flex items-center gap-1.5 mt-1"
                >
                  <span className="inline-block h-1 w-1 rounded-full bg-danger" />
                  {fieldErrors[q.id]}
                </p>
              ) : null}
            </div>
          </fieldset>
        ))}

        {submit.error && submit.error instanceof ApiError ? (
          <div
            role="alert"
            className="rounded-[10px] bg-danger-subtle text-danger text-[13px] px-3.5 py-2.5 border border-danger/15"
          >
            {humanizeRespondError(submit.error)}
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <p className="text-[12.5px] text-muted flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            {poll.responseMode === "anonymous"
              ? "Your responses are anonymous"
              : "Your identity is recorded for this signed-in poll"}
          </p>
          <Button
            size="lg"
            loading={submit.isPending}
            type="submit"
            className="w-full sm:w-auto emerald-shadow"
          >
            Submit response
          </Button>
        </div>
      </form>
    </div>
  );
}

function useExpiryInfo(poll: PollDTO | undefined) {
  return useMemo(() => {
    if (!poll?.expiresAt) return null;
    const ms = new Date(poll.expiresAt).getTime() - Date.now();
    if (ms <= 0)
      return { text: "Closed", tone: "danger" as const };
    return {
      text: `Closes in ${formatDuration(ms)}`,
      tone: "neutral" as const,
    };
  }, [poll?.expiresAt]);
}

function humanizeRespondError(err: ApiError): string {
  switch (err.code) {
    case "POLL_EXPIRED":
      return "This poll has expired and is no longer accepting responses.";
    case "POLL_NOT_ACCEPTING":
      return "This poll is not accepting responses right now.";
    case "ALREADY_RESPONDED":
      return "You've already responded to this poll.";
    case "AUTH_REQUIRED":
      return "Please sign in to respond.";
    case "MISSING_REQUIRED":
      return "Please answer all required questions.";
    case "INVALID_OPTION":
    case "DUPLICATE_ANSWER":
      return "Something doesn't look right with your selections.";
    default:
      return err.message;
  }
}

function GoneState({
  reason,
  serverMessage,
  slug,
}: {
  reason?: string;
  serverMessage?: string;
  slug?: string;
}) {
  const navigate = useNavigate();
  // POLL_NOT_AVAILABLE — backend returns it for "expired" AND "closed by creator".
  // Both mean: no longer accepting responses, results are pending publication.
  const ended =
    reason === "POLL_NOT_AVAILABLE" || reason === "POLL_EXPIRED";

  if (ended) {
    return (
      <div className="mx-auto max-w-md px-4 sm:px-6 py-16 text-center anim-in">
        <p className="mono text-[11.5px] tracking-wide text-subtle uppercase">
          Poll ended
        </p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight">
          This poll is no longer accepting responses
        </h1>
        <p className="mt-2 text-[14px] text-muted text-pretty">
          {serverMessage ??
            "Responses are closed. Results will appear here once the creator publishes them."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          {slug ? (
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate(`/p/${slug}/results`, { replace: true })}
            >
              Try the results page
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const title =
    reason === "POLL_NOT_FOUND"
      ? "Poll not found"
      : "This poll isn't available";
  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-16 text-center">
      <p className="mono text-[11.5px] tracking-wide text-subtle uppercase">
        Unavailable
      </p>
      <h1 className="mt-2 text-[26px] font-semibold tracking-tight">
        {title}
      </h1>
      <p className="mt-2 text-[14px] text-muted">
        Double-check the link, or come back later if the creator publishes
        results.
      </p>
    </div>
  );
}
