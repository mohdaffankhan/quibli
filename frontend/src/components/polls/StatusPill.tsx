import { Badge } from "@/components/ui/badge";

type Status = "draft" | "active" | "closed" | "published";

const map: Record<
  Status,
  {
    label: string;
    tone: "neutral" | "accent" | "success" | "warning" | "danger" | "muted";
    dot?: boolean;
  }
> = {
  draft: { label: "Draft", tone: "muted" },
  active: { label: "Active", tone: "accent", dot: true },
  closed: { label: "Closed", tone: "warning" },
  published: { label: "Published", tone: "success" },
};

export function StatusPill({ status }: { status: Status }) {
  const cfg = map[status];
  return (
    <Badge tone={cfg.tone} dot={cfg.dot}>
      {cfg.label}
    </Badge>
  );
}

export function ResponseModePill({
  mode,
}: {
  mode: "anonymous" | "authenticated";
}) {
  return (
    <Badge tone="neutral">
      {mode === "anonymous" ? "Anonymous" : "Authenticated"}
    </Badge>
  );
}
