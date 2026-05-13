import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="min-h-dvh grid place-items-center bg-bg relative">
      <div
        aria-hidden
        className="absolute inset-0 bg-dot opacity-50 pointer-events-none"
      />
      <div className="relative text-center max-w-md px-6">
        <p className="mono text-[12px] tracking-wide text-subtle uppercase">
          Error · 404
        </p>
        <h1 className="mt-2 text-[42px] font-semibold tracking-tight leading-none text-balance">
          Not found
        </h1>
        <p className="mt-3 text-[14px] text-muted text-pretty">
          The page or poll you're looking for doesn't exist, or it may have
          been deleted.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/dashboard">
            <Button>Back to dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
