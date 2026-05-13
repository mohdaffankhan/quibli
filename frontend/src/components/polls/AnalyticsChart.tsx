import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AnalyticsOption, AnalyticsQuestion } from "@/lib/types";

export function QuestionAnalyticsCard({
  question,
}: {
  question: AnalyticsQuestion;
}) {
  const sorted = [...question.options].sort((a, b) => b.count - a.count);
  const winnerId = sorted[0]?.optionId;
  const max = Math.max(1, ...sorted.map((o) => o.count));

  return (
    <div className="rounded-[14px] bg-surface card-hairline">
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-hairline">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold tracking-tight text-fg text-pretty">
            {question.prompt}
          </h3>
          {question.isRequired ? (
            <span className="mt-1 inline-block text-[11px] text-muted">
              Required
            </span>
          ) : null}
        </div>
        <Badge tone="muted">
          {question.totalAnswers}{" "}
          {question.totalAnswers === 1 ? "answer" : "answers"}
        </Badge>
      </div>

      <div className="px-5 py-4 space-y-3">
        {question.options.length === 0 ? (
          <p className="text-[13px] text-muted">No options.</p>
        ) : (
          question.options.map((opt) => (
            <BarRow
              key={opt.optionId}
              option={opt}
              max={max}
              isWinner={opt.optionId === winnerId && opt.count > 0}
            />
          ))
        )}
      </div>

      {/* Accessible tabular fallback */}
      <details className="px-5 pb-4 mt-1">
        <summary className="text-[11.5px] tracking-wide text-subtle uppercase cursor-pointer select-none hover:text-fg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-md inline-block">
          View as table
        </summary>
        <table className="mt-3 w-full text-[13px] tabular border-t border-hairline">
          <thead>
            <tr className="text-[11.5px] tracking-wide text-subtle uppercase">
              <th scope="col" className="text-left py-2 font-medium">
                Option
              </th>
              <th scope="col" className="text-right py-2 font-medium">
                Count
              </th>
              <th scope="col" className="text-right py-2 font-medium">
                %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {question.options.map((o) => (
              <tr key={o.optionId}>
                <td className="py-2 pr-3 text-fg">{o.label}</td>
                <td className="py-2 text-right text-muted">{o.count}</td>
                <td className="py-2 text-right text-muted">{o.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function BarRow({
  option,
  max,
  isWinner,
}: {
  option: AnalyticsOption;
  max: number;
  isWinner: boolean;
}) {
  const widthPct = Math.max(2, (option.count / max) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-[13px] text-fg truncate">{option.label}</span>
        <div className="tabular text-[12.5px] text-muted flex items-baseline gap-2 shrink-0">
          <span
            className={cn(
              "text-[14px] font-semibold",
              isWinner ? "text-accent-active" : "text-fg",
            )}
          >
            {option.count}
          </span>
          <span className="text-[11.5px]">{option.pct}%</span>
        </div>
      </div>
      <div
        role="img"
        aria-label={`${option.label}: ${option.count} (${option.pct}%)`}
        className="relative h-2 rounded-full bg-hairline overflow-hidden"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{
            duration: 0.4,
            ease: [0.2, 0, 0, 1],
          }}
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            isWinner
              ? "bg-accent"
              : "bg-[color:color-mix(in_oklab,var(--color-fg)_28%,var(--color-bg))]",
          )}
        />
      </div>
    </div>
  );
}
