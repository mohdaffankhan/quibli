import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import { destroySocket } from "./socket";
import type { AuthUser } from "./types";

interface AuthState {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  const refresh = useCallback(async () => {
    try {
      const next = await api.me();
      setUser(next);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
      } else {
        // non-auth failure; leave user as-is
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      // Wipe any cached queries from a prior session before adopting the new
      // identity, so a previous user's polls/analytics never bleed through.
      qc.clear();
      const next = await api.login({ email, password });
      setUser(next);
    },
    [qc],
  );

  const register = useCallback(
    async (input: { email: string; password: string; name: string }) => {
      qc.clear();
      const next = await api.register(input);
      setUser(next);
    },
    [qc],
  );

  const logout = useCallback(async () => {
    // Always tear down local state, even if the server call fails (network
    // off, session already revoked, refresh-cookie missing, etc.). The
    // browser already drops the cookies via Set-Cookie Max-Age=0, and the
    // user's expectation is that hitting "Sign out" signs them out.
    try {
      await api.logout();
    } catch {
      // intentionally swallowed — see comment above
    }
    setUser(null);
    qc.clear();
    destroySocket();
  }, [qc]);

  const value = useMemo(
    () => ({ user, ready, login, register, logout, refresh }),
    [user, ready, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
