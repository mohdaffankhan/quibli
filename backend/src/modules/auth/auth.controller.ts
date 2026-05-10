import type { NextFunction, Request, Response } from "express";
import { env } from "../../shared/config/env.js";
import {
  clearAuthCookies,
  clearOidcStateCookies,
  readOidcStateCookies,
  readRefreshCookie,
  setAuthCookies,
  setOidcStateCookies,
} from "../../shared/auth/cookies.js";
import { UnauthorizedError } from "../../shared/errors/AppError.js";
import {
  completeSentinelLogin,
  loginWithCredentials,
  logout,
  refreshSession,
  registerWithCredentials,
  startSentinelLogin,
} from "./auth.service.js";

function userAgentOf(req: Request): string | null {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" && ua.length > 0 ? ua.slice(0, 500) : null;
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await registerWithCredentials({
      ...req.body,
      userAgent: userAgentOf(req),
    });
    setAuthCookies(res, result.tokens);
    res.status(201).json({ user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await loginWithCredentials({
      ...req.body,
      userAgent: userAgentOf(req),
    });
    setAuthCookies(res, result.tokens);
    res.json({ user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = readRefreshCookie(req);
    if (!refreshToken) {
      throw new UnauthorizedError("No refresh token", "NO_REFRESH_TOKEN");
    }
    const result = await refreshSession({
      refreshToken,
      userAgent: userAgentOf(req),
    });
    setAuthCookies(res, result.tokens);
    res.json({ user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = readRefreshCookie(req);
    if (refreshToken) {
      await logout({ refreshToken });
    }
    clearAuthCookies(res);
    // Drop any half-finished OIDC handshake cookies too, so a fresh
    // "Continue with Sentinel" always starts from a clean state.
    clearOidcStateCookies(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export function me(req: Request, res: Response): void {
  res.json({ user: req.user });
}

export async function sentinelLogin(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { url, state, codeVerifier } = await startSentinelLogin();
    setOidcStateCookies(res, { state, codeVerifier });
    res.redirect(url.toString());
  } catch (err) {
    next(err);
  }
}

export async function sentinelCallback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code, state } = req.query as { code: string; state: string };
    const { state: expectedState, codeVerifier } = readOidcStateCookies(req);
    const result = await completeSentinelLogin({
      code,
      state,
      expectedState,
      codeVerifier,
      userAgent: userAgentOf(req),
    });
    clearOidcStateCookies(res);
    setAuthCookies(res, result.tokens);
    // OIDC flow lives in the browser; the user needs to land back inside the
    // SPA with cookies already set so the AuthProvider hydrates from /auth/me.
    // If the request is part of an automated/non-browser test (no Accept
    // header or explicit JSON), fall back to the JSON body the previous
    // contract returned.
    const wantsHtml = (req.headers.accept ?? "").includes("text/html");
    if (wantsHtml && env.frontendUrl) {
      res.redirect(`${env.frontendUrl}/dashboard`);
      return;
    }
    res.json({ user: result.user });
  } catch (err) {
    clearOidcStateCookies(res);
    const wantsHtml = (req.headers.accept ?? "").includes("text/html");
    if (wantsHtml && env.frontendUrl) {
      res.redirect(`${env.frontendUrl}/login?error=sentinel_failed`);
      return;
    }
    next(err);
  }
}
