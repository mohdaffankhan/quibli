import type {
  Analytics,
  AnalyticsTimeseries,
  AuthUser,
  CreatePollInput,
  PollDTO,
  PollSummaryDTO,
  RespondInput,
  TimeseriesGranularity,
  TimeseriesWindow,
  UpdatePollInput,
} from "./types";

// In production the frontend (Vercel) and backend (separate host) live on
// different origins, so every request is prefixed with this. In local dev it
// is empty, keeping paths same-origin so the Vite proxy can forward them.
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(
  /\/+$/,
  "",
);

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  constructor(
    message: string,
    status: number,
    code: string,
    details?: unknown,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOpts {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  /** Skip the auto refresh-on-401 retry (used by auth endpoints themselves). */
  skipRefresh?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccess(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function rawRequest<T>(
  path: string,
  opts: RequestOpts = {},
): Promise<T> {
  const init: RequestInit = {
    method: opts.method ?? "GET",
    credentials: "include",
    headers: opts.body
      ? { "Content-Type": "application/json" }
      : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  };
  if (opts.signal) init.signal = opts.signal;

  const res = await fetch(`${API_BASE}${path}`, init);

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const parsed: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // Backend's errorHandler returns a flat envelope: { error: "CODE", message, details? }.
    // Stay permissive in case anything else sneaks through.
    const data = (parsed ?? {}) as {
      error?: string | { code?: string; message?: string; details?: unknown };
      message?: string;
      details?: unknown;
    };
    const code =
      typeof data.error === "string"
        ? data.error
        : (data.error?.code ?? "UNKNOWN");
    const message =
      typeof data.error === "object" && data.error?.message
        ? data.error.message
        : (data.message ?? `Request failed (${res.status})`);
    const details =
      typeof data.error === "object" ? data.error?.details : data.details;
    throw new ApiError(message, res.status, code, details);
  }
  return parsed as T;
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, opts);
  } catch (e) {
    if (
      e instanceof ApiError &&
      e.status === 401 &&
      !opts.skipRefresh &&
      e.code !== "INVALID_CREDENTIALS" &&
      !path.startsWith("/auth/")
    ) {
      const ok = await refreshAccess();
      if (ok) return rawRequest<T>(path, opts);
    }
    throw e;
  }
}

// Backend response envelopes — handlers wrap most poll/auth responses in
// `{ poll }` / `{ user }` / `{ polls }`. Unwrap here so call-sites get plain DTOs.

export const api = {
  // ------- auth -------
  async register(input: {
    email: string;
    password: string;
    name: string;
  }): Promise<AuthUser> {
    const { user } = await request<{ user: AuthUser }>("/auth/register", {
      method: "POST",
      body: input,
      skipRefresh: true,
    });
    return user;
  },
  async login(input: {
    email: string;
    password: string;
  }): Promise<AuthUser> {
    const { user } = await request<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: input,
      skipRefresh: true,
    });
    return user;
  },
  async logout(): Promise<void> {
    await request("/auth/logout", { method: "POST", skipRefresh: true });
  },
  async me(): Promise<AuthUser> {
    const { user } = await request<{ user: AuthUser }>("/auth/me");
    return user;
  },

  // ------- polls (creator) -------
  async createPoll(input: CreatePollInput): Promise<PollDTO> {
    const { poll } = await request<{ poll: PollDTO }>("/polls", {
      method: "POST",
      body: input,
    });
    return poll;
  },
  async listMyPolls(): Promise<PollSummaryDTO[]> {
    const { polls } = await request<{ polls: PollSummaryDTO[] }>("/polls");
    return polls;
  },
  async getPoll(id: string): Promise<PollDTO> {
    const { poll } = await request<{ poll: PollDTO }>(`/polls/${id}`);
    return poll;
  },
  async updatePoll(id: string, input: UpdatePollInput): Promise<PollDTO> {
    const { poll } = await request<{ poll: PollDTO }>(`/polls/${id}`, {
      method: "PATCH",
      body: input,
    });
    return poll;
  },
  async activatePoll(id: string): Promise<PollDTO> {
    const { poll } = await request<{ poll: PollDTO }>(
      `/polls/${id}/activate`,
      { method: "POST" },
    );
    return poll;
  },
  async closePoll(id: string): Promise<PollDTO> {
    const { poll } = await request<{ poll: PollDTO }>(`/polls/${id}/close`, {
      method: "POST",
    });
    return poll;
  },
  async publishPoll(id: string): Promise<PollDTO> {
    const { poll } = await request<{ poll: PollDTO }>(
      `/polls/${id}/publish`,
      { method: "POST" },
    );
    return poll;
  },
  async deletePoll(id: string): Promise<void> {
    await request(`/polls/${id}`, { method: "DELETE" });
  },
  async analytics(id: string): Promise<Analytics> {
    return request(`/polls/${id}/analytics`);
  },
  async analyticsTimeseries(
    id: string,
    params?: { granularity?: TimeseriesGranularity; window?: TimeseriesWindow },
  ): Promise<AnalyticsTimeseries> {
    const search = new URLSearchParams();
    if (params?.granularity) search.set("granularity", params.granularity);
    if (params?.window) search.set("window", params.window);
    const qs = search.toString() ? `?${search.toString()}` : "";
    return request(`/polls/${id}/analytics/timeseries${qs}`);
  },

  // ------- public -------
  /**
   * Returns the active-poll envelope. If the poll is published, the server
   * returns a published envelope instead — caller should redirect to results.
   */
  async getPublicPoll(slug: string): Promise<{
    poll: PollDTO;
    status: "active" | "published";
    results?: Analytics;
  }> {
    return request(`/p/${slug}`);
  },
  async respond(
    slug: string,
    input: RespondInput,
  ): Promise<{ responseId: string; pollId: string }> {
    return request(`/p/${slug}/respond`, { method: "POST", body: input });
  },
  async getPublicResults(
    slug: string,
  ): Promise<{ poll: PublicPollSummary; results: Analytics }> {
    return request(`/p/${slug}/results`);
  },
};

export interface PublicPollSummary {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  responseMode: "anonymous" | "authenticated";
  status: "draft" | "active" | "closed" | "published";
  expiresAt: string | null;
}
