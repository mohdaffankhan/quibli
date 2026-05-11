import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { AuthLayout, SentinelButton } from "./_AuthLayout";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Tell us what to call you.";
    if (!/.+@.+\..+/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      toast.success("Account created");
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "EMAIL_TAKEN") {
          setErrors({ email: "An account with that email already exists." });
        } else {
          setErrors({ form: err.message });
        }
      } else {
        setErrors({ form: "Something went wrong. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It only takes a minute."
      side="right"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Name" htmlFor="name" required error={errors.name}>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            aria-invalid={!!errors.name}
          />
        </Field>
        <Field label="Email" htmlFor="email" required error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          required
          error={errors.password}
          hint={errors.password ? undefined : "At least 8 characters."}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            aria-invalid={!!errors.password}
          />
        </Field>
        {errors.form ? (
          <div
            role="alert"
            className="rounded-[10px] bg-danger-subtle text-danger text-[13px] px-3.5 py-2.5 border border-danger/15"
          >
            {errors.form}
          </div>
        ) : null}
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Create account
          <ArrowRight className="h-4 w-4" />
        </Button>
        <SentinelButton />
      </form>
      <p className="mt-6 text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-fg font-medium underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
