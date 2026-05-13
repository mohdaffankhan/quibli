import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Moon, Plus, Sun, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/shell/Brand";

function Wordmark() {
  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-2 group"
      aria-label="Quibli home"
    >
      <Brand />
    </Link>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "relative h-9 px-3 inline-flex items-center text-[13.5px] font-medium rounded-[8px] transition-colors",
    "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
    isActive ? "text-fg" : "text-muted hover:text-fg",
  );
}

function NavBar() {
  return (
    <nav className="hidden sm:flex items-center gap-1">
      <NavLink to="/dashboard" className={navLinkClass}>
        Dashboard
      </NavLink>
      <NavLink to="/polls/new" className={navLinkClass}>
        Create
      </NavLink>
    </nav>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted hover:text-fg hover:bg-hairline transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className,
      )}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-6">
        <Wordmark />
        <div className="h-5 w-px bg-border hidden sm:block" />
        <NavBar />

        <div className="ml-auto flex items-center gap-2">
          <Link to="/polls/new" className="hidden sm:inline-flex">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New poll
            </Button>
          </Link>

          <ThemeToggle />

          {user ? (
            <Dropdown
              trigger={
                <div className="flex items-center gap-2 rounded-[10px] hover:bg-hairline transition-colors h-9 pl-1.5 pr-2.5">
                  <Avatar name={user.name} url={user.avatarUrl} />
                  <span className="text-[13px] font-medium text-fg hidden md:inline">
                    {user.name}
                  </span>
                </div>
              }
            >
              <div className="px-2.5 py-2 text-[12px] text-muted">
                <div className="font-medium text-fg text-[13px]">
                  {user.name}
                </div>
                <div className="truncate">{user.email}</div>
              </div>
              <DropdownSeparator />
              <DropdownItem
                icon={<UserIcon className="h-4 w-4" />}
                onSelect={() => navigate("/dashboard")}
              >
                Dashboard
              </DropdownItem>
              <DropdownItem
                icon={<LogOut className="h-4 w-4" />}
                destructive
                onSelect={() => {
                  // Fire-and-forget: useAuth.logout is idempotent and the
                  // ProtectedShell will redirect to /login the moment user
                  // becomes null. We still navigate explicitly to make sure
                  // browser Back doesn't return to a stale protected page.
                  void logout().finally(() => {
                    navigate("/login", { replace: true });
                  });
                }}
              >
                Sign out
              </DropdownItem>
            </Dropdown>
          ) : (
            <Link to="/login">
              <Button size="sm" variant="secondary">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Avatar({
  name,
  url,
  size = 28,
}: {
  name: string;
  url: string | null;
  size?: number;
}) {
  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  // Reset the error state if the URL changes (e.g. after re-login).
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);

  const fallback = (
    <span
      className="inline-flex items-center justify-center rounded-full bg-accent text-on-accent text-[11px] font-semibold select-none"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials}
    </span>
  );

  if (!url || broken) return fallback;

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      onError={() => setBroken(true)}
      className="rounded-full border border-border bg-hairline object-cover"
      style={{ width: size, height: size }}
    />
  );
}
