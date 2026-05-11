import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { PublicShell } from "@/components/public/PublicShell";
import { useAuth } from "@/lib/auth-context";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import { Landing } from "@/pages/Landing";
import { PollAnalytics } from "@/pages/PollAnalytics";
import { PollEditor } from "@/pages/PollEditor";
import { PollDetail } from "@/pages/PollDetail";
import { PublicRespond } from "@/pages/PublicRespond";
import { PublicResults } from "@/pages/PublicResults";
import { NotFound } from "@/pages/NotFound";

function ProtectedShell() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-dvh grid place-items-center bg-bg">
        <div className="h-2 w-32 rounded-full bg-hairline overflow-hidden">
          <div className="h-full w-1/3 bg-accent animate-[shimmer_1s_infinite]" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function AuthShell() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function PublicWrapper() {
  return (
    <PublicShell>
      <Outlet />
    </PublicShell>
  );
}

function LandingRoute() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingRoute />,
  },
  {
    element: <AuthShell />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
    ],
  },
  {
    element: <ProtectedShell />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/polls/new", element: <PollEditor mode="new" /> },
      { path: "/polls/:id/edit", element: <PollEditor mode="edit" /> },
      { path: "/polls/:id", element: <PollDetail /> },
      { path: "/polls/:id/analytics", element: <PollAnalytics /> },
    ],
  },
  {
    element: <PublicWrapper />,
    children: [
      { path: "/p/:slug", element: <PublicRespond /> },
      { path: "/p/:slug/results", element: <PublicResults /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
