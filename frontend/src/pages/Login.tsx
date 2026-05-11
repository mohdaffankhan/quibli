import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { AuthLayout, SentinelButton } from "./_AuthLayout";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const notifiedRef = useRef(false);

  // Surface a failed Sentinel round-trip (e.g. the handshake timed out while
  // the user was signing up on Sentinel) instead of silently dropping them here.
  useEffect(() => {
    if (searchParams.get("error") !== "sentinel_failed" || notifiedRef.current)
      return;
    notifiedRef.current = true;
    const msg =
      "Sentinel sign-in didn't complete. Please start again from Quibli.";
    setError(msg);
    toast.error(msg);
    searchParams.delete("error");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.code === "INVALID_CREDENTIALS"
            ? "Incorrect email or password."
            : err.message,
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return <AuthLayout title="Sign in" subtitle="Welcome back to Quibli." side="left">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" htmlFor="password" required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </Field>
        {error ? (
          <div
            role="alert"
            className="rounded-[10px] bg-danger-subtle text-danger text-[13px] px-3.5 py-2.5 border border-danger/15"
          >
            {error}
          </div>
        ) : null}
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Button>
        <SentinelButton />
      </form>
      <p className="mt-6 text-center text-[13px] text-muted">
        Don't have an account?{" "}
        <Link to="/register" className="text-fg font-medium underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>;
}
