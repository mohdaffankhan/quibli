# Quibli

A full-stack platform where logged-in creators build single-choice polls, share
them through a public link with an expiry, collect anonymous or authenticated
responses, and publish the final results back to the same link — with live
response counts and analytics streamed over WebSockets.

> Both the backend and frontend live in this **single repository** (`backend/`
> and `frontend/`), as required for submission.

## Features

Mapped to the project requirements:

- **Single-option questions.** A poll has one or more questions; each respondent
  picks exactly one option per question. Multi-select is intentionally out of
  scope for this hackathon.
- **Mandatory / optional questions.** `isRequired` per question, validated on
  **both** the frontend form and the backend (`required` questions cannot be
  skipped server-side).
- **Anonymous and authenticated modes.** `responseMode` is `anonymous` or
  `authenticated` per poll. Authenticated polls require a signed-in respondent
  and enforce one response per user.
- **Per-link expiry.** Every poll link supports an expiry time. Expiry is
  enforced server-side on every read and write — once expired the poll is
  inactive and no further responses are accepted.
- **Poll lifecycle.** `draft → active → closed → published`.
- **Analytics dashboard.** Creators see total responses, question-wise
  summaries, per-option counts and percentages, a response-velocity timeseries,
  and participation insights. CSV export included.
- **Publish results.** Once a poll is `published`, anyone visiting the same
  public link can view the final outcome and response summaries at
  `/p/:slug/results`.
- **Realtime (Socket.io).** Live response counts, analytics updates and poll
  status changes are pushed over Socket.io. Rooms: `poll:<id>` (public totals +
  status) and `poll-admin:<id>` (creator-only deltas), authenticated via the
  handshake cookie.
- **Authentication.** Email/password (bcrypt) plus **Sentinel OIDC**
  (Authorization Code + PKCE). JWT access tokens with DB-backed rotating refresh
  tokens, delivered as HTTP-only cookies. Protected routes on the API and SPA.

## Tech stack

- **Backend:** Express 5 + TypeScript (strict, NodeNext), Drizzle ORM,
  PostgreSQL (Supabase), Socket.io, Zod validation.
- **Frontend:** Vite + React 19 + TypeScript, Tailwind CSS v4, React Router 7,
  TanStack Query 5, framer-motion, sonner. Locally-implemented shadcn-style UI
  primitives; custom bar charts (no charting dependency).

> **Note on the MERN requirement.** The brief asks for the MERN stack. This
> project deliberately uses **PostgreSQL + Drizzle ORM** instead of MongoDB:
> polls, questions, options and responses are inherently relational and the
> analytics aggregation is far cleaner and more correct with SQL `GROUP BY`
> and transactions. Everything else (Express, React, Node) matches. This
> trade-off is intentional and documented here.

## Project structure

```
backend/
  src/
    modules/{auth,polls}/        # feature slices
    shared/{auth,config,db,errors,middleware,realtime,types,utils}/
  supabase/migrations/           # Drizzle-generated SQL migrations
  tests/                         # vitest integration suite
frontend/
  src/
    components/{ui,polls,public,shell,feedback}/
    pages/                       # Landing, Login, Register, Dashboard,
                                 # PollEditor, PollDetail, PollAnalytics,
                                 # PublicRespond, PublicResults
    hooks/usePollLive.ts         # joins poll/poll-admin rooms -> query cache
    lib/{api,auth-context,theme-context,socket,types,utils}
```

## Getting started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10
- A PostgreSQL database (a Supabase project works out of the box)

### 1. Backend

```bash
cd backend
cp .env.example .env      # then fill in the values below
pnpm install
pnpm drizzle-kit migrate  # apply migrations to your database
pnpm dev                  # http://localhost:8080
```

Required environment variables (see `backend/.env.example`):

| Variable        | Purpose                                             |
| --------------- | --------------------------------------------------- |
| `DATABASE_URL`  | PostgreSQL connection string                        |
| `JWT_SECRET`    | Signing secret for access tokens                    |
| `COOKIE_SECRET` | Secret for signing auth/OIDC-state cookies          |
| `SENTINEL_*`    | Sentinel OIDC issuer, client id/secret, redirect URI|
| `CORS_ORIGIN`   | Allowed frontend origin(s)                          |
| `IP_HASH_SALT`  | Salt for hashing respondent IPs                     |

### 2. Frontend

```bash
cd frontend
pnpm install
pnpm dev                  # http://localhost:5173
```

The Vite dev server proxies `/auth`, `/polls`, `/p` and `/socket.io` to the
backend on port 8080, so no extra configuration is needed for local dev.

### Scripts

Backend: `pnpm dev` · `pnpm build` · `pnpm test` (vitest integration suite) ·
`pnpm drizzle-kit generate|migrate`
Frontend: `pnpm dev` · `pnpm build` · `pnpm preview`

## Architecture notes

- The backend is organised as feature slices (`modules/auth`, `modules/polls`)
  over shared infrastructure. Auth issues short-lived JWT access tokens and
  long-lived rotating refresh tokens stored hashed in the DB; both ride in
  HTTP-only cookies.
- Poll expiry and the `draft → active → closed → published` state machine are
  enforced in the service layer on every read/write, so the public link cannot
  accept late or out-of-state responses regardless of the client.
- Realtime: on each response the server emits a totals update to `poll:<id>`
  and a per-option analytics delta to `poll-admin:<id>`. The frontend
  `usePollLive` hook merges those deltas straight into the TanStack Query cache
  so the dashboard moves on the socket hop without an extra HTTP refetch.

## Deployment

- **Repository:** _add the public GitHub URL here_
- **Live demo:** _add the deployed project link here_

Deploy the backend as a Node service with the environment variables above and a
reachable PostgreSQL instance; build the frontend with `pnpm build` and serve
the static `dist/` from any host/CDN, pointing it at the backend origin.
