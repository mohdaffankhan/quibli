import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit3,
  Eye,
  Globe,
  Info,
  Lightbulb,
  Lock,
  Plus,
  Save,
  Send,
  Settings,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Segmented, Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import {
  QuestionEditor,
  type DraftQuestion,
} from "@/components/polls/QuestionEditor";
import { copy, publicShareUrl } from "@/lib/utils";
import type { CreatePollInput, PollDTO, ResponseMode } from "@/lib/types";

interface DraftPoll {
  title: string;
  description: string;
  responseMode: ResponseMode;
  expiresAt: string | null;
  questions: DraftQuestion[];
}

interface EditorErrors {
  title?: string;
  questions?: Record<number, { prompt?: string; options?: string }>;
  form?: string;
}

const expiryPresets: { label: string; ms: number | null }[] = [
  { label: "1 hour", ms: 1000 * 60 * 60 },
  { label: "24 hours", ms: 1000 * 60 * 60 * 24 },
  { label: "7 days", ms: 1000 * 60 * 60 * 24 * 7 },
  { label: "No expiry", ms: null },
];

function emptyQuestion(): DraftQuestion {
  return {
    id: crypto.randomUUID(),
    prompt: "",
    isRequired: true,
    options: [
      { id: crypto.randomUUID(), label: "" },
      { id: crypto.randomUUID(), label: "" },
    ],
  };
}

function fromPoll(p: PollDTO): DraftPoll {
  return {
    title: p.title,
    description: p.description ?? "",
    responseMode: p.responseMode,
    expiresAt: p.expiresAt,
    questions: p.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      isRequired: q.isRequired,
      options: q.options.map((o) => ({ id: o.id, label: o.label })),
    })),
  };
}

function toApiInput(draft: DraftPoll): CreatePollInput {
  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    responseMode: draft.responseMode,
    expiresAt: draft.expiresAt,
    questions: draft.questions.map((q) => ({
      prompt: q.prompt.trim(),
      isRequired: q.isRequired,
      options: q.options
        .filter((o) => o.label.trim().length > 0)
        .map((o) => ({ label: o.label.trim() })),
    })),
  };
}

function validateDraft(d: DraftPoll): EditorErrors {
  const errors: EditorErrors = {};
  if (!d.title.trim()) errors.title = "Give your poll a title.";
  const qErrors: Record<number, { prompt?: string; options?: string }> = {};
  d.questions.forEach((q, i) => {
    const e: { prompt?: string; options?: string } = {};
    if (!q.prompt.trim()) e.prompt = "Write the question prompt.";
    const validOptions = q.options.filter((o) => o.label.trim());
    if (validOptions.length < 2) e.options = "Add at least two non-empty options.";
    if (e.prompt || e.options) qErrors[i] = e;
  });
  if (Object.keys(qErrors).length > 0) errors.questions = qErrors;
  return errors;
}

interface PollEditorProps {
  mode: "new" | "edit";
}

export function PollEditor({ mode }: PollEditorProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = mode === "edit" && !!id;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["poll", id],
    queryFn: () => api.getPoll(id!),
    enabled: isEdit,
  });

  const [draft, setDraft] = useState<DraftPoll>({
    title: "",
    description: "",
    responseMode: "anonymous",
    expiresAt: null,
    questions: [emptyQuestion()],
  });
  const [errors, setErrors] = useState<EditorErrors>({});
  const [activatedPoll, setActivatedPoll] = useState<PollDTO | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (existing) setDraft(fromPoll(existing));
  }, [existing]);

  const liveErrors = useMemo(() => errors, [errors]);

  function setQ(i: number, q: DraftQuestion) {
    setDraft((d) => {
      const next = [...d.questions];
      next[i] = q;
      return { ...d, questions: next };
    });
  }
  function moveQuestion(from: number, to: number) {
    setDraft((d) => {
      if (to < 0 || to >= d.questions.length) return d;
      const next = [...d.questions];
      const [removed] = next.splice(from, 1);
      if (removed) next.splice(to, 0, removed);
      return { ...d, questions: next };
    });
  }

  const saveMutation = useMutation({
    mutationFn: async ({ activate }: { activate: boolean }) => {
      const valid = validateDraft(draft);
      setErrors(valid);
      if (Object.keys(valid).length > 0) {
        throw new Error("Please fix the highlighted issues.");
      }
      const input = toApiInput(draft);
      let saved: PollDTO;
      if (isEdit) {
        saved = await api.updatePoll(id!, input);
      } else {
        saved = await api.createPoll(input);
      }
      if (activate) {
        saved = await api.activatePoll(saved.id);
      }
      return saved;
    },
    onSuccess: (saved, vars) => {
      qc.invalidateQueries({ queryKey: ["polls"] });
      qc.invalidateQueries({ queryKey: ["poll", saved.id] });
      if (vars.activate) {
        setActivatedPoll(saved);
      } else {
        toast.success(isEdit ? "Changes saved" : "Draft saved");
        navigate(`/polls/${saved.id}`);
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrors((e) => ({ ...e, form: err.message }));
      } else if (err instanceof Error) {
        setErrors((e) => ({ ...e, form: err.message }));
      }
    },
  });

  if (isEdit && isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="h-10 w-48 bg-hairline rounded-md" />
      </div>
    );
  }

  const isLocked = !!existing && existing.status !== "draft";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex items-center gap-3 text-[13px] text-muted mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 hover:text-fg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-md"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <span className="text-subtle">/</span>
        <span>{isEdit ? "Edit poll" : "New poll"}</span>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="ml-auto xl:hidden inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:underline"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
      </div>

      <header className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight leading-none">
          {isEdit ? "Edit poll" : "Create a new poll"}
        </h1>
        <p className="mt-2 text-[13.5px] text-muted">
          Compose your question, configure visibility, and launch when you're
          ready.
        </p>
      </header>

      {isLocked ? (
        <div className="mb-5 rounded-[12px] border border-warning/40 bg-warning-subtle/40 px-4 py-3 text-[13px] text-warning">
          This poll is no longer in draft, so most fields are read-only. Close
          it to stop accepting responses, or duplicate it to start over.
        </div>
      ) : null}

      <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          <Section
            title="Poll details"
            subtitle="Title, description, and what people will see first."
            icon={<Edit3 className="h-4 w-4" />}
          >
            <Field
              label="Title"
              htmlFor="title"
              required
              error={liveErrors.title}
            >
              <Input
                id="title"
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="Which framework should we use?"
                disabled={isLocked}
                aria-invalid={!!liveErrors.title}
              />
            </Field>
            <div className="mt-4">
              <Field
                label="Description"
                htmlFor="description"
                hint="Optional. A sentence of context for respondents."
              >
                <Textarea
                  id="description"
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                  placeholder="We're choosing tooling for the next quarter…"
                  disabled={isLocked}
                  rows={4}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Poll questions"
            subtitle="Each question accepts a single answer."
            icon={<Edit3 className="h-4 w-4" />}
            right={
              <Badge tone="accent">
                {draft.questions.length}{" "}
                {draft.questions.length === 1 ? "question" : "questions"}
              </Badge>
            }
          >
            <div className="space-y-3">
              {draft.questions.map((q, i) => (
                <QuestionEditor
                  key={q.id}
                  index={i}
                  total={draft.questions.length}
                  question={q}
                  errors={liveErrors.questions?.[i]}
                  onChange={(next) => setQ(i, next)}
                  onRemove={() =>
                    setDraft((d) => ({
                      ...d,
                      questions:
                        d.questions.length > 1
                          ? d.questions.filter((_, idx) => idx !== i)
                          : d.questions,
                    }))
                  }
                  onMoveUp={() => moveQuestion(i, i - 1)}
                  onMoveDown={() => moveQuestion(i, i + 1)}
                />
              ))}

              <button
                type="button"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    questions: [...d.questions, emptyQuestion()],
                  }))
                }
                disabled={draft.questions.length >= 50 || isLocked}
                className="w-full py-5 rounded-[14px] border-2 border-dashed border-border-strong text-muted hover:text-accent hover:border-accent hover:bg-accent-subtle/30 transition-all flex items-center justify-center gap-2 text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                Add another question
              </button>
            </div>
          </Section>
        </div>

        <aside className="xl:sticky xl:top-20 space-y-5">
          <ConfigurationCard
            draft={draft}
            setDraft={setDraft}
            isLocked={isLocked}
            isEdit={isEdit}
            pendingAction={
              saveMutation.isPending
                ? saveMutation.variables?.activate
                  ? "activate"
                  : "draft"
                : null
            }
            onSaveDraft={() => saveMutation.mutate({ activate: false })}
            onActivate={() => saveMutation.mutate({ activate: true })}
            formError={liveErrors.form}
            onCancel={() => navigate(-1)}
          />

          <div className="rounded-[14px] border border-accent/20 bg-accent-subtle/40 p-4">
            <div className="flex items-center gap-2 text-accent">
              <Lightbulb className="h-4 w-4" />
              <span className="text-[11px] uppercase tracking-wider font-semibold">
                Pro tip
              </span>
            </div>
            <p className="mt-2 text-[13px] text-fg leading-snug">
              Activate when you're ready to share. You can close and publish
              results from the poll page after you collect responses.
            </p>
          </div>
        </aside>
      </div>

      <Dialog
        open={showPreview}
        onOpenChange={setShowPreview}
        title="Preview"
        description="How respondents will see your poll."
      >
        <PreviewBody draft={draft} />
      </Dialog>

      <Dialog
        open={!!activatedPoll}
        onOpenChange={(v) => {
          if (!v) {
            const target = activatedPoll;
            setActivatedPoll(null);
            if (target) navigate(`/polls/${target.id}`);
          }
        }}
        title="Poll is live"
        description="Share this link with respondents. You can manage and publish results from the poll page."
      >
        {activatedPoll ? (
          <ShareReadout slug={activatedPoll.slug} pollId={activatedPoll.id} />
        ) : null}
      </Dialog>
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] bg-surface card-hairline emerald-glow">
      <div className="px-5 pt-4 pb-3 border-b border-hairline flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon ? (
            <span className="h-8 w-8 rounded-[10px] bg-accent-subtle text-accent grid place-items-center shrink-0">
              {icon}
            </span>
          ) : null}
          <div>
            <h2 className="text-[14.5px] font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle ? (
              <p className="text-[12.5px] text-muted mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {right}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function ConfigurationCard({
  draft,
  setDraft,
  isLocked,
  isEdit,
  pendingAction,
  onSaveDraft,
  onActivate,
  formError,
  onCancel,
}: {
  draft: DraftPoll;
  setDraft: React.Dispatch<React.SetStateAction<DraftPoll>>;
  isLocked: boolean;
  isEdit: boolean;
  pendingAction: "activate" | "draft" | null;
  onSaveDraft: () => void;
  onActivate: () => void;
  formError?: string;
  onCancel: () => void;
}) {
  const busy = pendingAction !== null;
  return (
    <div className="rounded-[16px] bg-surface card-hairline">
      <div className="px-5 pt-4 pb-3 border-b border-hairline flex items-center gap-3">
        <span className="h-8 w-8 rounded-[10px] bg-accent-subtle text-accent grid place-items-center">
          <Settings className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-[14.5px] font-semibold tracking-tight">
            Configuration
          </h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            Visibility and launch controls.
          </p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        <Field label="Participation mode" htmlFor="mode">
          <Segmented<ResponseMode>
            value={draft.responseMode}
            onChange={(v) => setDraft((d) => ({ ...d, responseMode: v }))}
            options={[
              {
                value: "anonymous",
                label: "Anonymous",
                icon: <Globe className="h-3.5 w-3.5" />,
              },
              {
                value: "authenticated",
                label: "Signed in",
                icon: <Lock className="h-3.5 w-3.5" />,
              },
            ]}
          />
        </Field>

        <Field label="Expires" htmlFor="expiry">
          <ExpiryControl
            value={draft.expiresAt}
            onChange={(v) => setDraft((d) => ({ ...d, expiresAt: v }))}
            disabled={isLocked}
          />
        </Field>

        <div className="space-y-3 pt-1">
          <ConfigSwitch
            label="Allow multiple votes"
            description="Coming soon. Default is one vote per respondent."
            disabled
          />
          <ConfigSwitch
            label="Show live results"
            description="Coming soon. Today, results are visible after publishing."
            disabled
          />
          <ConfigSwitch
            label="Shuffle options"
            description="Coming soon. Today, options follow the order you set."
            disabled
          />
        </div>

        {formError ? (
          <p
            role="alert"
            className="text-[12.5px] text-danger flex items-center gap-1.5"
          >
            <span className="inline-block h-1 w-1 rounded-full bg-danger" />
            {formError}
          </p>
        ) : null}

        <div className="pt-2 space-y-2">
          <Button
            type="button"
            onClick={onActivate}
            loading={pendingAction === "activate"}
            disabled={busy}
            className="w-full justify-center emerald-shadow"
          >
            <Send className="h-3.5 w-3.5" />
            {isEdit ? "Activate poll" : "Publish & activate"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onSaveDraft}
            loading={pendingAction === "draft"}
            disabled={busy}
            className="w-full justify-center"
          >
            <Save className="h-3.5 w-3.5" />
            {isEdit ? "Save changes" : "Save as draft"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            className="w-full justify-center"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfigSwitch({
  label,
  description,
  disabled,
}: {
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-fg flex items-center gap-1.5">
          {label}
          {disabled ? (
            <Info
              aria-label="Coming soon"
              className="h-3.5 w-3.5 text-subtle"
            />
          ) : null}
        </div>
        <div className="text-[11.5px] text-muted">{description}</div>
      </div>
      <Switch checked={false} onCheckedChange={() => undefined} disabled />
    </div>
  );
}

interface ExpiryControlProps {
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function ExpiryControl({ value, onChange, disabled }: ExpiryControlProps) {
  const localValue = value ? toLocalInput(value) : "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {expiryPresets.map((p) => {
          const isSelected = computeIsSelected(value, p.ms);
          return (
            <button
              type="button"
              key={p.label}
              disabled={disabled}
              onClick={() => {
                if (p.ms === null) onChange(null);
                else onChange(new Date(Date.now() + p.ms).toISOString());
              }}
              className={`h-8 px-2.5 rounded-[8px] text-[12px] font-medium border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                isSelected
                  ? "bg-accent text-on-accent border-accent"
                  : "bg-surface text-muted border-border hover:text-fg hover:bg-hairline"
              } disabled:opacity-50`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <Input
        type="datetime-local"
        disabled={disabled}
        value={localValue}
        onChange={(e) => {
          if (!e.target.value) onChange(null);
          else onChange(new Date(e.target.value).toISOString());
        }}
      />
    </div>
  );
}

function computeIsSelected(
  value: string | null,
  ms: number | null,
): boolean {
  if (ms === null) return value === null;
  if (!value) return false;
  const diff = new Date(value).getTime() - Date.now();
  return Math.abs(diff - ms) < 1000 * 60 * 2;
}

function PreviewBody({ draft }: { draft: DraftPoll }) {
  const validQuestions = draft.questions.filter((q) => q.prompt.trim());
  return (
    <div className="max-h-[70vh] overflow-y-auto scrollbar-hide">
      <h3 className="text-[18px] font-semibold tracking-tight text-balance">
        {draft.title || "Untitled poll"}
      </h3>
      {draft.description ? (
        <p className="mt-1 text-[13px] text-muted text-pretty">
          {draft.description}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-2">
        <Badge tone="neutral">
          {draft.responseMode === "anonymous"
            ? "Anonymous"
            : "Sign-in required"}
        </Badge>
        {draft.expiresAt ? (
          <Badge tone="muted">
            Expires {new Date(draft.expiresAt).toLocaleDateString()}
          </Badge>
        ) : null}
      </div>

      <div className="mt-5 space-y-4">
        {validQuestions.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-border p-5 text-center text-[12.5px] text-subtle">
            Your questions will appear here as you type.
          </div>
        ) : (
          validQuestions.map((q, i) => (
            <div key={q.id} className="anim-in">
              <div className="flex items-baseline gap-2">
                <span className="mono text-[11px] text-subtle">Q{i + 1}</span>
                <p className="text-[14px] font-medium leading-snug">
                  {q.prompt}
                  {q.isRequired ? (
                    <span aria-hidden className="text-accent ml-1">
                      *
                    </span>
                  ) : null}
                </p>
              </div>
              <ul className="mt-2 space-y-1.5">
                {q.options
                  .filter((o) => o.label.trim())
                  .map((o) => (
                    <li
                      key={o.id}
                      className="text-[13px] flex items-center gap-2.5 rounded-[8px] border border-border px-3 py-2 bg-bg/40"
                    >
                      <span
                        aria-hidden
                        className="h-3.5 w-3.5 rounded-full border-[1.5px] border-border-strong"
                      />
                      <span className="truncate">{o.label}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ShareReadout({ slug, pollId }: { slug: string; pollId: string }) {
  const url = publicShareUrl(slug);
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="rounded-[10px] bg-bg border border-border px-3.5 py-3 flex items-center gap-2.5">
        <Globe className="h-4 w-4 text-muted shrink-0" />
        <span className="mono text-[12.5px] truncate flex-1">{url}</span>
        <Button
          size="sm"
          variant="secondary"
          type="button"
          onClick={() => {
            void copy(url).then(() => toast.success("Link copied"));
          }}
        >
          Copy
        </Button>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => navigate(`/polls/${pollId}`)}
        >
          Go to poll
        </Button>
        <a href={url} target="_blank" rel="noreferrer">
          <Button size="sm" type="button">
            Open public page
          </Button>
        </a>
      </div>
    </div>
  );
}
