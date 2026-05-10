import { and, eq, isNull } from "drizzle-orm";
import { REFRESH_TOKEN_TTL_SEC } from "../../shared/config/env.js";
import { db } from "../../shared/db/index.js";
import { accounts, sessions, users } from "../../shared/db/schema.js";
import {
  ConflictError,
  UnauthorizedError,
} from "../../shared/errors/AppError.js";
import { hashPassword, verifyPassword } from "../../shared/auth/password.js";
import { sentinelClient } from "../../shared/auth/sentinel.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "../../shared/auth/tokens.js";
import type { AuthResult, AuthUser, TokenPair } from "./auth.types.js";

const SENTINEL_PROVIDER = "sentinel";

function toAuthUser(row: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
  };
}

async function issueTokenPair(
  user: { id: string; email: string },
  userAgent: string | null,
): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000);
  await db.insert(sessions).values({
    userId: user.id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt,
    userAgent,
  });
  return { accessToken, refreshToken };
}

export async function registerWithCredentials(input: {
  email: string;
  password: string;
  name: string;
  userAgent: string | null;
}): Promise<AuthResult> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  if (existing.length > 0) {
    throw new ConflictError("Email already registered", "EMAIL_TAKEN");
  }
  const passwordHash = await hashPassword(input.password);
  const inserted = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      passwordHash,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    });
  const user = inserted[0];
  if (!user) {
    throw new Error("Failed to create user");
  }
  const tokens = await issueTokenPair(
    { id: user.id, email: user.email },
    input.userAgent,
  );
  return { user: toAuthUser(user), tokens };
}

export async function loginWithCredentials(input: {
  email: string;
  password: string;
  userAgent: string | null;
}): Promise<AuthResult> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  const user = rows[0];
  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Invalid credentials", "INVALID_CREDENTIALS");
  }
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError("Invalid credentials", "INVALID_CREDENTIALS");
  }
  const tokens = await issueTokenPair(
    { id: user.id, email: user.email },
    input.userAgent,
  );
  return { user: toAuthUser(user), tokens };
}

export async function refreshSession(input: {
  refreshToken: string;
  userAgent: string | null;
}): Promise<AuthResult> {
  const tokenHash = hashRefreshToken(input.refreshToken);
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.refreshTokenHash, tokenHash))
    .limit(1);
  const session = rows[0];
  if (!session) {
    throw new UnauthorizedError("Invalid session", "INVALID_REFRESH");
  }

  if (session.revokedAt) {
    // Token reuse detected — revoke all sessions for this user.
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(sessions.userId, session.userId), isNull(sessions.revokedAt)),
      );
    throw new UnauthorizedError(
      "Refresh token reuse detected",
      "REFRESH_REUSE",
    );
  }
  if (session.expiresAt.getTime() < Date.now()) {
    throw new UnauthorizedError("Session expired", "SESSION_EXPIRED");
  }

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  const user = userRows[0];
  if (!user) {
    throw new UnauthorizedError("User no longer exists", "USER_NOT_FOUND");
  }

  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, session.id));

  const tokens = await issueTokenPair(
    { id: user.id, email: user.email },
    input.userAgent,
  );
  return { user: toAuthUser(user), tokens };
}

export async function logout(input: { refreshToken: string }): Promise<void> {
  const tokenHash = hashRefreshToken(input.refreshToken);
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessions.refreshTokenHash, tokenHash),
        isNull(sessions.revokedAt),
      ),
    );
}

export async function startSentinelLogin(): Promise<{
  url: URL;
  state: string;
  codeVerifier: string;
}> {
  const { url, state, codeVerifier } =
    await sentinelClient.createAuthorizationUrl();
  return { url, state, codeVerifier };
}

export async function completeSentinelLogin(input: {
  code: string;
  state: string;
  expectedState: string;
  codeVerifier: string;
  userAgent: string | null;
}): Promise<AuthResult> {
  let tokens;
  try {
    tokens = await sentinelClient.exchangeCode({
      code: input.code,
      codeVerifier: input.codeVerifier,
      state: input.state,
      expectedState: input.expectedState,
    });
  } catch (err) {
    throw new UnauthorizedError(
      err instanceof Error ? err.message : "Sentinel exchange failed",
      "SENTINEL_EXCHANGE_FAILED",
    );
  }

  const info = await sentinelClient.getUserinfo(tokens.access_token);
  const sub = info.sub;
  const email = (info.email ?? "").toLowerCase().trim();
  const emailVerified = info.email_verified === true;
  const name = info.name ?? email ?? sub;
  const avatarUrl = info.avatar ?? null;

  const existingAccount = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, SENTINEL_PROVIDER),
        eq(accounts.providerAccountId, sub),
      ),
    )
    .limit(1);

  let userId: string;

  if (existingAccount[0]) {
    userId = existingAccount[0].userId;
  } else if (email && emailVerified) {
    const byEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (byEmail[0]) {
      userId = byEmail[0].id;
      await db
        .insert(accounts)
        .values({ userId, provider: SENTINEL_PROVIDER, providerAccountId: sub });
    } else {
      const created = await db
        .insert(users)
        .values({
          email,
          name,
          avatarUrl,
          emailVerified: true,
        })
        .returning({ id: users.id });
      const row = created[0];
      if (!row) throw new Error("Failed to create user");
      userId = row.id;
      await db.insert(accounts).values({
        userId,
        provider: SENTINEL_PROVIDER,
        providerAccountId: sub,
      });
    }
  } else {
    if (!email) {
      throw new UnauthorizedError(
        "Sentinel account has no email",
        "SENTINEL_NO_EMAIL",
      );
    }
    const conflict = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (conflict[0]) {
      throw new ConflictError(
        "Email already registered; verify your Sentinel email to link",
        "EMAIL_UNVERIFIED_CONFLICT",
      );
    }
    const created = await db
      .insert(users)
      .values({
        email,
        name,
        avatarUrl,
        emailVerified: false,
      })
      .returning({ id: users.id });
    const row = created[0];
    if (!row) throw new Error("Failed to create user");
    userId = row.id;
    await db.insert(accounts).values({
      userId,
      provider: SENTINEL_PROVIDER,
      providerAccountId: sub,
    });
  }

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = userRows[0];
  if (!user) throw new Error("User vanished after upsert");

  const tokenPair = await issueTokenPair(
    { id: user.id, email: user.email },
    input.userAgent,
  );
  return { user: toAuthUser(user), tokens: tokenPair };
}
