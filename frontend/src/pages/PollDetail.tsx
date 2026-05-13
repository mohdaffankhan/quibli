import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Copy,
  Edit2,
  ExternalLink,
  Power,
  Send,
  Trash2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api, ApiError } from "@/lib/api";
import { copy, formatDuration, publicShareUrl, shortDate } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import {
  ResponseModePill,
  StatusPill,
} from "@/components/polls/StatusPill";
import { usePollLive } from "@/hooks/usePollLive";
import { useTheme } from "@/lib/theme-context";
import type { Analytics, PollDTO } from "@/lib/types";

export function PollDetail() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tab = params.get("tab") ?? "overview";

  const { data: poll, isLoading } = useQuery({
    queryKey: ["poll", id],
    queryFn: () => api.getPoll(id!),
    enabled: !!id,
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics", id],
    queryFn: () => api.analytics(id!),
    enabled: !!id && !!poll && poll.status !== "draft",
    // Socket events drive updates via usePollLive's invalidation; this is a
    // slow fallback in case the websocket reconnects with a gap.
    refetchInterval: poll?.status === "active" ? 30_000 : false,
  });

  const { status: liveStatus } = usePollLive({
    slug: poll?.slug,
    pollId: poll?.id,
    admin: true,
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const transition = useMutation({
    mutationFn: async (action: "activate" | "close" | "publish") => {
      if (action === "activate") return api.activatePoll(id!);
      if (action === "close") return api.closePoll(id!);
      return api.publishPoll(id!);
    },
    onSuccess: (next) => {
      qc.setQueryData(["poll", id], next);
      qc.invalidateQueries({ queryKey: ["analytics", id] });
      qc.invalidateQueries({ queryKey: ["polls"] });
      toast.success("Poll updated");
    },
    onError: (e) => {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Action failed");
    },
  });

  const deletePoll = useMutation({
    mutationFn: () => api.deletePoll(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["polls"] });
      toast.success("Poll deleted");
      navigate("/dashboard");
    },
    onError: () => toast.error("Could not delete poll"),
  });

  if (isLoading || !poll) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10 space-y-5">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex items-center gap-3 text-[13px] text-muted mb-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 hover:text-fg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-md"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
      </div>

      <header className="flex items-start gap-4 flex-wrap pb-5 border-b border-hairline">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <StatusPill status={poll.status} />
            <ResponseModePill mode={poll.responseMode} />
            {liveStatus === "live" && poll.status === "active" ? (
              <Badge tone="success" dot>
                Live
              </Badge>
            ) : null}
            <span className="mono text-[11.5px] text-subtle">
              /{poll.slug}
            </span>
          </div>
          <h1 className="mt-2 text-[26px] sm:text-[30px] font-semibold tracking-tight leading-tight text-balance">
            {poll.title}
          </h1>
          {poll.description ? (
            <p className="mt-1.5 max-w-2xl text-[14px] text-muted text-pretty">
              {poll.description}
            </p>
          ) : null}
        </div>

        <ActionRow
          poll={poll}
          analytics={analytics}
          onTransition={(a) => transition.mutate(a)}
          loadingTransition={transition.isPending}
          onAskDelete={() => setConfirmDelete(true)}
          onAskPublish={() => setConfirmPublish(true)}
        />
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v })}
        className="mt-6"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="share">Share</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewPanel poll={poll} analytics={analytics} />
        </TabsContent>

        <TabsContent value="share" className="mt-5">
          <SharePanel poll={poll} />
        </TabsContent>
      </Tabs>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this poll?"
        description="This action permanently removes the poll, its questions, and all responses. It can't be undone."
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setConfirmDelete(false)}
            disabled={deletePoll.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            type="button"
            loading={deletePoll.isPending}
            onClick={() => deletePoll.mutate()}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete poll
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        title="Publish results?"
        description="Anyone with the link will see aggregated results. You won't be able to collect new responses."
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setConfirmPublish(false)}
            disabled={transition.isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            type="button"
            loading={transition.isPending}
            onClick={() => {
              transition.mutate("publish", {
                onSuccess: () => setConfirmPublish(false),
              });
            }}
          >
            <Send className="h-3.5 w-3.5" />
            Publish results
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

interface ActionRowProps {
  poll: PollDTO;
  analytics: Analytics | undefined;
  onTransition: (a: "activate" | "close" | "publish") => void;
  loadingTransition: boolean;
  onAskDelete: () => void;
  onAskPublish: () => void;
}

function ActionRow({
  poll,
  onTransition,
  loadingTransition,
  onAskDelete,
  onAskPublish,
}: ActionRowProps) {
  return (
    <div className="flex items-center gap-2 ml-auto">
      {poll.status !== "draft" ? (
        <Link to={`/polls/${poll.id}/analytics`}>
          <Button variant="secondary" size="sm" className="emerald-glow">
            <BarChart3 className="h-3.5 w-3.5" />
            View analytics
          </Button>
        </Link>
      ) : null}

      {poll.status === "draft" ? (
        <>
          <Link to={`/polls/${poll.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <Button
            size="sm"
            loading={loadingTransition}
            onClick={() => onTransition("activate")}
          >
            <Power className="h-3.5 w-3.5" />
            Activate
          </Button>
        </>
      ) : null}

      {poll.status === "active" ? (
        <Button
          variant="secondary"
          size="sm"
          loading={loadingTransition}
          onClick={() => onTransition("close")}
        >
          Close responses
        </Button>
      ) : null}

      {poll.status === "closed" ? (
        <Button size="sm" onClick={onAskPublish} loading={loadingTransition}>
          <Send className="h-3.5 w-3.5" />
          Publish results
        </Button>
      ) : null}

      <Button
        variant="ghost"
        size="sm"
        onClick={onAskDelete}
        className="text-muted hover:text-danger"
        aria-label="Delete poll"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function OverviewPanel({
  poll,
  analytics,
}: {
  poll: PollDTO;
  analytics: Analytics | undefined;
}) {
  return (
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
      <Card>
        <div className="px-5 pt-4 pb-3 border-b border-hairline">
          <h2 className="text-[14px] font-semibold tracking-tight">
            Questions
          </h2>
        </div>
        <CardBody className="px-5 py-5 space-y-5">
          {poll.questions.map((q, i) => (
            <div key={q.id}>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="mono text-[11px] text-subtle">Q{i + 1}</span>
                <p className="text-[14px] font-medium text-pretty">
                  {q.prompt}
                  {q.isRequired ? (
                    <span className="text-accent ml-1" aria-hidden>
                      *
                    </span>
                  ) : null}
                </p>
              </div>
              <ul className="ml-7 space-y-1.5">
                {q.options.map((o) => (
                  <li
                    key={o.id}
                    className="text-[13px] text-muted flex items-center gap-2"
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-border-strong"
                    />
                    {o.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardBody>
      </Card>

      <aside className="space-y-4">
        <Card>
          <CardBody className="px-5 py-4 space-y-3 text-[13px]">
            <Row label="Created" value={shortDate(poll.createdAt)} />
            <Row label="Last updated" value={shortDate(poll.updatedAt)} />
            <Row
              label="Expires"
              value={
                poll.expiresAt
                  ? new Date(poll.expiresAt) > new Date()
                    ? `in ${formatDuration(
                        new Date(poll.expiresAt).getTime() - Date.now(),
                      )}`
                    : "expired"
                  : "No expiry"
              }
            />
            <Row
              label="Total responses"
              value={
                analytics ? (
                  <span className="tabular font-semibold text-fg">
                    {analytics.totalResponses}
                  </span>
                ) : (
                  <span className="text-subtle">—</span>
                )
              }
            />
            {poll.responseMode === "authenticated" ? (
              <Row
                label="Unique users"
                value={
                  analytics ? (
                    <span className="tabular font-semibold text-fg">
                      {analytics.uniqueAuthRespondents}
                    </span>
                  ) : (
                    <span className="text-subtle">—</span>
                  )
                }
              />
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="px-5 py-4">
            <div className="flex items-center gap-2 text-[13px] mb-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span className="font-medium text-fg">Next step</span>
            </div>
            <p className="text-[13px] text-muted leading-relaxed">
              {nextStepFor(poll)}
            </p>
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}

function nextStepFor(poll: PollDTO): string {
  switch (poll.status) {
    case "draft":
      return "Activate this poll to start collecting responses. You can keep editing the form until you do.";
    case "active":
      return "Responses are coming in. Watch them live on the Analytics tab, or close the poll when you're ready.";
    case "closed":
      return "Responses are no longer accepted. Publish results to share aggregates publicly at the share link.";
    case "published":
      return "Results are public at the share link. Anyone visiting will see the same aggregated view.";
  }
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted text-[12.5px]">{label}</span>
      <span className="text-fg text-[13px]">{value}</span>
    </div>
  );
}

function QrTile({ value }: { value: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div
      className="rounded-[12px] p-3"
      style={{
        background: isDark ? "#dde4dd" : "#ffffff",
        border: "1px solid var(--border)",
      }}
    >
      <QRCodeSVG
        value={value}
        size={168}
        level="M"
        bgColor={isDark ? "#dde4dd" : "#ffffff"}
        fgColor={isDark ? "#003824" : "#0f172a"}
      />
    </div>
  );
}

function SharePanel({ poll }: { poll: PollDTO }) {
  const url = publicShareUrl(poll.slug);
  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
      <Card>
        <div className="px-5 pt-4 pb-3 border-b border-hairline">
          <h2 className="text-[14px] font-semibold tracking-tight">
            Public link
          </h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            Anyone with this URL can respond
            {poll.responseMode === "authenticated"
              ? " — they'll need to sign in."
              : "."}
          </p>
        </div>
        <CardBody className="space-y-3">
          <div className="rounded-[10px] bg-bg border border-border px-3.5 py-3 flex items-center gap-2.5">
            <span className="mono text-[12.5px] truncate flex-1">{url}</span>
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => {
                void copy(url).then(() => toast.success("Link copied"));
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
            <a href={url} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost" type="button">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>

          {poll.status === "draft" ? (
            <div className="rounded-[10px] bg-warning-subtle/50 border border-warning/20 px-3.5 py-2.5 flex items-start gap-2 text-[12.5px] text-warning">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                This poll is still a draft. Activate it before sharing.
              </span>
            </div>
          ) : null}

          {poll.status === "published" ? (
            <a
              href={`${url}/results`}
              target="_blank"
              rel="noreferrer"
              className="block rounded-[10px] bg-success-subtle/60 border border-success/20 px-3.5 py-2.5 text-[12.5px] text-success hover:bg-success-subtle"
            >
              Results page: <span className="mono">{`${url}/results`}</span>
            </a>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <div className="px-5 pt-4 pb-3 border-b border-hairline">
          <h2 className="text-[14px] font-semibold tracking-tight">QR code</h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            Scan to open on a phone.
          </p>
        </div>
        <CardBody className="flex flex-col items-center justify-center py-6">
          <QrTile value={url} />
          <span className="mt-3 mono text-[11.5px] text-subtle">
            {poll.slug}
          </span>
        </CardBody>
      </Card>
    </div>
  );
}

