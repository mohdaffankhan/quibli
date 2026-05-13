import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DraftOption {
  id: string;
  label: string;
}
export interface DraftQuestion {
  id: string;
  prompt: string;
  isRequired: boolean;
  options: DraftOption[];
}

interface QuestionEditorProps {
  index: number;
  total: number;
  question: DraftQuestion;
  errors?: {
    prompt?: string;
    options?: string;
  };
  onChange: (q: DraftQuestion) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function QuestionEditor({
  index,
  total,
  question,
  errors,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: QuestionEditorProps) {
  function updateOption(i: number, label: string) {
    const next = question.options.map((o, idx) =>
      idx === i ? { ...o, label } : o,
    );
    onChange({ ...question, options: next });
  }
  function removeOption(i: number) {
    if (question.options.length <= 2) return;
    onChange({
      ...question,
      options: question.options.filter((_, idx) => idx !== i),
    });
  }
  function addOption() {
    if (question.options.length >= 10) return;
    onChange({
      ...question,
      options: [...question.options, { id: crypto.randomUUID(), label: "" }],
    });
  }

  return (
    <div className="relative rounded-[14px] bg-surface card-hairline hover:emerald-glow transition-shadow">
      <div className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-hairline">
        <span
          aria-hidden
          className="h-8 w-8 rounded-[10px] bg-accent text-on-accent grid place-items-center font-semibold text-[13px] shrink-0"
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-[13px] font-medium tracking-tight text-fg">
          Question {index + 1}
        </span>
        <button
          type="button"
          aria-label="Drag to reorder"
          className="text-subtle hover:text-fg transition-colors cursor-grab active:cursor-grabbing ml-1"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            aria-label="Move question up"
            className="h-8 w-8 px-0"
          >
            ↑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            disabled={index === total - 1}
            onClick={onMoveDown}
            aria-label="Move question down"
            className="h-8 w-8 px-0"
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            aria-label="Remove question"
            className="h-8 w-8 px-0 text-muted hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <Field
          label="Prompt"
          htmlFor={`q-${question.id}-prompt`}
          error={errors?.prompt}
          required
        >
          <Textarea
            id={`q-${question.id}-prompt`}
            value={question.prompt}
            onChange={(e) => onChange({ ...question, prompt: e.target.value })}
            placeholder="What's your favorite framework?"
            rows={2}
            aria-invalid={!!errors?.prompt}
          />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-fg">Options</span>
            <span className="text-[11.5px] text-subtle">
              {question.options.length} / 10
            </span>
          </div>
          <ul className="space-y-2">
            {question.options.map((opt, i) => (
              <li
                key={opt.id}
                className="flex items-center gap-2 anim-in"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <span className="mono text-[11px] text-subtle w-5 text-center select-none">
                  {String.fromCharCode(65 + i)}
                </span>
                <Input
                  value={opt.label}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={question.options.length <= 2}
                  aria-label={`Remove option ${i + 1}`}
                  className={cn(
                    "h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-[8px] text-muted",
                    "hover:bg-hairline hover:text-danger transition-colors",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          {errors?.options ? (
            <p
              role="alert"
              className="text-[12.5px] text-danger mt-2 flex items-center gap-1.5"
            >
              <span className="inline-block h-1 w-1 rounded-full bg-danger" />
              {errors.options}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addOption}
            disabled={question.options.length >= 10}
            className="mt-2 -ml-1 text-muted"
          >
            <Plus className="h-3.5 w-3.5" />
            Add option
          </Button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-hairline">
          <label
            htmlFor={`q-${question.id}-required`}
            className="text-[13px] font-medium text-fg flex flex-col"
          >
            Required
            <span className="text-[11.5px] font-normal text-muted">
              Respondents must answer this question.
            </span>
          </label>
          <Switch
            id={`q-${question.id}-required`}
            checked={question.isRequired}
            onCheckedChange={(v) => onChange({ ...question, isRequired: v })}
          />
        </div>
      </div>
    </div>
  );
}
