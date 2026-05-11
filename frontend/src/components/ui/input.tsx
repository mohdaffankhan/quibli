import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const baseClasses =
  "block w-full rounded-[10px] bg-surface text-fg placeholder:text-subtle border border-border " +
  "px-3.5 py-2.5 text-[14px] " +
  "transition-[border-color,box-shadow] duration-150 " +
  "outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/25";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return (
    <input ref={ref} className={cn(baseClasses, "h-10", className)} {...rest} />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(baseClasses, "resize-y min-h-[80px]", className)}
      {...rest}
    />
  );
});

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[13px] font-medium text-fg flex items-center gap-1"
      >
        {label}
        {required ? (
          <span aria-hidden className="text-accent">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="text-[12.5px] text-danger flex items-center gap-1.5"
        >
          <span
            aria-hidden
            className="inline-block h-1 w-1 rounded-full bg-danger"
          />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
